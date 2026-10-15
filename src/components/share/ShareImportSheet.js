import React, { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormSheet, TextField, Txt, Button, Card } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp } from '../../theme/tokens';
import { useShareImportRequest, emitProfilesChanged } from '../../state/appEvents';
import { decodeShareCode, findShareCode, shareErrorMessage } from '../../utils/shareCode';
import {
  addSharedProfile, updateProfileFromShare, findProfileByShare, listProfiles, MAX_PROFILES,
} from '../../utils/storage';
import { calcDischargeDate, calcDaysLeft, formatDate, formatDateKo } from '../../utils/dateUtils';
import { BRANCHES, isOfficer, personnelLabel } from '../../constants/serviceTerms';
import { guardSave, SAVE_FAILED } from '../../utils/saveGuard';
import { haptic } from '../../utils/haptics';
import { updateDischargeWidget } from '../../widget/updateWidget';
import { refreshScheduledNotifications } from '../../utils/notifications';
import { navigateHome } from '../../navigation/navigationRef';

let Clipboard = null;
try { Clipboard = require('expo-clipboard'); } catch (e) { /* 미설치 빌드 — 붙여넣기 버튼만 숨김 */ }

/**
 * '공유 코드로 추가' 시트 — 곰신·부모님 쪽 화면.
 *
 * 루트에 하나만 떠 있다. 여는 경로는 셋이고 모두 requestShareImport() 로 모인다:
 *   · 프로필 바 '추가' → '공유 코드로 추가'
 *   · QR 을 폰 카메라로 찍음 → jeonryeokkami://add?c=… 딥링크
 *   · 카톡 메시지를 길게 눌러 복사한 뒤 앱을 열고 붙여넣기
 *
 * 서버가 없으므로 '연결'이 아니라 '복사'다. 장병이 진급일을 고치면 코드를 다시
 * 보내야 한다 — 같은 사람의 코드면 새 프로필 대신 갱신을 제안한다.
 */
