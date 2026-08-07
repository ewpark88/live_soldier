import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Grid, PressScale, Txt } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp } from '../../theme/tokens';

/**
 * 바로가기 2×2.
 *
 * 햄버거 메뉴를 없애면서 잃을 뻔한 발견성을 여기서 되찾는다. 예전엔 적금·혜택
 * 계산기가 우상단 드로어 안에만 있어서 사실상 아무도 못 찾았다.
 *
 * 반드시 <Grid> 를 쓴다 — width:'47.5%' + gap 조합은 100%로 안 떨어져서
 * 오른쪽에 자투리가 남는다.
 */
export default function QuickActions({ items = [] }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  if (!items.length) return null;

  const TONE = {
    primary: { fg: tc.primary, bg: tc.primarySoft },
    accent: { fg: tc.accentText, bg: tc.accentSoft },
    success: { fg: tc.success, bg: tc.successSoft },
    neutral: { fg: tc.textSecondary, bg: tc.surfaceSunken },
  };

  return (
    <Grid columns={2} gap={sp.sm}>
      {items.map((it) => {
        const tone = TONE[it.tone] ?? TONE.neutral;
        return (
          <PressScale
            key={it.key}
            onPress={it.onPress}
            haptic="light"
            style={[s.tile, { backgroundColor: tc.card, borderColor: tc.border }]}
            accessibilityLabel={it.label}
          >
            <View style={[s.icon, { backgroundColor: tone.bg }]}>
              <Ionicons name={it.icon} size={19} color={tone.fg} />
            </View>
            <Txt role="label" numberOfLines={1} style={{ flex: 1 }}>{it.label}</Txt>
            <Ionicons name="chevron-forward" size={16} color={tc.textLight} />
          </PressScale>
        );
      })}
    </Grid>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    tile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.sm,
      minHeight: 56,
      paddingHorizontal: sp.md,
      borderRadius: r.md,
      borderWidth: StyleSheet.hairlineWidth,
    },
    icon: {
      width: 32, height: 32, borderRadius: r.xs,
      alignItems: 'center', justifyContent: 'center',
    },
  });
