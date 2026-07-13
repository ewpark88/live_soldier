import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../../theme/tokens';
import PressScale from './PressScale';

/**
 * 리스트 행 — 설정 그룹, 혜택 목록, 휴가/할일 기록, 화면 이동 링크에 두루 쓴다.
 *
 * 기록 하나당 카드 하나씩 두면 목록이 시끄러워진다. 카드 하나 안에 이 행을
 * 여러 개 넣고 헤어라인으로 나누는 쪽이 훨씬 조용하게 읽힌다.
 */
export const ROW_ICON = 36;

export default function ListRow({
  title,
  subtitle,
  icon,
  iconTone = 'primary',
  iconColor,
  iconBg,
  value,
  right,
  chevron = false,
  onPress,
  danger = false,
  disabled = false,
  style,
  titleStyle,
  ...rest
}) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);

  const TONE = {
    primary: { fg: tc.primary, bg: tc.primarySoft },
    accent: { fg: tc.accent, bg: tc.accentSoft },
    success: { fg: tc.success, bg: tc.successSoft },
    danger: { fg: tc.danger, bg: tc.dangerSoft },
    neutral: { fg: tc.textSecondary, bg: tc.surfaceSunken },
  };
  const t = danger ? TONE.danger : TONE[iconTone] || TONE.primary;

  const body = (
    <>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: iconBg || t.bg }]}>
          <Ionicons name={icon} size={18} color={iconColor || t.fg} />
        </View>
      ) : null}

      <View style={styles.textWrap}>
        <Text
          style={[styles.title, danger && { color: tc.danger }, titleStyle]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right}
      {chevron ? (
        <Ionicons name="chevron-forward" size={18} color={tc.textLight} />
      ) : null}
    </>
  );

  const box = [styles.row, disabled && styles.disabled, style];

  if (!onPress || disabled) {
    return <View style={box}>{body}</View>;
  }

  return (
    <PressScale
      onPress={onPress}
      scale={0.985}
      style={box}
      accessibilityRole="button"
      {...rest}
    >
      {body}
    </PressScale>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.md,
      minHeight: 56,
      paddingVertical: sp.md,
    },
    disabled: { opacity: 0.5 },
    iconWrap: {
      width: ROW_ICON,
      height: ROW_ICON,
      borderRadius: r.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: { flex: 1, gap: 1 },
    title: { ...ty.bodyLg, fontWeight: '700', color: tc.text },
    subtitle: { ...ty.caption, color: tc.textSecondary },
    value: { ...ty.body, fontWeight: '700', color: tc.textSecondary },
  });
