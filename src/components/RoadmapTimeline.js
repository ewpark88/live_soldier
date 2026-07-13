import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInLeft,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import { motion, radius as r, space as sp, tabular, type as ty } from '../theme/tokens';
import { useMotion } from '../hooks/useMotion';
import { formatDateKo } from '../utils/dateUtils';
import { nextMilestoneKey } from '../utils/roadmapUtils';
import Chip from './ui/Chip';

/**
 * 전역 로드맵 세로 타임라인.
 *
 * 레일이 스스로 그려진다 — 각 행이 왼쪽에서 밀려 들어오고, 노드를 잇는 선이
 * 위에서 아래로 자라난다(scaleY + transformOrigin:'top'). 줄당 임팩트가
 * 이 앱에서 제일 큰 애니메이션이다.
 *
 * 다음 마일스톤 노드에는 펄스 링이 돈다. 링은 노드 안(overflow:'hidden')에
 * 갇혀 있어서 바깥 텍스트를 침범할 수 없다.
 */
function Connector({ done, delay, color }) {
  const m = useMotion();
  const grow = useSharedValue(m.reduced ? 1 : 0);

  useEffect(() => {
    if (m.reduced) { grow.value = 1; return; }
    grow.value = withDelay(
      delay,
      withTiming(1, {
        duration: motion.duration.slow,
        easing: Easing.bezier(...motion.bezier.standard),
      })
    );
  }, [m.reduced, delay]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.value }] }));

  return (
    <Animated.View
      style={[s.line, { backgroundColor: color }, style]}
    />
  );
}

function PulseRing({ color }) {
  const m = useMotion();
  const p = useSharedValue(0);

  useEffect(() => {
    if (m.reduced) return;
    p.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
  }, [m.reduced]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + p.value * 0.25 }],
    opacity: 0.5 * (1 - p.value),
  }));

  if (m.reduced) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[s.ring, { borderColor: color }, style]}
    />
  );
}

export default function RoadmapTimeline({ roadmap }) {
  const tc = useThemeColors();
  const m = useMotion();
  const styles = useMemo(() => makeStyles(tc), [tc]);

  if (!roadmap || roadmap.length === 0) return null;

  const nextKey = nextMilestoneKey(roadmap);

  return (
    <View>
      {roadmap.map((item, i) => {
        const isNext = item.key === nextKey;
        const last = i === roadmap.length - 1;

        const nodeBg = item.done ? tc.primary : isNext ? tc.accent : tc.surfaceSunken;
        const nodeFg = item.done ? tc.onPrimary : isNext ? tc.onGold : tc.textLight;
        const lineColor = item.done ? tc.primary : tc.border;

        return (
          <Animated.View
            key={item.key}
            entering={m.enter(FadeInLeft, i, motion.duration.base)}
            style={s.row}
          >
            <View style={s.railCol}>
              <View style={[s.node, { backgroundColor: nodeBg }]}>
                {isNext ? <PulseRing color={tc.accent} /> : null}
                <Ionicons name={item.icon || 'ellipse'} size={16} color={nodeFg} />
              </View>
              {!last ? (
                <Connector
                  done={item.done}
                  color={lineColor}
                  delay={m.stagger(i) + 120}
                />
              ) : null}
            </View>

            <View style={[s.content, last && { paddingBottom: 0 }]}>
              <View style={s.titleRow}>
                <Text
                  style={[styles.label, item.done && { color: tc.textSecondary }]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>

                {isNext ? (
                  <Chip label={`D-${item.dday}`} size="sm" tone="accent" />
                ) : item.done ? (
                  <Text style={styles.done}>완료</Text>
                ) : (
                  <Text style={styles.dday}>D-{item.dday}</Text>
                )}
              </View>
              <Text style={styles.date}>{formatDateKo(item.date)}</Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const NODE = 34;

const s = StyleSheet.create({
  row: { flexDirection: 'row' },
  railCol: { width: 44, alignItems: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // 펄스 링이 노드를 벗어나 옆 텍스트를 덮지 않도록 가둔다
    overflow: 'hidden',
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: NODE / 2,
    borderWidth: 2,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 20,
    marginVertical: 3,
    borderRadius: r.pill,
    transformOrigin: 'top',
  },
  content: { flex: 1, paddingBottom: sp.xl, paddingTop: sp.xs, paddingLeft: sp.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
});

const makeStyles = (tc) =>
  StyleSheet.create({
    label: { ...ty.body, fontWeight: '700', color: tc.text, flex: 1 },
    date: { ...ty.caption, color: tc.textSecondary, marginTop: 1 },
    dday: { ...ty.label, ...tabular, color: tc.textLight },
    done: { ...ty.caption, color: tc.primary, fontWeight: '700' },
  });
