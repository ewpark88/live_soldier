import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation, interpolate, useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../theme/ThemeContext';
import { space as sp, tabular, type as ty } from '../../theme/tokens';

/**
 * 히어로가 스크롤로 올라간 뒤 나타나는 얇은 상단 바.
 *
 * D-Day 를 놓치지 않게 해주는 게 전부다. transform/opacity 만 쓰므로 UI
 * 스레드에서만 돌고, 무한 루프는 없다.
 *
 * pointerEvents 는 항상 'none' 이다 — 터치 대상을 두지 않아서 스크롤을
 * 가로채는 사고가 구조적으로 불가능하다.
 */
export default function HomeTopBar({ scrollY, daysLeft, name }) {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const style = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 0 };
    return {
      opacity: interpolate(scrollY.value, [160, 240], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(scrollY.value, [160, 240], [-8, 0], Extrapolation.CLAMP) },
      ],
    };
  });

  const label = daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-Day!' : '전역 완료';

  return (
    <Animated.View
      pointerEvents="none"
      style={[s.bar, { paddingTop: insets.top }, style]}
    >
      <View style={s.row}>
        <Animated.Text style={s.title} numberOfLines={1}>
          {name ? `${name} 님` : '전역까지'}
        </Animated.Text>
        <Animated.Text style={s.dday}>{label}</Animated.Text>
      </View>
    </Animated.View>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    bar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: tc.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tc.border,
    },
    row: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: sp.lg,
    },
    title: { ...ty.section, color: tc.text, flexShrink: 1 },
    dday: { ...ty.section, ...tabular, color: tc.primary },
  });
