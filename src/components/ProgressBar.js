import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import { motion } from '../theme/tokens';
import { useMotion } from '../hooks/useMotion';

/**
 * 공용 진행 바.
 *
 * width:'%' 가 아니라 scaleX 를 애니메이션한다. 퍼센트 폭은 프레임마다
 * 레이아웃 패스를 강제해서 JS 스레드에서 돌 수밖에 없다 (예전 구현과
 * SalaryScreen 의 사본이 둘 다 useNativeDriver:false 였던 이유).
 * scaleX 는 UI 스레드에서 공짜다.
 *
 * @param progress  0..1
 * @param tone      'primary' | 'accent' | 'success' | 'hero'(어두운 히어로 위)
 */
export default function ProgressBar({
  progress = 0,
  height = 8,
  tone = 'primary',
  trackColor,
  fillColor,
  delay = 200,
  style,
}) {
  const tc = useThemeColors();
  const m = useMotion();
  const p = useSharedValue(0);

  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  useEffect(() => {
    p.value = withDelay(
      m.dur(delay),
      withTiming(clamped, {
        duration: m.dur(motion.duration.fill),
        easing: Easing.bezier(...motion.bezier.emphasis),
      })
    );
  }, [clamped, m.reduced]);

  const TONE_FILL = {
    primary: tc.progressFill,
    accent: tc.accent,
    success: tc.success,
    hero: tc.accentLight,
  };
  const TONE_TRACK = {
    primary: tc.progressBg,
    accent: tc.progressBg,
    success: tc.progressBg,
    hero: 'rgba(255,255,255,0.16)',
  };

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: p.value }] }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor || TONE_TRACK[tone] || tc.progressBg,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            borderRadius: height / 2,
            backgroundColor: fillColor || TONE_FILL[tone] || tc.progressFill,
          },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
  fill: {
    ...StyleSheet.absoluteFillObject,
    // 왼쪽 끝을 고정하고 오른쪽으로 늘린다 (기본값이면 가운데서 양쪽으로 퍼진다)
    transformOrigin: 'left',
  },
});
