import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Alert, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeContext';
import {
  listProfiles, setActiveProfile, addProfile, updateProfile, deleteProfile,
  MAX_PROFILES,
} from '../utils/storage';
import PressScale from './ui/PressScale';
import FormSheet from './ui/FormSheet';
import TextField from './ui/TextField';
import Button from './ui/Button';
import Txt from './ui/Txt';
import {
  pickProfilePhoto, persistProfilePhoto, removeProfilePhoto, isOwnedPhoto,
} from '../utils/imagePicker';
import { updateDischargeWidget } from '../widget/updateWidget';
import { refreshScheduledNotifications } from '../utils/notifications';
import { guardSave, guardDelete, SAVE_FAILED } from '../utils/saveGuard';
import { requestShareImport, useProfilesChanged, emitProfilesChanged } from '../state/appEvents';
import { radius as r, space as sp, type as ty } from '../theme/tokens';

/* 예전 버전이 저장한 캐시 경로 사진을 세션당 한 번 문서 폴더로 옮긴다 */
let _photoMigrated = false;

/* 이름 첫 글자 (사진 없을 때 아바타 대체) */
function initial(name) {
  return (name || '?').trim().charAt(0) || '?';
}

function Avatar({ photo, name, size = 44, active }) {
  const tc = useThemeColors();
  const av = useMemo(() => makeAv(tc), [tc]);
  return (
    <View style={[
      av.wrap,
      { width: size, height: size, borderRadius: size / 2 },
      active && av.wrapActive,
    ]}>
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={[av.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[av.fallbackText, { fontSize: size * 0.42 }]} allowFontScaling={false}>{initial(name)}</Text>
        </View>
      )}
    </View>
  );
}
const makeAv = (tc) => StyleSheet.create({
  wrap: { borderWidth: 2, borderColor: 'transparent', overflow: 'hidden' },
  wrapActive: { borderColor: tc.primary },
  fallback: { backgroundColor: tc.border, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: tc.textSecondary, fontWeight: '800' },
});

/**
 * @param onDark  히어로 위에 얹을 때 — 이름/추가 버튼 색이 heroText 계열로 바뀐다.
 *                (라이트 스킴의 히어로는 밝다 — 흰색 하드코딩 금지)
 */
