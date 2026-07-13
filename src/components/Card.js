import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { elev, radius as r, space as sp } from '../theme/tokens';
import PressScale from './ui/PressScale';

/**
 * 기본 카드 표면.
 *
 * marginBottom 은 더 이상 없다 — 세로 간격은 <Section> 이 전담한다.
 * (예전엔 Card 가 12px 을 갖고 화면이 또 마진을 얹어 간격이 겹쳐 쌓였다.)
 *
 * @param variant  'default' | 'flat' | 'elevated' | 'outline'
 * @param pad      'none' | 'sm' | 'md' | 'lg'
 * @param onPress  주면 눌리는 카드가 된다
 */
const PADS = { none: 0, sm: sp.sm, md: sp.md, lg: sp.lg };

export default function Card({
  children,
  variant = 'default',
  pad = 'lg',
  radiusKey = 'lg',
  onPress,
  style,
  ...rest
}) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);

  const boxStyle = [
    styles.base,
    styles[variant],
    { padding: PADS[pad] ?? sp.lg, borderRadius: r[radiusKey] ?? r.lg },
    style,
  ];

  if (onPress) {
    return (
      <PressScale onPress={onPress} style={boxStyle} {...rest}>
        {children}
      </PressScale>
    );
  }

  return (
    <View style={boxStyle} {...rest}>
      {children}
    </View>
  );
}

const makeStyles = (tc) => {
  const e = elev(tc);
  return StyleSheet.create({
    base: {
      backgroundColor: tc.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tc.border,
    },
    default: { ...e.md },
    elevated: { backgroundColor: tc.cardElevated, ...e.lg },
    outline: { borderColor: tc.border, ...e.none },
    flat: { backgroundColor: tc.surfaceSunken, borderColor: 'transparent', ...e.none },
  });
};
