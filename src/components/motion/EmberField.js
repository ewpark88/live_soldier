import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useMotion } from '../../hooks/useMotion';

/**
 * 골드 불티 — 히어로 안에서만 쓴다.
 *
 * 예전엔 🎆🎊🎉🥳 이모지가 떠다녔다. 앱에서 가장 촌스러운 요소였고,
 * overflow 클리핑이 없는 카드를 뚫고 위 섹션까지 침범했다.
 * 반드시 overflow:'hidden' 부모(HeroCard) 안에 둔다.
 *
 * 무한 루프는 정확히 1개다.
 *   예전엔 점마다 withRepeat 를 걸어 루프가 12~18개였다 (디자인 시스템 §4는
 *   "히어로 안에서만, 최대 2개"). 이제 공유값 하나가 0→1 을 반복하고,
 *   각 점은 황금비로 흩뿌린 위상 offset 을 더해 (p + offset) % 1 로 자기
 *   진행도를 파생시킨다. 전부 UI 스레드 파생이라 루프는 늘지 않는데
 *   점들은 따로 노는 것처럼 보인다.
 *   (속도를 점마다 다르게 하면 p 가 1→0 으로 감길 때 위상이 튀므로
 *    속도는 공유하고 높이·좌우 흔들림·크기만 다르게 준다.)
 */

const CYCLE = 4200;
const DENSITY_COUNT = { normal: 8, dense: 12 };
const PHI = 0.6180339887; // 황금비 — 위상이 가장 고르게 흩어진다

function Ember({ progress, index, color, rise }) {
  const size = 2 + (index % 3);
  const left = 4 + ((index * 7.3) % 92);
  const drift = ((index % 5) - 2) * 8;
  const lift = rise * (0.78 + (index % 4) * 0.11);
  const offset = (index * PHI) % 1;

  const style = useAnimatedStyle(() => {
    const local = (progress.value + offset) % 1;
    return {
      transform: [
        { translateY: -lift * local },
        { translateX: drift * local },
      ],
      // 떠오르며 밝아졌다가 사그라든다
      opacity: interpolate(local, [0, 0.15, 0.7, 1], [0, 0.5, 0.28, 0]),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          bottom: 4,
          left: `${left}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * @param {'normal'|'dense'|null} density  불티 밀도. falsy 면 렌더 안 함.
 * @param {string} color                   불티 색 (테마의 단계별 accent)
 * @param {number} rise                    최대 상승 높이(px)
 * @param {number} cycle                   한 바퀴 도는 시간(ms)
 */
export default function EmberField({ density = 'normal', color, rise = 180, cycle = CYCLE }) {
  const m = useMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (m.reduced || !density || !color) return;
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, { duration: cycle, easing: Easing.linear }),
      -1,
      false
    );
  }, [m.reduced, density, color, cycle]);

  if (m.reduced || !density || !color) return null;

  const count = DENSITY_COUNT[density] ?? DENSITY_COUNT.normal;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <Ember key={i} progress={progress} index={i} color={color} rise={rise} />
      ))}
    </View>
  );
}
