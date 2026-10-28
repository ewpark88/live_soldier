import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useMotion } from '../../hooks/useMotion';

/**
 * 홈 링 안의 달리는 졸라맨 — "전역을 향해 달려간다".
 *
 * ## 왜 GIF 가 아닌가
 * GIF·Lottie 는 색이 파일에 박혀 있어 테마 12종 × 단계별 accent 를 따라갈 수 없다.
 * 그래서 마디를 둥근 막대 View 로 그리고 `rotate` 로만 움직인다. 색은 부모가 주는
 * `color`(= `tc.phase[stage].accent`) 하나라 테마를 바꾸면 D-Day 숫자와 같이 바뀐다.
 *
 * ## 관절
 * 관절마다 **0×0 View** 를 두고 그걸 회전시킨다. 크기 0 상자의 중심이 곧 관절이라
 * `transformOrigin` 없이도 관절 기준으로 돈다. 막대는 그 안에서 아래로 뻗고,
 * 다음 관절(무릎·팔꿈치)은 막대 끝에 같은 방식으로 중첩된다.
 *
 * ## 무한 루프 예산 (§4)
 * 공유값 `t` **하나**만 돈다. 팔·다리·몸 흔들림·속도선은 전부 `t` 에 위상 offset 을
 * 줘서 파생한다. 홈에서는 이 루프가 `CircularGauge` 선단 맥박을 대신한다
 * (`pulse={false}`) — 히어로 루프는 여전히 2개.
 *
 * 줄이기 ON · 비활성(다른 탭) → 한 발 내디딘 정지 포즈. `celebrate` → 만세 포즈, 루프 없음.
 *
 * @param size       키 (dp)
 * @param color      선 색
 * @param celebrate  전역 당일/완료 — 만세 정지
 * @param active     포커스 게이팅 — false 면 루프 정지
 */
const CYCLE = 560;       // 한 걸음 주기 (ms) — 빠르면 초조해 보이고 느리면 걷는다
const TAU = Math.PI * 2;

// 설계 격자는 키 30 단위. 실제 크기는 u = size / 30 배.
const G = {
  headR: 3.4,
  neck: 0.8,
  torso: 9,
  upperArm: 5,
  forearm: 4.5,
  thigh: 6,
  shin: 6,
  hipY: 17.4,
  hipX: 14,
  lean: 12,     // 앞으로 기울임 (deg, 반시계 = 진행 방향)
  bob: 1.2,
};

/* 각도 규약: 0° = 아래로 늘어뜨림, 양수 = 시계 방향(뒤쪽). 진행 방향은 오른쪽. */
function pose(phi) {
  'worklet';
  const knee = (p) => {
    // 다리가 뒤에서 앞으로 감겨 올 때(cos 최대 근처) 가장 많이 접힌다
    const c = 0.5 + 0.5 * Math.cos(p + 0.3);
    return 12 + 62 * c * c;
  };
  return {
    thighA: -35 * Math.sin(phi),
    shinA: knee(phi),
    thighB: -35 * Math.sin(phi + Math.PI),
    shinB: knee(phi + Math.PI),
    armA: 40 * Math.sin(phi),
    armB: -40 * Math.sin(phi),
  };
}

// useAnimatedStyle 안에서 불리므로 반드시 worklet — 빠지면 UI 스레드에서
// "Object is not a function" 으로 앱이 죽는다 (홈 진입 즉시, 매 실행마다).
function rot(deg) {
  'worklet';
  return { transform: [{ rotate: `${deg}deg` }] };
}

const CHEER = {
  body: { transform: [{ translateY: 0 }, { rotate: '0deg' }] },
  thighA: rot(-16),
  shinA: rot(0),
  thighB: rot(16),
  shinB: rot(0),
  armA: rot(-150),     // 위·오른쪽
  forearmA: rot(-10),
  armB: rot(150),      // 위·왼쪽
  forearmB: rot(10),
};

