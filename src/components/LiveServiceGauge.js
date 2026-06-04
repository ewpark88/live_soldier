import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

/**
 * 실시간 복무 진행률 게이지 — 초 단위로 차오르는 연출.
 *  - 소수점 깊은 자리까지 매초 갱신되는 퍼센트
 *  - 채워지는 듯한 shimmer(빛 흐름) 애니메이션
 *  - 복무 누적 초 카운터 + 라이브 점(●) 펄스
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

export default function LiveServiceGauge({
  enlistDate,
  dischargeDate,
  fillColor = '#F5C842',
  trackColor = 'rgba(255,255,255,0.18)',
  textColor = 'rgba(255,255,255,0.92)',
  subColor = 'rgba(255,255,255,0.6)',
}) {
  const [{ pct, servedSec }, setLive] = useState(() => calcLive(enlistDate, dischargeDate));
  const [trackW, setTrackW] = useState(0);

  const shimmer = useRef(new Animated.Value(0)).current;
  const dot = useRef(new Animated.Value(1)).current;

  // 매초 진행률/초 갱신
  useEffect(() => {
    setLive(calcLive(enlistDate, dischargeDate));
    const id = setInterval(() => setLive(calcLive(enlistDate, dischargeDate)), 1000);
    return () => clearInterval(id);
  }, [enlistDate, dischargeDate]);

  // shimmer 루프 (채워지는 듯한 빛 흐름)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  // 라이브 점 펄스
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot, { toValue: 0.25, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(dot, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [dot]);

  const onTrackLayout = useCallback((e) => setTrackW(e.nativeEvent.layout.width), []);

  const fillW = (trackW * pct) / 100;
  const BAND = 56;
  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-BAND, Math.max(trackW, BAND)],
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={styles.liveRow}>
          <Animated.View style={[styles.dot, { backgroundColor: fillColor, opacity: dot }]} />
          <Text style={[styles.liveLabel, { color: subColor }]}>실시간 진행률</Text>
        </View>
        <Text style={[styles.pct, { color: textColor }]}>
          {pct.toFixed(7)}<Text style={[styles.pctUnit, { color: subColor }]}> %</Text>
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: trackColor }]} onLayout={onTrackLayout}>
        <View style={[styles.fill, { width: fillW, backgroundColor: fillColor }]}>
          {/* 채워지는 빛 흐름 */}
          <Animated.View
            style={[
              styles.shimmer,
              { width: BAND, transform: [{ translateX: shimmerX }] },
            ]}
          />
        </View>
      </View>

      <Text style={[styles.sub, { color: subColor }]}>
        복무 {servedSec.toLocaleString()}초째 흐르는 중
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 14 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 7 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  liveLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  pct: { fontSize: 17, fontWeight: '900', letterSpacing: 0.3, fontVariant: ['tabular-nums'] },
  pctUnit: { fontSize: 12, fontWeight: '700' },
  track: { height: 12, borderRadius: 7, overflow: 'hidden' },
  fill: {
    height: '100%', borderRadius: 7, overflow: 'hidden',
    minWidth: 7,
  },
  shimmer: {
    position: 'absolute', top: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  sub: { fontSize: 12, fontWeight: '600', marginTop: 7, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
