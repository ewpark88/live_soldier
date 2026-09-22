import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Txt from './ui/Txt';
import { useThemeColors } from '../theme/ThemeContext';
import { useMotion } from '../hooks/useMotion';
import { motion, radius as r, space as sp } from '../theme/tokens';

/**
 * 복무 여정 레일 — 입대에서 전역까지를 한 줄로.
 *
 * 마일스톤을 **날짜 비례**로 놓는다. 등간격으로 놓으면 "일병 진급까지 두 달,
 * 그 다음 여섯 달"이라는 실제 리듬이 사라져서 여정처럼 읽히지 않는다.
 *
 * 지나온 구간은 채워지고, 현재 위치에 병사 마커가 선다. 마커가 있어야
 * "내가 어디쯤 왔는가"가 한눈에 들어온다 — 퍼센트 숫자만으로는 안 된다.
 *
 * 데이터는 `roadmapUtils.buildRoadmap` 결과를 그대로 받는다. 이 컴포넌트는
 * 날짜를 새로 계산하지 않는다 (계산식이 또 한 벌 생기는 걸 막는다).
 *
 * 채움은 `scaleX` + `transformOrigin:'left'` 다 — `width:'%'` 애니메이션 금지(§4).
 *
 * @param milestones buildRoadmap 결과 (2개 이상)
 * @param progress   0..1 — 오늘 위치. 채움과 마커가 같은 값을 쓴다.
 * @param compact    라벨 없이 레일만 (홈 카드용)
 * @param onHero     히어로 표면 위에 얹을 때 (색이 반전된다)
 * @param fillColor  onHero 에서 채움/노드 색 (단계별 accent)
 * @param delay      진입 지연(ms)
 */
const NODE = 10;
const NODE_NEXT = 14;
const MARKER = 26;

export default function JourneyRail({
  milestones = [],
  progress = 0,
  compact = false,
  onHero = false,
  fillColor,
  delay = 260,
  style,
}) {
  const tc = useThemeColors();
  const m = useMotion();
  const s = useMemo(() => makeStyles(tc), [tc]);

  /* 히어로 위에서는 카드 색을 쓸 수 없다 — 히어로 토큰으로 갈아탄다.
     (히어로 위 요소가 전부 이 토큰만 쓰기 때문에 테마·스킴이 알아서 따라온다) */
  const cFill = onHero ? (fillColor ?? tc.accentLight) : tc.progressFill;
  const cTrack = onHero ? tc.heroTrack : tc.progressBg;
  const cNodeIdle = onHero ? tc.heroSheen : tc.card;
  const cNodeBorder = onHero ? tc.heroTrack : tc.border;

  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e) => setWidth(e.nativeEvent.layout.width), []);

  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  /* 날짜 → 0..1 위치. 첫/마지막 마일스톤이 양 끝을 잡는다. */
  const points = useMemo(() => {
    const valid = milestones.filter((x) => x?.date instanceof Date && !isNaN(x.date.getTime()));
    if (valid.length < 2) return [];
    const first = valid[0].date.getTime();
    const last = valid[valid.length - 1].date.getTime();
    const span = last - first;
    if (span <= 0) return [];
    const nextKey = valid.find((x) => !x.done)?.key ?? null;
    return valid.map((x) => ({
      key: x.key,
      label: x.label,
      icon: x.icon,
      done: x.done,
      isNext: x.key === nextKey,
      t: (x.date.getTime() - first) / span,
    }));
  }, [milestones]);

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(
      m.dur(delay),
      withTiming(clamped, {
        duration: m.dur(motion.duration.fill),
        easing: Easing.bezier(...motion.bezier.emphasis),
      })
    );
  }, [clamped, delay, m, fill]);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));
  const markerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fill.value * width - MARKER / 2 }],
  }));

  if (points.length < 2) return null;

  const railTop = compact ? 0 : sp.xs;

  return (
    <View style={style}>
      <View style={[s.rail, { marginTop: railTop }]} onLayout={onLayout}>
        <View style={[s.track, { backgroundColor: cTrack }]} />
        <Animated.View style={[s.fill, { backgroundColor: cFill }, fillStyle]} />

        {width > 0
          ? points.map((p) => {
            const size = p.isNext ? NODE_NEXT : NODE;
            return (
              <View
                key={p.key}
                pointerEvents="none"
                style={[
                  s.node,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    left: p.t * width - size / 2,
                    top: -(size - 4) / 2,
                    backgroundColor: p.done ? cFill : cNodeIdle,
                    borderColor: p.isNext ? cFill : p.done ? cFill : cNodeBorder,
                  },
                ]}
              />
            );
          })
          : null}

        {/* 히어로 위에서는 마커를 아이콘 없는 원으로 둔다 — 히어로 표면 위
            아이콘 색은 대비 검증 페어에 없어서 테마마다 안전을 보장할 수 없다. */}
        {width > 0 ? (
          <Animated.View
            style={[
              s.marker,
              onHero
                ? { backgroundColor: cFill, borderColor: tc.heroSheen }
                : { backgroundColor: tc.primary, borderColor: tc.card },
              markerStyle,
            ]}
            pointerEvents="none"
          >
            {onHero ? null : <Ionicons name="walk" size={15} color={tc.onPrimary} />}
          </Animated.View>
        ) : null}
      </View>

      {!compact ? (
        <View style={s.ends}>
          <Txt role="micro" tone={onHero ? 'heroMuted' : 'secondary'}>{points[0].label}</Txt>
          <Txt role="micro" tone={onHero ? 'heroMuted' : 'secondary'}>
            {points[points.length - 1].label}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    rail: { height: 4, justifyContent: 'center' },
    track: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: r.pill,
    },
    fill: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: r.pill,
      transformOrigin: 'left',
    },
    node: {
      position: 'absolute',
      borderWidth: 2,
    },
    marker: {
      position: 'absolute',
      left: 0,
      top: -(MARKER - 4) / 2,
      width: MARKER,
      height: MARKER,
      borderRadius: MARKER / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    ends: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: sp.md,
    },
  });
