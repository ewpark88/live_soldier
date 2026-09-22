import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../../theme/tokens';
import { useThemeColors } from '../../theme/ThemeContext';
import { useMotion } from '../../hooks/useMotion';
import { haptic } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * 눌리는 모든 표면의 기반. 누르면 살짝 줄어들고 햅틱이 한 번 튄다.
 * activeOpacity(TouchableOpacity)보다 훨씬 촉감이 좋고, UI 스레드에서 돈다.
 *
 * `tint` 를 켜면 누르는 동안 표면 위에 아주 얇은 막이 덮인다. 스케일만으로는
 * 큰 카드에서 눌린 게 잘 안 보이는데(면적이 클수록 3% 축소는 미세하다), 막이
 * 있으면 "이 표면이 반응했다"가 즉시 읽힌다.
 *
 * 안드로이드 리플(`android_ripple`)을 쓰지 않는 이유: 라운드 카드에서 리플이
 * 모서리 밖으로 새어 사각형으로 번진다. 부모에 overflow:'hidden' 을 요구하면
 * 카드 그림자가 잘리고(§6), 그 대가로 얻는 게 없다.
 *
 * @param haptic      'select'|'light'|'medium'|'heavy'|'success'|'warning'|null
 * @param tint        누름 막 on/off
 * @param tintRadius  막의 모서리 반경 — 표면의 borderRadius 와 맞춘다
 */
export default function PressScale({
  onPress,
  onLongPress,
  scale = motion.press.scale,
  haptic: hapticKind = 'light',
  disabled = false,
  tint = false,
  tintRadius = 0,
  tintColor,
  style,
  children,
  ...rest
}) {
  const tc = useThemeColors();
  const m = useMotion();
  const s = useSharedValue(1);
  const t = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  // 0.07 — 이보다 진하면 막이 아니라 '비활성'처럼 보인다
  const tintStyle = useAnimatedStyle(() => ({ opacity: t.value * 0.07 }));

  const springIn = () => {
    if (!m.reduced) s.value = withSpring(scale, m.spring('press'));
    // 막은 동작 줄이기와 무관하게 켠다 — 이건 '움직임'이 아니라 '상태 표시'다.
    if (tint) t.value = withTiming(1, { duration: m.dur(motion.duration.instant) });
    if (hapticKind && haptic[hapticKind]) haptic[hapticKind]();
  };
  const springOut = () => {
    if (!m.reduced) s.value = withSpring(1, m.spring('press'));
    if (tint) t.value = withTiming(0, { duration: m.dur(motion.duration.fast) });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={disabled ? undefined : springIn}
      onPressOut={disabled ? undefined : springOut}
      disabled={disabled}
      hitSlop={motion.hitSlop}
      style={[animStyle, style]}
      {...rest}
    >
      {children}
      {tint ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: tintRadius, backgroundColor: tintColor ?? tc.text, opacity: 0 },
            tintStyle,
          ]}
        />
      ) : null}
    </AnimatedPressable>
  );
}
