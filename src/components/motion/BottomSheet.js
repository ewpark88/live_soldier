import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../theme/ThemeContext';
import { motion, radius, space } from '../../theme/tokens';
import { useMotion } from '../../hooks/useMotion';

/**
 * 바텀시트.
 *
 * RN Modal 은 animationType="none" 으로 두고 안쪽을 Reanimated 로 직접 움직인다.
 * 핵심은 "닫힘": 애니메이션이 끝난 뒤에 Modal 을 언마운트해야 시트가 사라지는
 * 순간 툭 끊기지 않는다. 그래서 visible(부모 의도)과 mounted(실제 렌더)를 분리한다.
 *
 * 드래그로 내리기는 없다 — react-native-gesture-handler 를 설치하지 않았다.
 * 배경 탭 + 안드로이드 뒤로가기로 닫는다.
 *
 * 키보드: 시트는 KeyboardAvoidingView(padding, 양 플랫폼) 바닥에 붙는다.
 * 예전엔 화면마다 iOS 전용 KAV 를 따로 감싸서 안드로이드에선 키보드가 메모
 * 입력·저장 버튼을 덮었다. 자식은 flexShrink 래퍼 안에 들어가므로, 내용이
 * maxHeight 를 넘으면 자식의 ScrollView 가 줄어들어 스크롤된다 (버튼이 잘리지 않음).
 * 화면 쪽에서 KAV 를 또 감싸지 말 것 — 패딩이 이중으로 들어간다.
 */
export default function BottomSheet({ visible, onClose, children, maxHeightRatio = 0.9 }) {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const m = useMotion();

  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(winH);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      backdrop.value = withTiming(1, { duration: m.dur(220) });
      y.value = m.reduced
        ? 0
        : withSpring(0, { damping: 22, stiffness: 240, mass: 0.9 });
      if (m.reduced) y.value = 0;
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: m.dur(motion.duration.fast) });
      y.value = withTiming(
        winH,
        {
          duration: m.dur(200),
          easing: Easing.bezier(...motion.bezier.exit),
        },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }
      );
    }
  }, [visible]);

  // 안드로이드 뒤로가기
  useEffect(() => {
    if (!mounted) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose?.();
      return true;
    });
    return () => sub.remove();
  }, [mounted, onClose]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.fill}>
        <Animated.View style={[styles.backdrop, { backgroundColor: tc.scrim }, backdropStyle]}>
          <Pressable style={styles.fill} onPress={onClose} accessibilityLabel="닫기" />
        </Animated.View>

        <KeyboardAvoidingView
          behavior="padding"
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: tc.card,
                maxHeight: winH * maxHeightRatio,
                paddingBottom: insets.bottom + space.lg,
              },
              sheetStyle,
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: tc.border }]} />
            <View style={styles.body}>{children}</View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  kav: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  body: { flexShrink: 1 },
  sheet: {
    flexShrink: 1,   // 키보드가 올라와 남은 높이가 maxHeight 보다 작으면 시트가 줄어든다
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.sm,
    paddingHorizontal: space.lg,
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    marginBottom: space.md,
  },
});