export default function ProfileBar({ onChange, onDark = false }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  const nameColor = onDark ? { color: tc.heroTextMuted } : null;
  const nameActiveColor = onDark ? { color: tc.heroText, fontWeight: '700' } : null;
  const [activeId, setActiveId]   = useState(null);
  const [profiles, setProfiles]   = useState([]);
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [editId, setEditId]       = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [photoInput, setPhotoInput] = useState(null);
  const [origPhoto, setOrigPhoto] = useState(null);
  // 저장 연타 차단 — 예전엔 '저장'을 두 번 누르면 같은 프로필이 두 개 생겼다
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    const { activeId: aid, profiles: list } = await listProfiles();
    setActiveId(aid);
    setProfiles(list);
    if (!_photoMigrated) {
      _photoMigrated = true;
      for (const p of list) {
        if (!p.photo || isOwnedPhoto(p.photo)) continue;
        const moved = await persistProfilePhoto(p.photo);
        if (moved && moved !== p.photo) {
          try { await updateProfile(p.id, { photo: moved }); } catch (e) { /* 다음 실행에 다시 */ }
        }
      }
    }
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  // 공유 코드 가져오기·백업 복원처럼 다른 곳에서 프로필이 바뀌었을 때
  useProfilesChanged(() => { reload(); onChange && onChange(); });

  const notify = () => {
    // 이 신호가 자기 자신을 포함한 모든 프로필 바에 reload + onChange 를 돌린다
    // (홈 히어로와 설정에 하나씩 떠 있다 — 한쪽에서 바꾸면 다른 쪽도 따라와야 한다)
    emitProfilesChanged();
    updateDischargeWidget();
    // 프로필이 바뀌면 알림 본문의 이름과 대상 데이터가 통째로 달라진다
    refreshScheduledNotifications().catch(() => {});
  };

  const handleSwitch = async (id) => {
    if (id === activeId) return;
    if ((await guardSave(() => setActiveProfile(id))) === SAVE_FAILED) return;
    notify();
  };

  const openAdd = () => {
    if (profiles.length >= MAX_PROFILES) {
      Alert.alert('알림', `프로필은 최대 ${MAX_PROFILES}명까지 등록할 수 있어요.`);
      return;
    }
    setModalMode('add');
    setEditId(null);
    setNameInput('');
    setPhotoInput(null);
    setOrigPhoto(null);
  };

  const openEdit = (p) => {
    setModalMode('edit');
    setEditId(p.id);
    setNameInput(p.name);
    setPhotoInput(p.photo);
    setOrigPhoto(p.photo);
  };

  const closeModal = () => {
    if (savingRef.current) return;
    setModalMode(null);
    setEditId(null);
    setNameInput('');
    setPhotoInput(null);
    setOrigPhoto(null);
  };

  const openShareImport = () => {
    closeModal();
    requestShareImport(null);
  };

  /* 사진 선택 + 권한 안내 */
  const handlePickPhoto = async () => {
    const res = await pickProfilePhoto();
    if (!res) return; // 취소
    if (res.uri) { setPhotoInput(res.uri); return; }
    if (res.error === 'permission') {
      Alert.alert(
        '사진 접근 권한 필요',
        '프로필 사진을 등록하려면 사진 접근 권한이 필요합니다. 설정에서 권한을 허용해 주세요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '설정 열기', onPress: () => Linking.openSettings() },
        ]
      );
    } else if (res.error === 'unavailable') {
      Alert.alert('알림', '현재 환경에서는 사진 등록 기능을 사용할 수 없습니다.');
    } else {
      Alert.alert('오류', '사진을 불러오지 못했습니다. 다시 시도해 주세요.');
    }
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    const name = nameInput.trim();
    if (!name) { Alert.alert('오류', '이름을 입력해 주세요.'); return; }
    savingRef.current = true;
    setSaving(true);
    let ok = false;
    try {
      // 캐시 경로 그대로 저장하면 캐시가 비워질 때 사진이 깨진다 — 문서 폴더로 옮긴다
      const photo = photoInput && photoInput !== origPhoto
        ? await persistProfilePhoto(photoInput)
        : photoInput;
      const copied = photo && photo !== photoInput;
      if (modalMode === 'add') {
        const id = await guardSave(() => addProfile(name, photo));
        if (id === SAVE_FAILED || !id) {
          if (copied) removeProfilePhoto(photo);
          if (id === null) Alert.alert('알림', `프로필은 최대 ${MAX_PROFILES}명까지 등록할 수 있어요.`);
          return;
        }
      } else {
        const res = await guardSave(() => updateProfile(editId, { name, photo: photo ?? null }));
        if (res === SAVE_FAILED) { if (copied) removeProfilePhoto(photo); return; }
        if (origPhoto && origPhoto !== photo) removeProfilePhoto(origPhoto);
      }
      ok = true;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    if (!ok) return;
    closeModal();
    notify();
  };

  const handleDelete = () => {
    if (profiles.length <= 1) {
      Alert.alert('알림', '마지막 프로필은 삭제할 수 없어요.');
      return;
    }
    Alert.alert('프로필 삭제', `'${nameInput}' 프로필과 모든 데이터를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          if ((await guardDelete(() => deleteProfile(editId))) === SAVE_FAILED) return;
          removeProfilePhoto(origPhoto);
          closeModal();
          notify();
        },
      },
    ]);
  };

  return (
    <View style={s.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {profiles.map((p) => {
          const active = p.id === activeId;
          return (
            <PressScale haptic="select"
              key={p.id}
              style={s.item}
              onPress={() => handleSwitch(p.id)}
              onLongPress={() => openEdit(p)}
              delayLongPress={300}
              accessibilityRole="button"
              accessibilityLabel={`${p.name} 프로필${active ? ', 선택됨' : ''}`}
              accessibilityHint="길게 누르면 이름과 사진을 수정합니다"
              accessibilityState={{ selected: active }}
            >
              <Avatar photo={p.photo} name={p.name} active={active} />
              <Text
                style={[s.name, nameColor, active && s.nameActive, active && nameActiveColor]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
              >
                {p.name}
              </Text>
            </PressScale>
          );
        })}

        {profiles.length < MAX_PROFILES && (
          <PressScale
            haptic="light"
            style={s.item}
            onPress={openAdd}
            accessibilityRole="button"
            accessibilityLabel="프로필 추가"
          >
            <View style={[s.addCircle, onDark && { borderColor: tc.heroBorder }]}>
              <Ionicons
                name="add"
                size={20}
                color={onDark ? tc.heroTextMuted : tc.textSecondary}
              />
            </View>
            <Text style={[s.name, nameColor]} maxFontSizeMultiplier={1.2}>추가</Text>
          </PressScale>
        )}
      </ScrollView>

      {/* 추가 / 수정 시트 — 예전엔 손으로 만든 Modal + 버튼이라 다른 폼과 생김새가 달랐다 */}
      <FormSheet
        visible={modalMode !== null}
        onClose={closeModal}
        title={modalMode === 'add' ? '프로필 추가' : '프로필 수정'}
        onSubmit={handleSave}
        saving={saving}
      >
        {modalMode === 'add' ? (
          <PressScale
            onPress={openShareImport}
            haptic="light"
            tint
            tintRadius={r.md}
            style={s.importRow}
            accessibilityRole="button"
            accessibilityLabel="공유 코드로 추가"
          >
            <View style={s.importIcon}>
              <Ionicons name="people" size={20} color={tc.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt role="bodyLg" style={{ fontWeight: '700' }}>공유 코드로 추가</Txt>
              <Txt role="caption" tone="secondary">장병에게 받은 코드로 전역일을 바로 불러와요</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={tc.textLight} />
          </PressScale>
        ) : null}

        <View style={s.photoCol}>
          <PressScale
            haptic="light"
            style={s.photoPick}
            onPress={handlePickPhoto}
            accessibilityRole="button"
            accessibilityLabel={photoInput ? '사진 변경' : '사진 선택'}
          >
            <Avatar photo={photoInput} name={nameInput || '?'} size={84} />
            <Text style={s.photoPickText}>
              {photoInput ? '사진 변경' : '사진 선택 (선택사항)'}
            </Text>
          </PressScale>
          {photoInput ? (
            <Button
              title="사진 제거"
              size="sm"
              variant="ghost"
              onPress={() => setPhotoInput(null)}
              textStyle={{ color: tc.danger }}
            />
          ) : null}
        </View>

        <TextField
          label="이름 / 별명"
          value={nameInput}
          onChangeText={setNameInput}
          placeholder="예) 본인, 남자친구, 아들"
          maxLength={12}
        />

        {modalMode === 'edit' ? (
          <Button
            title="이 프로필 삭제"
            icon="trash-outline"
            variant="ghost"
            onPress={handleDelete}
            textStyle={{ color: tc.danger }}
          />
        ) : null}
      </FormSheet>
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  bar: { paddingTop: sp.xs },
  scroll: { paddingHorizontal: sp.lg, gap: sp.md, alignItems: 'center' },
  item: { alignItems: 'center', width: 56 },
  name: { ...ty.micro, color: tc.textSecondary, marginTop: sp.xs, maxWidth: 56 },
  nameActive: { color: tc.primary, fontWeight: '700' },
  addCircle: {
    width: 44, height: 44, borderRadius: r.pill,
    borderWidth: 2, borderColor: tc.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  importRow: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    padding: sp.md, borderRadius: r.md, backgroundColor: tc.primarySoft,
  },
  importIcon: {
    width: 40, height: 40, borderRadius: r.sm,
    alignItems: 'center', justifyContent: 'center', backgroundColor: tc.card,
  },
  photoCol: { alignItems: 'center', gap: sp.xs },
  photoPick: { alignItems: 'center' },
  photoPickText: { ...ty.label, fontWeight: '600', color: tc.primary, marginTop: sp.sm },
});
