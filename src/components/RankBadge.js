/**
 * RankBadge — 계급별 차별화 뱃지
 * 이병(스틸) → 일병(브론즈) → 상병(군녹) → 병장(골드 글로우)
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

/* ─── 계급별 디자인 설정 ─────────────────────────────────── */
const RANK_CONFIG = {
  이병: {
    stripes: 1,  // 짝대기 1개
    topColor: '#607D8B',      // 스틸 블루-그레이
    stripeColor: '#90A4AE',
    bgColor: '#ECEFF1',
    borderColor: '#90A4AE',
    rankColor: '#37474F',
    topDecor: null,
    glowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 2,
    subtitle: 'PRIVATE',
  },
  일병: {
    stripes: 2,  // 짝대기 2개
    topColor: '#8B5E2F',      // 브론즈
    stripeColor: '#C49A6C',
    bgColor: '#FFF3E4',
    borderColor: '#C49A6C',
    rankColor: '#5D3A1A',
    topDecor: '✦',
    glowColor: '#C49A6C',
    shadowOpacity: 0.18,
    elevation: 4,
    subtitle: 'PFC',
  },
  상병: {
    stripes: 3,  // 짝대기 3개
    topColor: '#2E5B4F',      // 군녹(앱 테마)
    stripeColor: '#4A8C7C',
    bgColor: '#E0F2EF',
    borderColor: '#4A8C7C',
    rankColor: '#1A3B33',
    topDecor: '✦✦',
    glowColor: '#2E5B4F',
    shadowOpacity: 0.25,
    elevation: 6,
    subtitle: 'CORPORAL',
  },
  병장: {
    stripes: 4,  // 짝대기 4개
    topColor: '#C97D00',      // 딥 골드
    stripeColor: '#FFB300',
    bgColor: '#FFFDE7',
    borderColor: '#FFB300',
    rankColor: '#7A4800',
    topDecor: '★',
    glowColor: '#FFBB00',
    shadowOpacity: 0.45,
    elevation: 10,
    subtitle: 'SERGEANT',
  },
};

/* ─── 작대기 (가로 막대) ──────────────────────────────────── */
function Stripe({ color }) {
  return <View style={[s.stripeBar, { backgroundColor: color }]} />;
}

/* ─── 메인 뱃지 ───────────────────────────────────────────── */
export default function RankBadge({ rank }) {
  const cfg = RANK_CONFIG[rank] || RANK_CONFIG['이병'];

  // 계급 바뀔 때마다 스프링 팝-인 애니메이션
  const scaleAnim = useRef(new Animated.Value(0.75)).current;
  const opacAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    scaleAnim.setValue(0.75);
    opacAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [rank]);

  return (
    <Animated.View style={[
      s.outer,
      {
        opacity: opacAnim,
        transform: [{ scale: scaleAnim }],
        shadowColor: cfg.glowColor,
        shadowOpacity: cfg.shadowOpacity,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: cfg.elevation,
      },
    ]}>
      {/* 뱃지 테두리 */}
      <View style={[s.badge, {
        backgroundColor: cfg.bgColor,
        borderColor: cfg.borderColor,
      }]}>

        {/* 상단 컬러 바 */}
        <View style={[s.topBar, { backgroundColor: cfg.topColor }]} />

        {/* 줄무늬 영역 */}
        <View style={s.stripesWrap}>
          {Array.from({ length: cfg.stripes }).map((_, i) => (
            <Stripe key={i} color={cfg.stripeColor} />
          ))}
        </View>

        {/* 계급 이름 */}
        <Text style={[s.rankName, { color: cfg.topColor }]}>{rank}</Text>

      </View>
    </Animated.View>
  );
}

/* ─── 스타일 ─────────────────────────────────────────────── */
const BADGE_W = 62;

const s = StyleSheet.create({
  outer: {
    width: BADGE_W,
    borderRadius: 10,
  },
  badge: {
    width: BADGE_W,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 6,
  },

  /* 상단 컬러 포인트 바 */
  topBar: {
    width: '100%',
    height: 10,
    marginBottom: 6,
  },

  /* 작대기: 가로 막대를 세로로 쌓기 */
  stripesWrap: {
    flexDirection: 'column-reverse',
    alignItems: 'center',
    marginBottom: 5,
    gap: 3,
  },
  stripeBar: {
    width: 34,
    height: 4,
    borderRadius: 2,
  },

  /* 계급 이름 */
  rankName: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
