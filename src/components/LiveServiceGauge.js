import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

/**
 * 실시간 복무 진행률 게이지 — 살아 움직이는 연출.
 *  - 마운트 시 0 → 현재 진행률까지 차오르는 그로우인
 *  - 흐르는 사선 스트라이프(차징 느낌) + 빛 스윕(shimmer)
 *  - 채워지는 끝단의 글로우 펄스(지금 이 순간 차오르는 지점)
 *  - 소수점 7자리까지 매초 갱신되는 라이브 퍼센트
 *  - 복무 누적 라이브 시계(일 + HH:MM:SS)
 *
 * 메인 카드(어두운 배경) 위에 올라가므로 기본 색은 밝은 톤(흰색 계열 + 금색).
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

/* 흐르는 사선 스트라이프 */
const STRIPE_W = 9;
const STRIPE_GAP = 15;
const STRIPE_PERIOD = STRIPE_W + STRIPE_GAP;

export default function LiveServiceGauge({
  enlistDate,
  dischargeDate,
  fillColor = '#F5C842',
  trackColor = 'rgba(255,255,255,0.16)',
  textColor = 'rgba(255,255,255,0.95)',
  subColor = 'rgba(255,255,255,0.6)',
}) {
  const [{ pct, servedSec }, setLive] = useState(() => calcLive(enlistDate, dischargeDate));
  const [trackW, setTrackW] = useState(0);
  const done = pct >= 100;

  const fillAnim = useRef(new Animated.Value(0)).current; // 0..1 (그로우인 + 라이브)
  const shimmer  = useRef(new Animated.Value(0)).current;
  const stripe   = useRef(new Animated.Value(0)).current;
  const edge     = useRef(new Animated.Value(0)).current; // 끝단 글로우 펄스
  const dot      = useRef(new Animated.Value(1)).current;

  // 매초 진행률/초 갱신
  useEffect(() => {
    setLive(calcLive(enlistDate, dischargeDate));
    const id = setInterval(() => setLive(calcLive(enlistDate, dischargeDate)), 1000);
    return () => clearInterval(id);
  }, [enlistDate, dischargeDate]);

  // 진행률 변화 → 바 채우기 (마운트 시 0에서 그로우인, 이후 매초 미세 갱신)
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: pct / 100,
      duration: 1100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, fillAnim]);

  // 빛 스윕
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.delay(500),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  // 흐르는 사선 스트라이프
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(stripe, {
        toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [stripe]);

  // 끝단 글로우 펄스
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(edge, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(edge, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [edge]);

  // 라이브 점 펄스
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, { toValue: 0.2, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(dot, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [dot]);

  const onTrackLayout = useCallback((e) => setTrackW(e.nativeEvent.layout.width), []);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const BAND = 64;
  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-BAND, Math.max(trackW, BAND)],
  });
  const stripeX = stripe.interpolate({
    inputRange: [0, 1],
    outputRange: [0, STRIPE_PERIOD],
  });
  const edgeOpacity = edge.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.95] });

  // 스트라이프 바 개수 (트랙 너비 + 한 주기 여유)
  const stripeCount = trackW > 0 ? Math.ceil((trackW + STRIPE_PERIOD) / STRIPE_PERIOD) + 1 : 0;

  const clock = fmtClock(servedSec);
  const pctStr = pct.toFixed(7);
  const [intPart, decPart] = pctStr.split('.');

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={styles.liveRow}>
          <Animated.View style={[styles.dot, { backgroundColor: fillColor, opacity: dot }]} />
          <Text style={[styles.liveLabel, { color: subColor }]}>
            {done ? '복무 완료' : '실시간 진행률'}
          </Text>
        </View>
        <Text style={[styles.pct, { color: textColor }]}>
          {intPart}
          <Text style={[styles.pctDec, { color: subColor }]}>.{decPart}</Text>
          <Text style={[styles.pctUnit, { color: subColor }]}> %</Text>
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: trackColor }]} onLayout={onTrackLayout}>
        <Animated.View style={[styles.fill, { width: fillWidth, backgroundColor: fillColor }]}>
          {/* 흐르는 사선 스트라이프 */}
          {stripeCount > 0 && (
            <Animated.View
              style={[
                styles.stripeLayer,
                { width: trackW + STRIPE_PERIOD * 2, transform: [{ translateX: stripeX }] },
              ]}
            >
              {Array.from({ length: stripeCount }, (_, i) => (
                <View key={i} style={[styles.stripe, { left: i * STRIPE_PERIOD - STRIPE_PERIOD }]} />
              ))}
            </Animated.View>
          )}

          {/* 빛 스윕 */}
          <Animated.View
            style={[styles.shimmer, { width: BAND, transform: [{ translateX: shimmerX }] }]}
          />

          {/* 채워지는 끝단 글로우 (지금 차오르는 지점) */}
          {!done && (
            <Animated.View style={[styles.edge, { opacity: edgeOpacity }]} />
          )}
        </Animated.View>
      </View>

      <Text style={[styles.sub, { color: subColor }]}>
        {done
          ? '🎉 전역! 복무를 마쳤습니다'
          : `복무 ${clock.days.toLocaleString()}일  ${clock.hms} 흐르는 중`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  liveLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  pct: { fontSize: 22, fontWeight: '900', letterSpacing: 0.2, fontVariant: ['tabular-nums'] },
  pctDec: { fontSize: 15, fontWeight: '800' },
  pctUnit: { fontSize: 12, fontWeight: '700' },

  track: { height: 16, borderRadius: 9, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 9, overflow: 'hidden', minWidth: 9 },

  stripeLayer: { position: 'absolute', top: -4, bottom: -4, left: 0, flexDirection: 'row' },
  stripe: {
    position: 'absolute', top: 0, bottom: 0,
    width: STRIPE_W,
    backgroundColor: 'rgba(255,255,255,0.18)',
    transform: [{ skewX: '-22deg' }],
  },

  shimmer: {
    position: 'absolute', top: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },

  edge: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: 22,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopRightRadius: 9, borderBottomRightRadius: 9,
  },

  sub: { fontSize: 12.5, fontWeight: '700', marginTop: 9, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
