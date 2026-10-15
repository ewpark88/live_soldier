import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet, StatTile, Txt, Button } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp } from '../../theme/tokens';

/**
 * 출석 스트릭 시트 — 히어로의 스트릭 배지를 누르면 열린다.
 *
 * 예전엔 같은 숫자가 히어로 배지와 홈 아래쪽 '출석 스트릭' 카드에 두 번 있었고,
 * 배지는 눌러도 아무 일도 없었다(onPress 가 빈 함수). 카드를 걷어내 홈을 줄이고,
 * 자세한 내용은 배지 → 시트로 옮긴다.
 */
export default function StreakSheet({ visible, onClose, streak, days = [], tier, usedFreeze, onShare }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={s.head}>
        <View style={s.badge}>
          <Ionicons name={tier?.icon ?? 'flame'} size={22} color={tc.accentText} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt role="subtitle">출석 스트릭{tier?.label ? ` · ${tier.label}` : ''}</Txt>
          <Txt role="caption" tone="secondary">앱을 연 날이 하루씩 쌓여요</Txt>
        </View>
      </View>

      <View style={s.strip} accessibilityLabel={`최근 7일 중 ${days.filter((d) => d.present).length}일 출석`}>
        {days.map((d) => (
          <View
            key={d.date}
            style={[
              s.dot,
              { backgroundColor: d.present ? tc.accent : tc.surfaceSunken },
              d.isToday && { borderWidth: 2, borderColor: tc.accentText },
              d.isToday && !d.present && { backgroundColor: 'transparent' },
            ]}
          />
        ))}
      </View>

      <View style={s.stats}>
        <StatTile label="현재" value={streak?.current ?? 0} unit="일" tone="accent" countUp />
        <StatTile label="최고" value={streak?.best ?? 0} unit="일" countUp />
        <StatTile label="누적" value={streak?.total ?? 0} unit="일" countUp />
      </View>

      {usedFreeze ? (
        <Txt role="caption" tone="secondary" style={s.note}>
          하루를 놓쳤지만 스트릭 보호를 써서 이어졌어요. (2주에 1회)
        </Txt>
      ) : null}

      <View style={s.actions}>
        {streak?.current ? (
          <Button title="스트릭 자랑하기" icon="share-social-outline" onPress={onShare} full />
        ) : null}
        <Button title="닫기" variant="ghost" onPress={onClose} full />
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
      backgroundColor: tc.accentSoft,
    },
    strip: { flexDirection: 'row', gap: sp.sm, marginTop: sp.xl },
    dot: { flex: 1, height: 10, borderRadius: r.xs },
    stats: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
    note: { marginTop: sp.sm },
    actions: { gap: sp.sm, marginTop: sp.xl },
  });
