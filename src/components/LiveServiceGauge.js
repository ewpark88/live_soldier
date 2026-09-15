import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useMotion } from '../hooks/useMotion';
import { useThemeColors } from '../theme/ThemeContext';
import { motion } from '../theme/tokens';

/**
 * 실시간 복무 진행률 게이지 — 이 앱의 간판 컴포넌트.
 *
 *  - 마운트 시 0 → 현재 진행률까지 차오르는 그로우인
 *  - 빛 스윕(shimmer) + 채워지는 끝단의 글로우 펄스
 *  - 소수점 7자리까지 매초 갱신되는 라이브 퍼센트 (진짜 차별점이라 유지)
 *  - 복무 누적 라이브 시계 (일 + HH:MM:SS)
 *
 * 예전 대비 바뀐 점:
 *  1) 코어 Animated → Reanimated. 채움을 width:'%' 가 아니라 scaleX 로 준다.
 *     퍼센트 폭은 프레임마다 레이아웃 패스를 강제해서 JS 스레드에서 돌 수밖에
 *     없었다 (useNativeDriver:false). 이제 전부 UI 스레드에서 돈다.
 *  2) 무한 루프 4개 → 2개. 사선 줄무늬(skewX 바 N개)는 버렸다 — 오버드로가
 *     큰데 대부분 노이즈로 읽혔다.
 *  3) setInterval 을 포커스에 묶었다. 예전엔 다른 탭에 가 있어도 계속 돌았다.
 *
 * 어두운 히어로 위에 올라가므로 기본 색은 밝은 톤(흰색 계열 + 금색).
 */
function calcLive(enlistDate, dischargeDate) {
  const start = new Date(enlistDate); start.setHours(0, 0, 0, 0);
  const end = new Date(dischargeDate); end.setHours(0, 0, 0, 0);
  const s = start.getTime();
  const e = end.getTime();
  const now = Date.now();
  const total = e - s;
  const elapsed = now - s;
  const servedSec = Math.max(0, Math.floor(elapsed / 1000));
  let pct = total > 0 ? (elapsed / total) * 100 : 100;
  pct = Math.min(100, Math.max(0, pct));
  return { pct, servedSec };
}

function fmtClock(sec) {
  const days = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return { days, hms: `${pad(h)}:${pad(m)}:${pad(s)}` };
}

const BAND = 64;

export default function LiveServiceGauge({
  enlistDate,
  dischargeDate,
  fillColor,
  trackColor,
  textColor,
  subColor,
}) {
  const tc = useThemeColors();
  const m = useMotion();
  const isFocused = useIsFocused();

  // 색 기본값은 테마가 준다. 예전엔 여기에 hex 가 박혀 있어서 테마를 바꿔도
  // 게이지만 옛 골드로 남았다.
  const cFill = fillColor ?? tc.accentLight;
  const cTrack = trackColor ?? tc.heroTrack;
  const cText = textColor ?? tc.heroText;
  const cSub = subColor ?? tc.heroTextMuted;
  const cShimmer = tc.gaugeShimmer;   // 게이지 광택 (표면 틴트가 아니라 빛 반사)
  const cEdge = tc.gaugeEdge;         // 진행 선단 하이라이트

  const [{ pct, servedSec }, setLive] = useState(() => calcLive(enlistDate, dischargeDate));
  const [trackW, setTrackW] = useState(0);
  const done = pct >= 100;

  const fill = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const edge = useSharedValue(0);
  const dot = useSharedValue(1);

  // 매초 갱신 — 화면이 보일 때만. 다른 탭에서까지 돌 이유가 없다.
  useEffect(() => {
    if (!isFocused) return undefined;
    setLive(calcLive(enlistDate, dischargeDate));
    const id = setInterval(() => setLive(calcLive(enlistDate, dischargeDate)), 1000);
    return () => clearInterval(id);
  }, [enlistDate, dischargeDate, isFocused]);

  // 진행률 → 채움 (마운트 시 그로우인, 이후 매초 미세 갱신)
  useEffect(() => {
    fill.value = withTiming(pct / 100, {
      duration: m.dur(motion.duration.fill),
      easing: Easing.bezier(...motion.bezier.emphasis),
    });
  }, [pct, m.reduced]);

  // 루프 2개 — 둘 다 UI 스레드, 포커스 아닐 땐 안 돈다
  useEffect(() => {
    if (m.reduced || !isFocused || done) return;

    shimmer.value = withDelay(
      500,
      withRepeat(withTiming(1, { duration: 1500, easing: Easing.linear }), -1, false)
    );
    edge.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 850, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    dot.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 650 }),
        withTiming(1, { duration: 650 })
      ),
      -1,
      false
    );
  }, [m.reduced, isFocused, done]);

  const onTrackLayout = useCallback((e) => setTrackW(e.nativeEvent.layout.width), []);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -BAND + shimmer.value * (Math.max(trackW, BAND) + BAND) },
    ],
  }));

  // 끝단 글로우는 채움과 별도로 둔다 — fill 안에 넣으면 scaleX 에 같이 늘어나 뭉개진다
  const edgeStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + edge.value * 0.7,
    transform: [{ translateX: trackW * fill.value - 11 }],
  }));

  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value }));

  const clock = fmtClock(servedSec);
  const [intPart, decPart] = pct.toFixed(7).split('.');

  return (
    <View>
      <View style={styles.headRow}>
        <View style={styles.liveRow}>
          <Animated.View style={[styles.dot, { backgroundColor: cFill }, dotStyle]} />
          <Text style={[styles.liveLabel, { color: cSub }]}>
            {done ? '복무 완료' : '실시간 진행률'}
          </Text>
        </View>
        <Text style={[styles.pct, { color: cText }]}>
          {intPart}
          <Text style={[styles.pctDec, { color: cSub }]}>.{decPart}</Text>
          <Text style={[styles.pctUnit, { color: cSub }]}> %</Text>
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: cTrack }]} onLayout={onTrackLayout}>
        <Animated.View style={[styles.fill, { backgroundColor: cFill }, fillStyle]}>
          <Animated.View style={[styles.shimmer, { width: BAND, backgroundColor: cShimmer }, shimmerStyle]} />
        </Animated.View>

        {!done && trackW > 0 ? (
          <Animated.View style={[styles.edge, { backgroundColor: cEdge }, edgeStyle]} pointerEvents="none" />
        ) : null}
      </View>

      <Text style={[styles.sub, { color: cSub }]}>
        {done
          ? '전역! 복무를 마쳤습니다'
          : `복무 ${clock.days.toLocaleString()}일  ${clock.hms} 흐르는 중`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 5,
  },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  liveLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.2 },
  pct: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  pctDec: { fontSize: 13, fontWeight: '800' },
  pctUnit: { fontSize: 11, fontWeight: '700' },

  track: { height: 12, borderRadius: 7, overflow: 'hidden' },
  fill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 7,
    overflow: 'hidden',
    transformOrigin: 'left',
  },

  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },

  edge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 22,
    borderRadius: 7,
  },

  sub: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
