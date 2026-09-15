import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp, tabular, type as ty } from '../theme/tokens';
import PressScale from './ui/PressScale';

/**
 * 히어로 상단의 스트릭 알약.
 *
 * 세로 공간을 추가로 먹지 않는 게 요점이다 — 프로필 줄 오른쪽,
 * 예전에 햄버거가 있던 자리에 그대로 들어간다.
 *
 * 애니메이션은 넣지 않는다. 히어로 안엔 이미 게이지 루프가 돌고 있고,
 * 무한 루프 예산(디자인 시스템 §4)은 히어로 전체에서 관리된다.
 */
export default function StreakBadge({ count = 0, tier, onHero = false, onPress }) {
  const tc = useThemeColors();
  if (!count) return null;

  const fg = onHero ? tc.heroText : tc.accentText;
  const bg = onHero ? tc.heroSheen : tc.accentSoft;
  const border = onHero ? tc.heroBorder : 'transparent';

  return (
    <PressScale
      onPress={onPress}
      haptic="light"
      scale={0.94}
      accessibilityLabel={`연속 출석 ${count}일`}
      style={[s.wrap, { backgroundColor: bg, borderColor: border }]}
    >
      <Ionicons name={tier?.icon ?? 'flame'} size={13} color={onHero ? tc.heroText : tc.accent} />
      <Text style={[s.text, tabular, { color: fg }]}>{count}일</Text>
    </PressScale>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: sp.sm,
    borderRadius: r.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { ...ty.micro, fontWeight: '800' },
});
