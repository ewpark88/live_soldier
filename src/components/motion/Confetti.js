import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useMotion } from '../../hooks/useMotion';

/**
 * 컨페티 — 마일스톤 축하에서 딱 한 번 터진다.
 *
 * `withRepeat` 가 없다. **일회성 발사**라 무한 루프 예산(§4)과 무관하다 —
 * 끝나면 그대로 멈춰 있고, `burstKey` 가 바뀔 때만 다시 터진다.
 *
 * 조각마다 애니메이션을 걸지 않는다. `EmberField` 와 같은 수법으로 공유값
 * 하나가 0→1 로 한 번 흐르고, 각 조각은 황금비로 흩뿌린 위상 offset 과
 * 자기 인덱스에서 파생한 각도·거리·회전을 쓴다. 전부 UI 스레드 파생이라
 * 조각을 늘려도 JS 스레드는 건드리지 않는다.
 *
 * 반드시 `overflow:'hidden'` 부모 안에 둔다 (HeroCard 가 보장한다).
 */
const COUNT = 18;
const PHI = 0.6180339887;
const DURATION = 1800;

function Piece({ t, index, colors }) {
  const offset = (index * PHI) % 1;
  const color = colors[index % colors.length];
  const w = 5 + (index % 3) * 2;
  const h = w + 3 + (index % 2) * 3;

  // 위쪽 중앙에서 부채꼴로 흩어졌다가 떨어진다
  const angle = -150 + (index / COUNT) * 120 + (offset - 0.5) * 18;
  const dist = 90 + (index % 5) * 34;
  const dx = Math.cos((angle * Math.PI) / 180) * dist;
  const dy = Math.sin((angle * Math.PI) / 180) * dist;
  const fall = 220 + (index % 4) * 50;
  const spin = (index % 2 ? 1 : -1) * (540 + (index % 3) * 180);

  const style = useAnimatedStyle(() => {
    // 위상 offset 만큼 늦게 출발한다 (0.22 는 발사 간격)
    const local = Math.max(0, Math.min(1, (t.value - offset * 0.22) / (1 - 0.22)));
    return {
      opacity: interpolate(local, [0, 0.08, 0.75, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: dx * local },
        // 솟았다가(ease-out) 떨어진다(중력) — 포물선
        { translateY: dy * local + fall * local * local },
        { rotate: `${spin * local}deg` },
        { scale: interpolate(local, [0, 0.12, 1], [0.4, 1, 0.9]) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: '34%',
          left: '50%',
          width: w,
          height: h,
          marginLeft: -w / 2,
          borderRadius: 1.5,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * @param burstKey  값이 바뀔 때마다 새로 터진다
 * @param colors    조각 색 배열 (단계별 accent + 히어로 텍스트 등)
 */
export default function Confetti({ burstKey = 0, colors = [] }) {
  const m = useMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (m.reduced || colors.length === 0) {
      cancelAnimation(t);
      t.value = 0;
      return undefined;
    }
    t.value = 0;
    t.value = withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) });
    return () => { cancelAnimation(t); t.value = 0; };
  }, [burstKey, m.reduced, colors.length, t]);

  if (m.reduced || colors.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: COUNT }, (_, i) => (
        <Piece key={i} t={t} index={i} colors={colors} />
      ))}
    </View>
  );
}
