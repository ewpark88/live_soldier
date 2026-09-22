import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { DAYPART_WASH } from '../../theme/palettes/base';
import { useTheme } from '../../theme/ThemeContext';
import { useMotion } from '../../hooks/useMotion';

/**
 * 살아있는 히어로 배경 — 시간대 워시 한 겹 + 아주 느리게 떠다니는 광원 둘.
 *
 * 두 가지를 동시에 표현한다.
 *  - **시각**: 새벽·아침·낮·노을·밤에 따라 히어로 위에 다른 색 워시가 덮인다.
 *    같은 D-Day 인데 새벽에 열면 푸르고 저녁에 열면 따뜻하다.
 *  - **진행률**: 복무가 쌓일수록 광원이 또렷해진다. 이병 때는 거의 안 보이고
 *    말년에는 확실히 빛난다.
 *
 * 워시 색은 팔레트가 소유한다(`DAYPART_WASH`). 여기에 hex 를 박으면 테마 대비
 * 검사(`npm run theme:check`)의 사각지대가 생긴다 — 검사는 팔레트만 읽는다.
 *
 * 무한 루프는 **1개**다. `EmberField` 와 같은 수법으로, 공유값 하나가 0→1 을
 * 반복하고 각 광원은 위상 offset 을 더해 자기 진행도를 파생시킨다. 히어로의
 * 루프 예산(§4, 최대 2개)에서 링의 선단 맥박과 함께 딱 둘을 쓴다.
 *
 * 반드시 `overflow:'hidden'` 부모(HeroCard) 안에 둔다.
 *
 * @param daypart   'dawn'|'morning'|'noon'|'dusk'|'night'
 * @param progress  0..1 복무 진행률 — 광원 세기
 * @param color     광원 색 (단계별 accent)
 */
const CYCLE = 14000;   // 아주 느리게 — 눈에 띄면 산만해진다
const PHI = 0.6180339887;

function Blob({ drift, index, color, intensity }) {
  const offset = (index * PHI) % 1;
  const size = index === 0 ? 220 : 160;
  const left = index === 0 ? -40 : 58;      // %  (두 번째만 퍼센트로 놓는다)
  const top = index === 0 ? -50 : 90;

  const style = useAnimatedStyle(() => {
    const local = (drift.value + offset) % 1;
    // 왕복이라 끝에서 끊기지 않는다 (0→1→0)
    const wave = interpolate(local, [0, 0.5, 1], [0, 1, 0]);
    return {
      transform: [
        { translateX: (index === 0 ? 26 : -22) * wave },
        { translateY: (index === 0 ? 18 : -14) * wave },
        { scale: 1 + wave * 0.12 },
      ],
      opacity: intensity * (0.5 + wave * 0.5),
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top,
          left: index === 0 ? left : undefined,
          right: index === 0 ? undefined : -30,
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

export default function AuroraWash({ daypart = 'noon', progress = 0, color }) {
  const { scheme } = useTheme();
  const m = useMotion();
  const drift = useSharedValue(0);

  const wash = (DAYPART_WASH[scheme] || DAYPART_WASH.light)[daypart];

  // 초반엔 은은하게, 말년엔 또렷하게. 최대 0.22 — 이 위로는 그라데이션을
  // 먹어버려서 D-Day 숫자 대비 검사의 전제(워시만 얹힌다)가 깨진다.
  const intensity = 0.06 + Math.max(0, Math.min(1, progress)) * 0.16;

  useEffect(() => {
    if (m.reduced || !color) {
      cancelAnimation(drift);
      drift.value = 0;
      return undefined;
    }
    drift.value = 0;
    drift.value = withRepeat(
      withTiming(1, { duration: CYCLE, easing: Easing.linear }),
      -1,
      false
    );
    return () => { cancelAnimation(drift); drift.value = 0; };
  }, [m.reduced, color, drift]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {wash ? <View style={[StyleSheet.absoluteFill, { backgroundColor: wash }]} /> : null}

      {/* 동작 줄이기에서도 워시(색)는 남긴다 — 시간대 인상은 애니메이션이 아니다.
          움직이는 광원만 끈다. */}
      {!m.reduced && color ? (
        <>
          <Blob drift={drift} index={0} color={color} intensity={intensity} />
          <Blob drift={drift} index={1} color={color} intensity={intensity} />
        </>
      ) : null}
    </View>
  );
}
