import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import { useMotion } from '../hooks/useMotion';
import { motion, radius as r } from '../theme/tokens';

/**
 * 칸이 곧 단위인 진행 바. 휴가처럼 "며칠 남았나"가 세어지는 값에 쓴다.
 *
 * 연속 바는 62% 같은 비율만 말한다. 휴가는 24~28일이라 칸 하나가 하루가 되고,
 * 남은 칸을 **눈으로 셀 수 있다**. 셀 수 있는 것과 비율은 다른 정보다.
 *
 * 칸이 너무 많으면(> MAX_CELLS) 세는 의미가 사라지므로 연속 바로 떨어진다.
 *
 * 무한 루프 없음. 공유값 하나가 0→1 로 한 번 흐르고 각 칸이 자기 순번에서
 * 켜진다 (칸마다 애니메이션을 걸면 40개짜리 루프가 생긴다).
 *
 * @param total   전체 칸 수
 * @param filled  채워진 칸 수
 * @param onHero  히어로 표면 위 (색 반전)
 */
const MAX_CELLS = 40;

function Cell({ t, index, total, color, idle, height }) {
  const style = useAnimatedStyle(() => {
    // t 가 흐르며 왼쪽 칸부터 차례로 켜진다
    const lit = Math.max(0, Math.min(1, t.value * total - index));
    return { opacity: lit };
  });

  return (
    <View style={[styles.cell, { height, borderRadius: height / 2, backgroundColor: idle }]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { borderRadius: height / 2, backgroundColor: color }, style]}
      />
    </View>
  );
}

export default function SegmentBar({
  total = 0,
  filled = 0,
  height = 10,
  onHero = false,
  fillColor,
  trackColor,
  delay = 240,
  style,
}) {
  const tc = useThemeColors();
  const m = useMotion();

  const cFill = fillColor ?? (onHero ? tc.accentLight : tc.progressFill);
  const cTrack = trackColor ?? (onHero ? tc.heroTrack : tc.progressBg);

  const count = Math.max(0, Math.floor(total));
  const safeFilled = Math.max(0, Math.min(count, Math.floor(filled)));
  const ratio = count > 0 ? safeFilled / count : 0;

  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      m.dur(delay),
      withTiming(ratio, {
        duration: m.dur(motion.duration.fill),
        easing: Easing.bezier(...motion.bezier.emphasis),
      })
    );
  }, [ratio, delay, m, t]);

  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: t.value }] }));
  const cells = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  if (count === 0) return null;

  // 너무 잘게 쪼개지면 세는 의미가 없다 — 연속 바로 떨어진다 (scaleX, §4)
  if (count > MAX_CELLS) {
    return (
      <View
        style={[{ height, borderRadius: height / 2, backgroundColor: cTrack, overflow: 'hidden' }, style]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: height / 2, backgroundColor: cFill, transformOrigin: 'left' },
            barStyle,
          ]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.row, style]}>
      {cells.map((i) => (
        <Cell key={i} t={t} index={i} total={count} color={cFill} idle={cTrack} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
  cell: { flex: 1, overflow: 'hidden', borderRadius: r.pill },
});
