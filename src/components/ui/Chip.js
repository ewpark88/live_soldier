import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../../theme/tokens';
import PressScale from './PressScale';

/**
 * 알약 칩. 선택형(군별/구분/필터)과 표시형(배지) 둘 다 쓴다.
 *
 * 선택 상태는 "채운다" — 예전의 15% 알파 틴트는 싸구려로 읽힌다.
 */
const SIZES = {
  sm: { height: 28, padH: sp.sm, text: ty.micro, icon: 13 },
  md: { height: 36, padH: sp.md, text: ty.label, icon: 15 },
};

export default function Chip({
  label,
  icon,
  selected = false,
  onPress,
  size = 'md',
  tone = 'neutral', // 'neutral' | 'primary' | 'accent' | 'danger' | 'success'
  style,
  textStyle,
  ...rest
}) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const s = SIZES[size] || SIZES.md;

  const TONE_BG = {
    neutral: tc.surfaceSunken,
    primary: tc.primarySoft,
    accent: tc.accentSoft,
    danger: tc.dangerSoft,
    success: tc.successSoft,
  };
  const TONE_FG = {
    neutral: tc.textSecondary,
    primary: tc.primary,
    accent: tc.accentText,
    danger: tc.danger,
    success: tc.success,
  };

  const bg = selected ? tc.primary : TONE_BG[tone];
  const fg = selected ? tc.onPrimary : TONE_FG[tone];

  const body = (
    <>
      {icon ? <Ionicons name={icon} size={s.icon} color={fg} /> : null}
      <Text style={[s.text, { color: fg }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  const shape = [
    styles.chip,
    { height: s.height, paddingHorizontal: s.padH, backgroundColor: bg },
    style,
  ];

  if (!onPress) {
    return <View style={shape}>{body}</View>;
  }

  return (
    <PressScale
      onPress={onPress}
      haptic="select"
      style={shape}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      {...rest}
    >
      {body}
    </PressScale>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: sp.xs + 2,
      borderRadius: r.pill,
    },
  });
