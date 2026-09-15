import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  cancelAnimation,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '../../theme/ThemeContext';
import { elev, radius as r, space as sp } from '../../theme/tokens';
import { useMotion } from '../../hooks/useMotion';

/**
 * 히어로 표면 — 앱에서 유일한 "짙은 그라데이션 카드".
 *
 * 지금까지 다크 표면이 네 가지 방식으로 따로 만들어져 있었다
 * (홈 mainCard / 급여의 밝은 테두리 달린 Card / 전역 ddayBox / 적금 hero).
 * 전부 이걸로 통일한다.
 *
 * overflow:'hidden' 은 옵션이 아니다 — 항상 켠다. 히어로 안에서 도는 장식
 * (sheen, 불티, 글로우)이 카드 밖으로 새어 나가 위 섹션을 덮는 사고를
 * 구조적으로 막는다.
 *
 * 안드로이드 주의: overflow:'hidden' + 그라데이션 자식이면 elevation 그림자가
 * 사라진다. 그래서 그림자는 바깥 래퍼가, 클리핑은 안쪽이 맡는다.
 */
export default function HeroCard({
  gradient,
  angle = 'diagonal',
  fullBleed = false,
  radiusKey = 'xl',
  padded = true,
  sheen = true,
  /** 그라데이션 레이어에 얹을 애니메이션 스타일 (홈의 오버스크롤 러버밴드) */
  gradientStyle,
  style,
  contentStyle,
  children,
}) {
  const tc = useThemeColors();
  const m = useMotion();
  const e = elev(tc);

  const colors = gradient || [tc.heroFrom, tc.heroTo];
  const rad = fullBleed ? 0 : r[radiusKey] ?? r.xl;

  // 'reverse' 는 데일리 히어로가 쓴다 — 같은 색으로 매일 다른 인상을 만들 수 있어
  // 단계×테마마다 새 그라데이션을 손으로 짜는 것보다 압도적으로 싸다.
  const DIRS = {
    vertical: { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } },
    reverse: { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
    diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  };
  const dir = DIRS[angle] ?? DIRS.diagonal;

  // 대각선 광택이 아주 느리게 한 번씩 훑고 지나간다. 루프 1개.
  const sweep = useSharedValue(-1);
  useEffect(() => {
    if (!sheen || m.reduced) return undefined;
    sweep.value = -1;   // 멈췄던 위치에서 다시 시작하면 카드 중앙에서 튀어나온다
    sweep.value = withDelay(
      600,
      withRepeat(
        withTiming(1.6, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        -1,
        false
      )
    );
    return () => { cancelAnimation(sweep); sweep.value = -1; };
  }, [sheen, m.reduced]);

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${sweep.value * 100}%` }, { rotate: '18deg' }],
  }));

  return (
    <View
      style={[
        // 그림자는 여기(클리핑 안 되는 바깥)에
        !fullBleed && { borderRadius: rad, ...e.hero },
        style,
      ]}
    >
      <View style={{ borderRadius: rad, overflow: 'hidden' }}>
        {/* 그라데이션은 Animated.View 안에 둔다 — 홈이 스크롤에 맞춰
            이걸 늘렸다 줄였다 한다(러버밴드). 클리핑 부모 안이라 아무리
            키워도 카드 밖으로 새지 않는다. */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, gradientStyle]}
        >
          <LinearGradient colors={colors} {...dir} style={StyleSheet.absoluteFill} />
        </Animated.View>

        {sheen && !m.reduced ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.sheen, { backgroundColor: tc.heroSheen }, sheenStyle]}
          />
        ) : null}

        <View style={[padded && styles.pad, contentStyle]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: sp.xl },
  sheen: {
    position: 'absolute',
    top: -60,
    bottom: -60,
    width: 70,
    opacity: 0.5,
  },
});
