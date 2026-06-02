import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, TextInput, Alert, Linking, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '../theme/ThemeContext';
import {
  listProfiles, setActiveProfile, addProfile, updateProfile, deleteProfile,
  MAX_PROFILES,
} from '../utils/storage';
import { pickProfilePhoto } from '../utils/imagePicker';
import { updateDischargeWidget } from '../widget/updateWidget';

const BRANCH_LABEL = { army: '육군', navy: '해군', airforce: '공군', marines: '해병대' };

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
          <Text style={[av.fallbackText, { fontSize: size * 0.42 }]}>{initial(name)}</Text>
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

export default function ProfileBar({ onChange }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  const [activeId, setActiveId]   = useState(null);
  const [profiles, setProfiles]   = useState([]);
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [editId, setEditId]       = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [photoInput, setPhotoInput] = useState(null);

  const reload = useCallback(async () => {
    const { activeId: aid, profiles: list } = await listProfiles();
    setActiveId(aid);
    setProfiles(list);
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const notify = () => { reload(); onChange && onChange(); updateDischargeWidget(); };

  const handleSwitch = async (id) => {
    if (id === activeId) return;
    await setActiveProfile(id);
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
  };

  const openEdit = (p) => {
    setModalMode('edit');
    setEditId(p.id);
    setNameInput(p.name);
    setPhotoInput(p.photo);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditId(null);
    setNameInput('');
    setPhotoInput(null);
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
    const name = nameInput.trim();
    if (!name) { Alert.alert('오류', '이름을 입력해 주세요.'); return; }
    if (modalMode === 'add') {
      const id = await addProfile(name, photoInput);
      if (!id) { Alert.alert('알림', `프로필은 최대 ${MAX_PROFILES}명까지 등록할 수 있어요.`); return; }
    } else {
      await updateProfile(editId, { name, photo: photoInput ?? null });
    }
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
        onPress: async () => { await deleteProfile(editId); closeModal(); notify(); },
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
            <TouchableOpacity
              key={p.id}
              style={s.item}
              onPress={() => handleSwitch(p.id)}
              onLongPress={() => openEdit(p)}
              delayLongPress={300}
              activeOpacity={0.8}
            >
              <Avatar photo={p.photo} name={p.name} active={active} />
              <Text style={[s.name, active && s.nameActive]} numberOfLines={1}>
                {p.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {profiles.length < MAX_PROFILES && (
          <TouchableOpacity style={s.item} onPress={openAdd} activeOpacity={0.8}>
            <View style={s.addCircle}>
              <Text style={s.addPlus}>＋</Text>
            </View>
            <Text style={s.name}>추가</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* 추가 / 수정 모달 */}
      <Modal visible={modalMode !== null} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{modalMode === 'add' ? '프로필 추가' : '프로필 수정'}</Text>

            <TouchableOpacity style={s.photoPick} onPress={handlePickPhoto} activeOpacity={0.8}>
              <Avatar photo={photoInput} name={nameInput || '?'} size={84} />
              <Text style={s.photoPickText}>
                {photoInput ? '사진 변경' : '사진 선택 (선택사항)'}
              </Text>
            </TouchableOpacity>
            {photoInput ? (
              <TouchableOpacity onPress={() => setPhotoInput(null)}>
                <Text style={s.photoRemove}>사진 제거</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={s.label}>이름 / 별명</Text>
            <TextInput
              style={s.input}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="예) 본인, 남자친구, 아들"
              placeholderTextColor={tc.textLight}
              maxLength={12}
            />

            <View style={s.btnRow}>
              {modalMode === 'edit' && (
                <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
                  <Text style={s.deleteBtnText}>삭제</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.cancelBtn} onPress={closeModal}>
                <Text style={s.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  bar: { paddingTop: 4 },
  scroll: { paddingHorizontal: 16, gap: 14, alignItems: 'center' },
  item: { alignItems: 'center', width: 56 },
  name: { fontSize: 11, color: tc.textSecondary, marginTop: 4, maxWidth: 56 },
  nameActive: { color: tc.primary, fontWeight: '700' },
  addCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: tc.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  addPlus: { fontSize: 22, color: tc.textSecondary, fontWeight: '700', marginTop: -2 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  modalBox: { width: '100%', backgroundColor: tc.card, borderRadius: 20, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 19, fontWeight: '800', color: tc.text, marginBottom: 18 },
  photoPick: { alignItems: 'center' },
  photoPickText: { fontSize: 13, color: tc.primaryLight, fontWeight: '600', marginTop: 8 },
  photoRemove: { fontSize: 12, color: tc.danger, marginTop: 6 },
  label: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '600', color: tc.textSecondary, marginTop: 18, marginBottom: 8 },
  input: {
    width: '100%', backgroundColor: tc.background, borderWidth: 1.5, borderColor: tc.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: tc.text,
  },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 22, width: '100%' },
  deleteBtn: { paddingVertical: 13, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: tc.danger, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: tc.danger, fontWeight: '700', fontSize: 14 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: tc.border, alignItems: 'center' },
  cancelBtnText: { color: tc.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1.4, paddingVertical: 14, borderRadius: 10, backgroundColor: tc.primary, alignItems: 'center' },
  saveBtnText: { color: tc.white, fontWeight: '700', fontSize: 16 },
});
