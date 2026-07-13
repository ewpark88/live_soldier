import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { usePrefs } from '../theme/PrefsContext';
import { motion } from '../theme/tokens';

/**
 * 모션의 단일 관문.
 *
 * OS의 "동작 줄이기" 접근성 설정과 앱 설정의 "애니메이션 줄이기" 토글을
 * OR로 합친다. 화면 코드는 이 훅만 쓰고 직접 분기하지 않는다.
 *
 *   const m = useMotion();
 *   withTiming(1, { duration: m.dur(motion.duration.base) })   // 줄이기 ON → 0ms, 즉시 반영
 *   <Animated.View entering={m.enter(FadeInUp, i)} />          // 줄이기 ON → undefined
 */
export function useMotion() {
  const systemReduced = useReducedMotion();
  const { reduceMotion } = usePrefs();
  const reduced = !!(systemReduced || reduceMotion);

  return useMemo(
    () => ({
      enabled: !reduced,
      reduced,

      /** 지속시간 — 줄이기 ON이면 0 (애니메이션 없이 최종값으로 점프) */
      dur: (ms) => (reduced ? 0 : ms),

      /** 스태거 지연 — 인덱스는 staggerMax 에서 잘린다 (그 이상은 굼떠 보인다) */
      stagger: (i = 0) =>
        reduced ? 0 : Math.min(i, motion.staggerMax) * motion.stagger,

      /**
       * entering/exiting 빌더에 지연·시간을 먹여 돌려준다.
       * 줄이기 ON이면 undefined 를 반환해 Reanimated가 애니메이션을 건너뛴다.
       */
      enter: (builder, i = 0, ms = motion.duration.slow) =>
        reduced
          ? undefined
          : builder.duration(ms).delay(Math.min(i, motion.staggerMax) * motion.stagger),

      exit: (builder, ms = motion.duration.fast) =>
        reduced ? undefined : builder.duration(ms),

      /** 레이아웃 트랜지션 — 줄이기 ON이면 undefined */
      layout: (builder) => (reduced ? undefined : builder),

      spring: (name = 'press') => motion.spring[name] || motion.spring.press,
    }),
    [reduced]
  );
}

export default useMotion;
