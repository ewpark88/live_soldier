import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import CircularGauge from './CircularGauge';
import { calcLiveProgress, parseDate } from '../utils/dateUtils';
import { useMotion } from '../hooks/useMotion';
import { useThemeColors } from '../theme/ThemeContext';
import { space as sp } from '../theme/tokens';

/**
 * 실시간 복무 진행률 게이지 — 이 앱의 간판.
 *
 * v1.2 에서 가로 바를 **원형 링**으로 바꿨다. 이유는 위계다. 가로 바는 히어로
 * 아래쪽에 깔린 장식이라 D-Day 와 진행률이 서로 다른 것을 보고 있었다. 링이
 * 되면서 D-Day 숫자가 링 **가운데**로 들어가고, "얼마나 왔는지"와 "얼마나
 * 남았는지"가 한 덩어리로 읽힌다.
 *
 * 남긴 것:
 *  - 소수점 7자리까지 매초 갱신되는 라이브 퍼센트 (진짜 차별점)
 *  - 복무 누적 라이브 시계 (일 + HH:MM:SS)
 *  - `useIsFocused()` 게이팅 — 다른 탭에서는 setInterval 도 루프도 멈춘다
 *
 * 버린 것 (무한 루프 예산 §4):
 *  - shimmer 스윕, 끝단 글로우 — 링에서는 선단 점 하나가 같은 일을 더 잘한다.
 *    루프 3개 → 1개(`CircularGauge live`)로 줄었고, 그 예산으로 히어로 배경의
 *    시간대 광원을 얻었다.
 *
 * 진행률 계산은 `dateUtils.calcLiveProgress` 하나로 모았다. 예전에는 이 파일이
 * 자기만의 ms 비율을 갖고 있었고 주석이 `calcProgress` 와의 불일치를 인정했다.
 */
function servedSeconds(enlistDate) {
  const start = parseDate(enlistDate);
  if (!start) return 0;
  return Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000));
}

function fmtClock(sec) {
  const days = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return { days, hms: `${pad(h)}:${pad(m)}:${pad(s)}` };
}

const read = (enlistDate, dischargeDate) => ({
  pct: calcLiveProgress(enlistDate, dischargeDate),
  servedSec: servedSeconds(enlistDate),
});

export default function LiveServiceGauge({
  enlistDate,
  dischargeDate,
  fillColor,
  trackColor,
  textColor,
  subColor,
  size = 240,
  stroke = 14,
  glow = false,
  children,
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

  const [{ pct, servedSec }, setLive] = useState(() => read(enlistDate, dischargeDate));
  const done = pct >= 100;

  // 매초 갱신 — 화면이 보일 때만. 다른 탭에서까지 돌 이유가 없다.
  useEffect(() => {
    if (!isFocused) return undefined;
    setLive(read(enlistDate, dischargeDate));
    const id = setInterval(() => setLive(read(enlistDate, dischargeDate)), 1000);
    return () => clearInterval(id);
  }, [enlistDate, dischargeDate, isFocused]);

  /* LIVE 점멸. 링의 선단 맥박과 별개의 루프를 또 만들지 않도록, 전역했거나
     포커스를 잃으면 확실히 '정지'시킨다 (재시작만 막으면 계속 돈다). */
  const blink = useSharedValue(1);
  useEffect(() => {
    if (m.reduced || !isFocused || done) {
      cancelAnimation(blink);
      blink.value = 1;
      return undefined;
    }
    blink.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
    return () => {
      cancelAnimation(blink);
      blink.value = 1;
    };
  }, [m.reduced, isFocused, done, blink]);

  const blinkStyle = useAnimatedStyle(() => ({ opacity: blink.value }));

  const clock = fmtClock(servedSec);
  const [intPart, decPart] = pct.toFixed(7).split('.');
  const s = styles;   // 테마에 의존하지 않는 정적 스타일

  return (
    <View style={s.wrap}>
      <CircularGauge
        progress={pct / 100}
        size={size}
        stroke={stroke}
        trackColor={cTrack}
        fillColor={cFill}
        glow={glow}
        live={!done}
      >
        {children}

        <View style={s.pctRow}>
          <Text style={[s.pct, { color: cText }]} numberOfLines={1}>
            {intPart}
            <Text style={[s.pctDec, { color: cSub }]}>.{decPart}</Text>
            <Text style={[s.pctUnit, { color: cSub }]}>%</Text>
          </Text>
        </View>
      </CircularGauge>

      <View style={s.footRow}>
        <Animated.View style={[s.dot, { backgroundColor: cFill }, blinkStyle]} />
        <Text style={[s.sub, { color: cSub }]} numberOfLines={1}>
          {done
            ? '전역! 복무를 마쳤습니다'
            : `복무 ${clock.days.toLocaleString()}일  ${clock.hms} 흐르는 중`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },

  pctRow: { marginTop: 2 },
  pct: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  pctDec: { fontSize: 12, fontWeight: '800' },
  pctUnit: { fontSize: 11, fontWeight: '700' },

  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    marginTop: sp.sm,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  sub: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
