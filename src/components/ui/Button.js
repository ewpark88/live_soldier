import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../theme/ThemeContext';
import { elev, radius as r, space as sp, type as ty } from '../../theme/tokens';
import PressScale from './PressScale';

/**
 * 표준 버튼. 지금까지 화면마다 다시 만들던 것을 하나로 모은다.
 *
 * @param variant  'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
 * @param size     'sm' | 'md' | 'lg'
 */
const SIZES = {
  sm: { height: 36, padH: sp.md, text: ty.buttonSm, icon: 15, rad: r.sm },
  md: { height: 48, padH: sp.xl, text: ty.button, icon: 18, rad: r.md },
  lg: { height: 56, padH: sp.xxl, text: ty.button, icon: 20, rad: r.lg },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  full = false,
  round = false,
  disabled = false,
  loading = false,
  haptic = 'light',
  style,
  textStyle,
  ...rest
}) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const s = SIZES[size] || SIZES.md;

  // 다크 테마에서 primary 는 밝은 민트다. 흰 글자를 얹으면 안 읽힌다 → onPrimary.
  const FG = {
    primary: tc.onPrimary,
    accent: tc.onGold,
    secondary: tc.primary,
    ghost: tc.primary,
    danger: tc.white,
  };
  const fg = FG[variant] || tc.onPrimary;

  const shape = {
    height: s.height,
    paddingHorizontal: s.padH,
    borderRadius: round ? r.pill : s.rad,
  };

  const inner = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={s.icon} color={fg} /> : null}
          <Text style={[s.text, { color: fg }, textStyle]} numberOfLines={1}>
            {title}
          </Text>
          {iconRight ? <Ionicons name={iconRight} size={s.icon} color={fg} /> : null}
        </>
      )}
    </>
  );

  // accent 만 그라데이션(메탈릭 골드). 나머지는 단색.
  if (variant === 'accent') {
    return (
      <PressScale
        onPress={onPress}
        disabled={disabled || loading}
        haptic={haptic}
        style={[full && styles.full, disabled && styles.disabled, style]}
        accessibilityRole="button"
        {...rest}
      >
        <LinearGradient
          colors={[tc.goldFrom, tc.goldTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.row, shape, styles.shadow]}
        >
          {inner}
        </LinearGradient>
      </PressScale>
    );
  }

  return (
    <PressScale
      onPress={onPress}
      disabled={disabled || loading}
      haptic={haptic}
      style={[
        styles.row,
        shape,
        styles[variant],
        variant !== 'ghost' && variant !== 'secondary' && styles.shadow,
        full && styles.full,
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      {...rest}
    >
      {inner}
    </PressScale>
  );
}

const makeStyles = (tc) => {
  const e = elev(tc);
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: sp.sm,
    },
    full: { alignSelf: 'stretch', width: '100%' },
    shadow: { ...e.sm },
    disabled: { opacity: 0.45 },
    primary: { backgroundColor: tc.primary },
    secondary: { backgroundColor: tc.primarySoft },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tc.border,
    },
    danger: { backgroundColor: tc.danger },
  });
};
