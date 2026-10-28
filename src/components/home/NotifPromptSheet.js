import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet, Txt, Button } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp } from '../../theme/tokens';

/**
 * 입대일 입력 뒤 홈에서 한 번 뜨는 알림 안내.
 *
 * 알림은 기본 꺼짐이고 권한 요청도 설정 → 알림 스위치에만 있어서, 그 메뉴를
 * 찾아 들어가지 않으면 전역 D-day 알림을 한 번도 못 받았다. 앱을 열자마자 OS
 * 팝업을 띄우는 대신 **무엇을 받는지 먼저 보여주고** '알림 받기'를 눌렀을 때만
 * 권한을 묻는다 (이유를 알고 묻는 쪽이 허용률이 높다).
 *
 * 노출 조건은 `shouldOfferNotifPrompt()` 가, 전면광고와 겹치지 않게 하는 건
 * 홈(HomeScreen)이 맡는다.
 */
export default function NotifPromptSheet({ visible, onAccept, onDecline, soldier, busy = false }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const items = [
    { icon: 'flag-outline', text: '전역 D-100 · 30 · 7 · 1 · 당일' },
    soldier ? { icon: 'chevron-up-circle-outline', text: '일병 · 상병 · 병장 진급일' } : null,
    { icon: 'airplane-outline', text: '휴가 전날 · 날짜를 정한 일정' },
    soldier ? { icon: 'wallet-outline', text: '월급날 (매월 10일)' } : null,
  ].filter(Boolean);

  return (
    <BottomSheet visible={visible} onClose={onDecline}>
      <View style={s.head}>
        <View style={s.badge}>
          <Ionicons name="notifications" size={22} color={tc.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt role="subtitle">중요한 날을 알려드릴까요?</Txt>
          <Txt role="caption" tone="secondary">앱을 열지 않아도 그날 아침에 알려드려요</Txt>
        </View>
      </View>

      <View style={s.list}>
        {items.map((it) => (
          <View key={it.icon} style={s.row}>
            <Ionicons name={it.icon} size={18} color={tc.textSecondary} />
            <Txt role="bodySm">{it.text}</Txt>
          </View>
        ))}
      </View>

      <Txt role="caption" tone="secondary" style={s.note}>
        종류별로 끄고 켜는 건 설정 → 알림에서 언제든 바꿀 수 있어요.
      </Txt>

      <View style={s.actions}>
        <Button title="알림 받기" icon="notifications-outline" onPress={onAccept} loading={busy} full />
        <Button title="나중에" variant="ghost" onPress={onDecline} disabled={busy} full />
      </View>
    </BottomSheet>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    badge: {
      width: 44, height: 44, borderRadius: r.md,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: tc.primarySoft,
    },
    list: { gap: sp.md, marginTop: sp.xl },
    row: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    note: { marginTop: sp.lg },
    actions: { gap: sp.sm, marginTop: sp.xl },
  });
