import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { motion } from '../../theme/tokens';
import { useMotion } from '../../hooks/useMotion';
import { haptic } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * 눌리는 모든 표면의 기반. 누르면 살짝 줄어들고 햅틱이 한 번 튄다.
 * activeOpacity(TouchableOpacity)보다 훨씬 촉감이 좋고, UI 스레드에서 돈다.
 *
 * @param haptic  'select'|'light'|'medium'|'heavy'|'success'|'warning'|null
 */
export default function PressScale({
  onPress,
  onLongPress,
  scale = motion.press.scale,
  haptic: hapticKind = 'light',
  disabled = false,
  style,
  children,
  ...rest
}) {
  const m = useMotion();
  const s = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  const springIn = () => {
    if (!m.reduced) s.value = withSpring(scale, m.spring('press'));
    if (hapticKind && haptic[hapticKind]) haptic[hapticKind]();
  };
  const springOut = () => {
    if (!m.reduced) s.value = withSpring(1, m.spring('press'));
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
    </AnimatedPressable>
  );
}
