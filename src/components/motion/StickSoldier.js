import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useMotion } from '../../hooks/useMotion';
import { cheerPose, dims, rigFor } from './soldierRig';

/**
 * 막대병 — 홈 링 안 캐릭터. 모습(skin)마다 동작과 장비가 다르다 (`soldierRig.js`).
 *
 * ## 왜 GIF 가 아닌가
 * GIF·Lottie 는 색이 파일에 박혀 있어 테마 12종 × 단계별 accent 를 따라갈 수 없다.
 * 그래서 마디와 장비를 전부 같은 색(`color`)의 View 로 그리고 `rotate` 로만 움직인다.
 *
 * ## 관절
 * 관절마다 **0×0 View** 를 두고 그걸 회전시킨다. 크기 0 상자의 중심이 곧 관절이라
 * `transformOrigin` 없이도 관절 기준으로 돈다. 막대는 그 안에서 아래로 뻗고,
 * 다음 관절(무릎·팔꿈치·손)은 막대 끝에 같은 방식으로 중첩된다.
 * `scripts/preview-soldiers.js` 가 이 중첩을 SVG 로 똑같이 따라 그린다 — 구조를
 * 바꾸면 그쪽도 같이 바꾼다.
 *
 * ## 무한 루프 예산 (§4)
 * 공유값 `t` **하나**만 돈다. 포즈는 `useDerivedValue` 로 프레임당 한 번 계산하고
 * 모든 마디가 그 결과를 읽는다. 홈에서는 이 루프가 `CircularGauge` 선단 맥박을
 * 대신한다 (`pulse={false}`).
 *
 * 줄이기 ON · 비활성(다른 탭) → 그 모습의 정지 포즈. `celebrate` → 만세, 손 장비는 내려놓는다.
 *
 * 모습을 바꿀 때는 `key={skin}` 으로 리마운트한다 — 포즈 worklet 이 클로저에 잡혀 있다.
 *
 * @param skin       모습 id (`constants/soldierSkins.js`)
 * @param size       키 (dp)
 * @param color      선 색
 * @param celebrate  전역 당일/완료 — 만세 정지
 * @param active     포커스 게이팅 — false 면 루프 정지
 */
const TAU = Math.PI * 2;

export default function StickSoldier({
  skin = 'run',
  size = 28,
  color,
  celebrate = false,
  active = true,
}) {
  const m = useMotion();
  const rig = rigFor(skin);
  const running = active && !celebrate && !m.reduced;
  const u = size / 30;

  const poseFn = celebrate ? cheerPose : rig.pose;
  const rest = rig.rest;
  const cycle = rig.cycle;

  const t = useSharedValue(rest);

  useEffect(() => {
    if (!running) {
      cancelAnimation(t);
      t.value = rest;
      return undefined;
    }
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: cycle, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(t);
      t.value = rest;
    };
  }, [running, t, rest, cycle]);

  const p = useDerivedValue(() => poseFn(t.value * TAU));

  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: p.value.bodyY * u }, { rotate: `${p.value.lean}deg` }],
  }));
  const thighA = useAnimatedStyle(() => rot(p.value.thighA));
  const shinA = useAnimatedStyle(() => rot(p.value.shinA));
  const thighB = useAnimatedStyle(() => rot(p.value.thighB));
  const shinB = useAnimatedStyle(() => rot(p.value.shinB));
  const armA = useAnimatedStyle(() => rot(p.value.armA));
  const forearmA = useAnimatedStyle(() => rot(p.value.forearmA));
  const armB = useAnimatedStyle(() => rot(p.value.armB));
  const forearmB = useAnimatedStyle(() => rot(p.value.forearmB));
  const flash = useAnimatedStyle(() => ({ opacity: p.value.flash }));

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

  const shapes = (list) =>
    (list || []).map((g, i) => {
      const st = {
        left: g.x * u,
        top: g.y * u,
        width: g.w * u,
        height: g.h * u,
        borderRadius: (g.r || 0) * u,
        backgroundColor: color,
        opacity: g.o ?? 1,
      };
      return g.flash ? (
        <Animated.View key={i} style={[s.abs, st, flash]} />
      ) : (
        <View key={i} style={[s.abs, st]} />
      );
    });

  const limb = (jointStyle, upper, lower, lowerStyle, faded, pos, gear) => (
    <Animated.View style={[s.joint, pos, jointStyle, faded && s.far]}>
      <View style={bar(upper)} />
      <Animated.View style={[s.joint, { top: upper }, lowerStyle]}>
        <View style={bar(lower)} />
        {gear ? <View style={[s.joint, { top: lower }]}>{shapes(gear)}</View> : null}
      </Animated.View>
    </Animated.View>
  );

  const shoulder = { top: -d.torso + d.w };
  const headCY = -d.torso - d.neck - d.headR;
  // 만세 포즈에서는 손에 든 것을 내려놓는다 (총·삽을 든 채 만세는 어색하다)
  const handA = celebrate ? null : rig.hand;
  const handB = celebrate ? null : rig.handB;
  const showLines = running && rig.lines;

  return (
    <View
      style={{ width: size, height: size }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {showLines ? (
        <View style={[s.abs, { left: d.hipX - 9 * u, top: d.hipY - 5 * u }]}>
          <Animated.View style={[s.abs, line0, lineStyle(d, color, 0)]} />
          <Animated.View style={[s.abs, line1, lineStyle(d, color, 3.2 * u)]} />
        </View>
      ) : null}

      {/* 엉덩이 = 몸 전체의 회전·흔들림 기준점 */}
      <Animated.View style={[s.joint, { left: d.hipX, top: d.hipY }, body]}>
        {/* 먼 쪽 팔다리 먼저 (흐리게) — 앞뒤 깊이감 */}
        {limb(armB, d.upperArm, d.forearm, forearmB, !celebrate, shoulder, handB)}
        {limb(thighB, d.thigh, d.shin, shinB, !celebrate, null, null)}

        {/* 등에 멘 것 (몸통 뒤) */}
        {rig.back ? shapes(rig.back) : null}

        {/* 몸통 */}
        <View style={[bar(d.torso), { top: -d.torso - d.w / 2 }]} />
        {/* 머리 */}
        <View
          style={[
            s.abs,
            {
              left: -d.headR,
              top: headCY - d.headR,
              width: d.headR * 2,
              height: d.headR * 2,
              borderRadius: d.headR,
              backgroundColor: color,
            },
          ]}
        />
        {rig.head ? <View style={[s.joint, { top: headCY }]}>{shapes(rig.head)}</View> : null}

        {limb(thighA, d.thigh, d.shin, shinA, false, null, null)}
        {limb(armA, d.upperArm, d.forearm, forearmA, false, shoulder, handA)}
      </Animated.View>
    </View>
  );
}

// useAnimatedStyle 안에서 불리므로 반드시 worklet — 빠지면 UI 스레드에서
// "Object is not a function" 으로 앱이 죽는다 (홈 진입 즉시, 매 실행마다).
function rot(deg) {
  'worklet';
  return { transform: [{ rotate: `${deg}deg` }] };
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
