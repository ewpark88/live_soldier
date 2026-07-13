import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../theme/ThemeContext';
import { motion, radius as r, space as sp, tabular, type as ty } from '../../theme/tokens';
import AnimatedNumber from '../motion/AnimatedNumber';
import PressScale from './PressScale';

/**
 * 통계 타일 — "복무 일수 128" 같은 숫자 한 덩어리.
 *
 * minHeight 를 고정한다. 안 그러면 3개를 나란히 놓았을 때 값 길이에 따라
 * 높이가 제각각이 되어 바닥선이 안 맞는다.
 *
 * @param onHero  어두운 히어로 위에 얹을 때 (색이 반전된다)
 * @param countUp 숫자를 0부터 센다 (value 가 숫자일 때만)
 */
export default function StatTile({
  label,
  value,
  unit,
  icon,
  tone = 'neutral',
  onHero = false,
  countUp = false,
  onPress,
  style,
  ...rest
}) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);

  const TONE_FG = {
    neutral: tc.text,
    primary: tc.primary,
    accent: tc.accent,
    success: tc.success,
    danger: tc.danger,
  };

  const valueColor = onHero ? tc.heroText : TONE_FG[tone] || tc.text;
  const labelColor = onHero ? tc.heroTextMuted : tc.textSecondary;
  const numeric = countUp && typeof value === 'number' && Number.isFinite(value);

  const body = (
    <>
      <View style={styles.labelRow}>
        {icon ? <Ionicons name={icon} size={13} color={labelColor} /> : null}
        <Text style={[ty.statLabel, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      <View style={styles.valueRow}>
        {numeric ? (
          <AnimatedNumber
            value={value}
            duration={motion.duration.count}
            style={[ty.statValue, { color: valueColor }]}
          />
        ) : (
          <Text style={[ty.statValue, tabular, { color: valueColor }]} numberOfLines={1}>
            {value}
          </Text>
        )}
        {unit ? (
          <Text style={[ty.caption, { color: labelColor }]} numberOfLines={1}>
            {unit}
          </Text>
        ) : null}
      </View>
    </>
  );

  const box = [
    styles.tile,
    onHero ? styles.onHero : styles.onCard,
    onHero && { borderColor: tc.heroBorder },
    style,
  ];

  if (onPress) {
    return (
      <PressScale onPress={onPress} style={box} accessibilityRole="button" {...rest}>
        {body}
      </PressScale>
    );
  }

  return <View style={box}>{body}</View>;
}

const makeStyles = (tc) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      minHeight: 68,
      justifyContent: 'center',
      gap: sp.xs,
      paddingVertical: sp.md,
      paddingHorizontal: sp.md,
      borderRadius: r.md,
    },
    onCard: { backgroundColor: tc.surfaceSunken },
    onHero: {
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: StyleSheet.hairlineWidth,
    },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: sp.xs },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: sp.xs },
  });
