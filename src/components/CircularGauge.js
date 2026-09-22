import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import { useMotion } from '../hooks/useMotion';
import { motion } from '../theme/tokens';

/**
 * 원형 진행 링 — 순수 View + Reanimated. 네이티브 의존성 없음.
 *
 * ## 왜 이렇게 그리나
 * 이 프로젝트에는 `react-native-svg` 가 없다 (위젯 헤드리스 런타임과 EAS 리빌드
 * 리스크 때문에 네이티브 의존성을 늘리지 않는다). 그래서 링을 **두 겹 클리핑 +
 * 회전**으로 그린다.
 *
 *   바깥 반원 창(overflow:hidden)
 *     └ 회전 래퍼 (게이지 중심을 자기 중심으로 갖는 size×size 상자)
 *         └ 안쪽 반원 창(overflow:hidden)
 *             └ 원형 테두리 링
 *
 * 안쪽 창이 링을 반으로 잘라 **반원 아크**를 만들고, 회전 래퍼를 돌리면 그
 * 아크가 바깥 창을 지나가며 0~180°가 그려진다. 0~50% 는 오른쪽 반원이,
 * 50~100% 는 왼쪽 반원이 이어받는다.
 *
 * 흔히 쓰는 '마스크 두 장' 방식은 마스크가 배경색과 같아야 해서 그라데이션
 * 히어로 위에서는 쓸 수 없다. 이 방식은 **채워지는 아크 자체**를 그리므로
 * 배경이 무엇이든 상관없다.
 *
 * 진행 애니메이션이 `rotate` 라서 "진행 바는 scaleX, width:'%' 금지"(§4) 규칙과
 * 충돌하지 않는다 — 폭을 건드리지 않는다.
 *
 * ## 무한 루프 예산
 * 선단 점의 맥박 **하나만** 무한 루프다 (`live` 가 true 일 때만). 히어로 안의
 * 루프 예산(최대 2개)을 여기서 1개만 쓰도록 의도적으로 줄였다.
 *
 * @param progress   0..1
 * @param size       바깥 지름
 * @param stroke     링 두께
 * @param live       선단 점 + 맥박 (실시간 게이지용)
 * @param children   링 가운데에 얹을 내용
 */
export default function CircularGauge({
  progress = 0,
  size = 200,
  stroke = 12,
  trackColor,
  fillColor,
  glow = false,
  live = false,
  delay = 200,
  children,
  style,
}) {
  const tc = useThemeColors();
  const m = useMotion();

  const track = trackColor ?? tc.heroTrack;
  const fill = fillColor ?? tc.progressFill;

  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  const p = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    p.value = withDelay(
      m.dur(delay),
      withTiming(clamped, {
        duration: m.dur(motion.duration.fill),
        easing: Easing.bezier(...motion.bezier.emphasis),
      })
    );
  }, [clamped, delay, m, p]);

  useEffect(() => {
    if (!live || m.reduced) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return undefined;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 720, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 720, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(pulse);
      pulse.value = 0;
    };
  }, [live, m.reduced, pulse]);

  /* 0~50% 는 오른쪽 반원, 50~100% 는 왼쪽이 이어받는다.
     둘 다 -180°(창 밖) → 0°(반원 가득) 로 움직인다. */
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-180 + Math.min(p.value, 0.5) * 360}deg` }],
  }));
  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-180 + Math.max(0, p.value - 0.5) * 360}deg` }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${p.value * 360}deg` }],
  }));
  const dotInner = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.35 }],
  }));

  const s = useMemo(() => makeStyles(size, stroke), [size, stroke]);
  const dot = Math.max(6, Math.round(stroke * 1.15));

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={[s.ring, { borderWidth: stroke, borderColor: track }]} pointerEvents="none" />

      {/* 오른쪽 반원 */}
      <View style={s.windowRight} pointerEvents="none">
        <Animated.View style={[s.rotatorRight, rightStyle]}>
          <View style={s.arcWindowRight}>
            <View style={[s.arcRing, s.arcRingRight, { borderWidth: stroke, borderColor: fill }]} />
          </View>
        </Animated.View>
      </View>

      {/* 왼쪽 반원 */}
      <View style={s.windowLeft} pointerEvents="none">
        <Animated.View style={[s.rotatorLeft, leftStyle]}>
          <View style={s.arcWindowLeft}>
            <View style={[s.arcRing, s.arcRingLeft, { borderWidth: stroke, borderColor: fill }]} />
          </View>
        </Animated.View>
      </View>

      {/* 선단 점 — 채워진 끝에서 맥박친다 */}
      {live ? (
        <Animated.View style={[s.dotRotator, dotStyle]} pointerEvents="none">
          <Animated.View
            style={[
              s.dot,
              dotInner,
              {
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                left: size / 2 - dot / 2,
                top: stroke / 2 - dot / 2,
                backgroundColor: fill,
              },
              glow && { shadowColor: fill, shadowOpacity: 0.9, shadowRadius: 8, elevation: 6 },
            ]}
          />
        </Animated.View>
      ) : null}

      <View style={s.center} pointerEvents="box-none">{children}</View>
    </View>
  );
}

const makeStyles = (size, stroke) => {
  const half = size / 2;
  return StyleSheet.create({
    ring: { ...StyleSheet.absoluteFillObject, borderRadius: half },

    /* 바깥 창 — 게이지의 좌/우 절반만 보여준다 */
    windowRight: { position: 'absolute', top: 0, left: half, width: half, height: size, overflow: 'hidden' },
    windowLeft: { position: 'absolute', top: 0, left: 0, width: half, height: size, overflow: 'hidden' },

    /* 회전 래퍼 — 자기 중심이 곧 게이지 중심이라 rotate 가 원 중심을 돈다 */
    rotatorRight: { position: 'absolute', top: 0, left: -half, width: size, height: size },
    rotatorLeft: { position: 'absolute', top: 0, left: 0, width: size, height: size },

    /* 안쪽 창 — 링을 반으로 잘라 반원 아크를 만든다 */
    arcWindowRight: { position: 'absolute', top: 0, left: half, width: half, height: size, overflow: 'hidden' },
    arcWindowLeft: { position: 'absolute', top: 0, left: 0, width: half, height: size, overflow: 'hidden' },

    arcRing: { position: 'absolute', top: 0, width: size, height: size, borderRadius: half },
    arcRingRight: { left: -half },
    arcRingLeft: { left: 0 },

    dotRotator: { position: 'absolute', top: 0, left: 0, width: size, height: size },
    dot: { position: 'absolute' },

    center: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      // 링 두께만큼은 무조건 비운다 — 글자가 링 위로 올라타면 대비 검증의
      // 전제(숫자는 그라데이션 위에 있다)가 깨진다.
      paddingHorizontal: stroke + 2,
    },
  });
};