export default function ShareImportSheet() {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [visible, setVisible] = useState(false);
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [match, setMatch] = useState(null);   // 같은 사람의 기존 프로필 id
  const [saving, setSaving] = useState(false);

  const decoded = useMemo(() => {
    if (!text.trim()) return null;
    return decodeShareCode(text);
  }, [text]);
  const value = decoded?.ok ? decoded.value : null;

  const preview = useMemo(() => {
    if (!value) return null;
    const mi = value.militaryInfo;
    const d = calcDischargeDate(mi.enlistDate, mi.months);
    const disc = d ? formatDate(d) : null;
    const left = disc ? calcDaysLeft(disc) : null;
    const branch = BRANCHES.find((b) => b.key === mi.branch);
    return {
      branch: branch?.label ?? '',
      icon: branch?.icon ?? 'shield-half',
      who: isOfficer(mi.personnelType) ? (mi.officerRank || personnelLabel(mi.personnelType)) : '병사',
      disc,
      left,
    };
  }, [value]);

  // 입력할 때마다 비동기 조회가 돈다 — 늦게 도착한 옛 결과가 최신 입력을 덮지 않게
  const reqId = useRef(0);
  const apply = async (raw) => {
    const id = ++reqId.current;
    setText(raw);
    setError(null);
    const r = decodeShareCode(raw);
    if (r.ok) {
      setName(r.value.name || '');
      const hit = await findProfileByShare(r.value.militaryInfo).catch(() => null);
      if (id === reqId.current) setMatch(hit);
    } else {
      setMatch(null);
    }
  };

  useShareImportRequest(async (code) => {
    setVisible(true);
    setSaving(false);
    setError(null);
    setMatch(null);
    setName('');
    if (code) { apply(code); return; }
    setText('');
    // 방금 카톡에서 복사해 왔을 가능성이 높다 — 클립보드에 코드가 있으면 바로 채운다
    try {
      const clip = Clipboard ? await Clipboard.getStringAsync() : '';
      const found = findShareCode(clip);
      if (found) apply(clip);
    } catch (e) { /* 클립보드 접근 실패는 무시 — 직접 붙여넣으면 된다 */ }
  });

  const close = () => { if (!saving) setVisible(false); };

  const paste = async () => {
    try {
      const clip = Clipboard ? await Clipboard.getStringAsync() : '';
      if (!clip) { haptic.warning(); setError('클립보드가 비어 있어요.'); return; }
      apply(clip);
    } catch (e) {
      setError('클립보드를 읽지 못했어요. 입력칸에 직접 붙여넣어 주세요.');
    }
  };

  const done = (title) => {
    haptic.success();
    setVisible(false);
    emitProfilesChanged();
    updateDischargeWidget();
    refreshScheduledNotifications().catch(() => {});
    navigateHome();
    Alert.alert(title, '홈 화면 위쪽에서 프로필을 눌러 언제든 전환할 수 있어요.');
  };

  const submit = async (asNew = false) => {
    if (saving) return;
    if (!value) {
      haptic.warning();
      setError(shareErrorMessage(decoded?.reason));
      return;
    }
    const payload = { ...value, name: name.trim() || value.name || '장병' };
    setSaving(true);
    try {
      if (match && !asNew) {
        const res = await guardSave(() => updateProfileFromShare(match, payload));
        if (res === SAVE_FAILED) return;
        done('프로필을 갱신했어요');
        return;
      }
      const { profiles } = await listProfiles();
      // 막 설치한 곰신·부모님 — 입대정보 없는 빈 '본인' 프로필 하나뿐이다. 거기에 새
      // 프로필을 더하면 쓸 일 없는 빈 프로필이 영영 남고, 앱을 열 때마다 온보딩이
      // 그쪽을 가리킨다. 빈 프로필이 하나뿐이면 그 자리를 채운다.
      if (!asNew && profiles.length === 1 && !profiles[0].militaryInfo) {
        const res = await guardSave(() => updateProfileFromShare(profiles[0].id, payload));
        if (res === SAVE_FAILED) return;
        done(`${payload.name} 님을 추가했어요`);
        return;
      }
      if (profiles.length >= MAX_PROFILES) {
        Alert.alert('알림', `프로필은 최대 ${MAX_PROFILES}명까지 등록할 수 있어요.`);
        return;
      }
      const id = await guardSave(() => addSharedProfile(payload));
      if (id === SAVE_FAILED) return;
      if (!id) { Alert.alert('알림', `프로필은 최대 ${MAX_PROFILES}명까지 등록할 수 있어요.`); return; }
      done(`${payload.name} 님을 추가했어요`);
    } finally {
      setSaving(false);
    }
  };

  const showErr = error || (decoded && !decoded.ok ? shareErrorMessage(decoded.reason) : null);

  return (
    <FormSheet
      visible={visible}
      onClose={close}
      title="공유 코드로 추가"
      submitLabel={match ? '기존 프로필 갱신' : '프로필 추가'}
      onSubmit={() => submit(false)}
      saving={saving}
      submitDisabled={!value}
    >
      <Txt role="bodySm" tone="secondary">
        장병에게 받은 메시지를 통째로 붙여넣어도 돼요. 'JY1-' 로 시작하는 코드를 찾아 읽어요.
      </Txt>

      <View style={s.pasteRow}>
        <TextField
          value={text}
          onChangeText={apply}
          placeholder="JY1-…"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          error={showErr || undefined}
          style={{ flex: 1 }}
          accessibilityLabel="공유 코드"
        />
      </View>
      {Clipboard ? (
        <Button title="클립보드에서 붙여넣기" icon="clipboard-outline" variant="secondary" onPress={paste} />
      ) : null}

      {preview ? (
        <>
          <Card variant="flat" pad="md" style={s.preview}>
            <View style={s.previewIcon}>
              <Ionicons name={preview.icon} size={22} color={tc.primary} />
            </View>
            <View style={{ flex: 1, gap: sp.xxs }}>
              <Txt role="bodyLg" style={{ fontWeight: '800' }}>
                {preview.branch} · {preview.who}
              </Txt>
              <Txt role="caption" tone="secondary">
                입대 {formatDateKo(value.militaryInfo.enlistDate)} · {value.militaryInfo.months}개월
              </Txt>
              {preview.disc ? (
                <Txt role="label" tone="primary">
                  {formatDateKo(preview.disc)} 전역 · {preview.left > 0 ? `D-${preview.left}` : preview.left === 0 ? 'D-Day' : '전역 완료'}
                </Txt>
              ) : null}
            </View>
          </Card>

          <TextField
            label="이 기기에서 부를 이름"
            value={name}
            onChangeText={setName}
            placeholder="예) 남자친구, 아들"
            maxLength={12}
          />

          {match ? (
            <View style={s.matchNote}>
              <Ionicons name="sync-outline" size={16} color={tc.textSecondary} />
              <Txt role="caption" tone="secondary" style={{ flex: 1 }}>
                같은 입대 정보의 프로필이 이미 있어요. 갱신하면 그 프로필의 휴가·일정 기록은 그대로 두고
                입대 정보와 진급일만 바꿔요.
              </Txt>
            </View>
          ) : null}
          {match ? (
            <Button title="새 프로필로 따로 추가" variant="ghost" onPress={() => submit(true)} disabled={saving} />
          ) : null}
        </>
      ) : null}
    </FormSheet>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    pasteRow: { flexDirection: 'row' },
    preview: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    previewIcon: {
      width: 44, height: 44, borderRadius: r.md,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: tc.primarySoft,
    },
    matchNote: { flexDirection: 'row', gap: sp.sm, alignItems: 'flex-start' },
  });