export default function StickRunner({ size = 28, color, celebrate = false, active = true }) {
  const m = useMotion();
  const running = active && !celebrate && !m.reduced;
  const u = size / 30;

  const t = useSharedValue(0.25);   // 0.25 → phi = π/2 : 정지 포즈와 같은 프레임

  useEffect(() => {
    if (!running) {
      cancelAnimation(t);
      t.value = 0.25;
      return undefined;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: CYCLE, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(t);
      t.value = 0.25;
    };
  }, [running, t]);

  const body = useAnimatedStyle(() => ({
    transform: [
      { translateY: -G.bob * u * (0.5 + 0.5 * Math.cos(t.value * TAU * 2)) },
      { rotate: `${-G.lean}deg` },
    ],
  }));
  const thighA = useAnimatedStyle(() => rot(pose(t.value * TAU).thighA));
  const shinA = useAnimatedStyle(() => rot(pose(t.value * TAU).shinA));
  const thighB = useAnimatedStyle(() => rot(pose(t.value * TAU).thighB));
  const shinB = useAnimatedStyle(() => rot(pose(t.value * TAU).shinB));
  const armA = useAnimatedStyle(() => rot(pose(t.value * TAU).armA));
  const armB = useAnimatedStyle(() => rot(pose(t.value * TAU).armB));

  /* 속도선 — (2t + offset) % 1 은 t 가 1→0 으로 감겨도 이어진다 (2 ≡ 0). */
  const line0 = useAnimatedStyle(() => {
    const q = (t.value * 2) % 1;
    return { opacity: (1 - q) * 0.6, transform: [{ translateX: -q * 6 * u }] };
  });
  const line1 = useAnimatedStyle(() => {
    const q = (t.value * 2 + 0.5) % 1;
    return { opacity: (1 - q) * 0.6, transform: [{ translateX: -q * 6 * u }] };
  });

  const d = useMemo(() => dims(u), [u]);
  const st = celebrate
    ? CHEER
    : {
        body,
        thighA,
        shinA,
        thighB,
        shinB,
        armA,
        forearmA: FOREARM,
        armB,
        forearmB: FOREARM,
      };
  // 줄이기 ON · 비활성이면 t 가 0.25 에 멈춰 있으므로 위 스타일이 곧 정지 포즈다.

  const bar = (len) => [
    s.abs,
    {
      left: -d.w / 2,
      top: -d.w / 2,
      width: d.w,
      height: len + d.w,
      borderRadius: d.w / 2,
      backgroundColor: color,
    },
  ];

  const limb = (jointStyle, upper, lower, lowerStyle, faded, pos) => (
    <Animated.View style={[s.joint, pos, jointStyle, faded && s.far]}>
      <View style={bar(upper)} />
      <Animated.View style={[s.joint, { top: upper }, lowerStyle]}>
        <View style={bar(lower)} />
      </Animated.View>
    </Animated.View>
  );

  const shoulder = { top: -d.torso + d.w };

  return (
    <View
      style={{ width: size, height: size }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {running ? (
        <View style={[s.abs, { left: d.hipX - 9 * u, top: d.hipY - 5 * u }]}>
          <Animated.View style={[s.abs, line0, lineStyle(d, color, 0)]} />
          <Animated.View style={[s.abs, line1, lineStyle(d, color, 3.2 * u)]} />
        </View>
      ) : null}

      {/* 엉덩이 = 몸 전체의 회전·흔들림 기준점 */}
      <Animated.View style={[s.joint, { left: d.hipX, top: d.hipY }, st.body]}>
        {/* 먼 쪽 팔다리 먼저 (흐리게) — 앞뒤 깊이감 */}
        {limb(st.armB, d.upperArm, d.forearm, st.forearmB, !celebrate, shoulder)}
        {limb(st.thighB, d.thigh, d.shin, st.shinB, !celebrate, null)}

        {/* 몸통 */}
        <View style={[bar(d.torso), { top: -d.torso - d.w / 2 }]} />
        {/* 머리 */}
        <View
          style={[
            s.abs,
            {
              left: -d.headR,
              top: -d.torso - d.neck - d.headR * 2,
              width: d.headR * 2,
              height: d.headR * 2,
              borderRadius: d.headR,
              backgroundColor: color,
            },
          ]}
        />

        {limb(st.thighA, d.thigh, d.shin, st.shinA, false, null)}
        {limb(st.armA, d.upperArm, d.forearm, st.forearmA, false, shoulder)}
      </Animated.View>
    </View>
  );
}

// 팔꿈치는 앞으로 접어 고정 — 달리는 팔은 굽어 있다
const FOREARM = rot(-75);

function dims(u) {
  return {
    w: Math.max(2, 2.6 * u),   // 선 두께
    headR: G.headR * u,
    neck: G.neck * u,
    torso: G.torso * u,
    upperArm: G.upperArm * u,
    forearm: G.forearm * u,
    thigh: G.thigh * u,
    shin: G.shin * u,
    hipX: G.hipX * u,
    hipY: G.hipY * u,
  };
}

function lineStyle(d, color, top) {
  return {
    top,
    left: 0,
    width: d.w * 1.4 + 2 * d.hipX / 14,
    height: Math.max(1.5, d.w * 0.7),
    borderRadius: d.w,
    backgroundColor: color,
  };
}

const s = StyleSheet.create({
  abs: { position: 'absolute' },
  // 크기 0 상자 — 회전 중심이 곧 관절
  joint: { position: 'absolute', left: 0, top: 0, width: 0, height: 0 },
  far: { opacity: 0.5 },
});
