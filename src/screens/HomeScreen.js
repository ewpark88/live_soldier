import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import AdBanner from '../components/AdBanner';
import { AD_UNITS } from '../constants/adUnits';
import {
  loadMilitaryInfo, loadLeaveRecords, loadLeaveTotal,
  loadLeaveBonusRecords, loadRankPromotions,
} from '../utils/storage';
import AdInterstitial from '../components/AdInterstitial';
import useShowInterstitial from '../hooks/useShowInterstitial';
import {
  calcDaysLeft, calcProgress, calcServedDays,
  calcRank, calcRankFromPromotions, getRandomMessage, formatDateKo,
} from '../utils/dateUtils';

const BRANCH_LABEL = { army: '육군', navy: '해군', airforce: '공군', marines: '해병대' };

/* ─── 계급 이미지 (static require) ────────────────────────── */
const RANK_IMAGES = {
  '이병': require('../../assets/ranks/이병.png'),
  '일병': require('../../assets/ranks/일병.png'),
  '상병': require('../../assets/ranks/상병.png'),
  '병장': require('../../assets/ranks/병장.png'),
};

/* ─── 계급별 색상 (텍스트용) ───────────────────────────────── */
const RANK_COLOR = {
  '이병': '#78909C',
  '일병': '#9C6B3C',
  '상병': '#2E5B4F',
  '병장': '#C97D00',
};

/* ─── 복무 단계 (전역일까지 남은 날 기준) ──────────────────── */
function getPhase(daysLeft) {
  if (daysLeft <= 0)   return 'done';
  if (daysLeft <= 3)   return 'd3';
  if (daysLeft <= 7)   return 'd7';
  if (daysLeft <= 30)  return 'd30';
  if (daysLeft <= 100) return 'd100';
  return 'normal';
}

const PHASE_CFG = {
  done:  {
    cardBg: '#9A6D00', screenBg: '#FFFDE7', accent: '#FFD700', glow: true,
    milestone: { emoji: '🎆', text: '드디어 전역이다!!', bg: '#C97D00', tc: '#fff' },
    particles: ['🎆','🎊','🎉','🥳','🎖️','⭐'],
  },
  d3:    {
    cardBg: '#7B5500', screenBg: '#FFFDE7', accent: '#FFD700', glow: true,
    milestone: { emoji: '🎖️', text: '전역 3일 전!! 거의 다 왔다!', bg: '#B8860B', tc: '#fff' },
    particles: ['🎖️','✨','⭐','🔥','🎊'],
  },
  d7:    {
    cardBg: '#6B4700', screenBg: '#FFF8EC', accent: '#F5E570', glow: true,
    milestone: { emoji: '🏆', text: '전역까지 일주일!', bg: '#8B5E00', tc: '#fff' },
    particles: [],
  },
  d30:   {
    cardBg: '#5B3D1A', screenBg: '#FFF5E8', accent: '#F5C842', glow: false,
    milestone: { emoji: '🔥', text: '전역 한 달 전! 조금만 더!', bg: '#8B5E2F', tc: '#fff' },
    particles: [],
  },
  d100:  {
    cardBg: '#3A5A40', screenBg: '#F4F8F5', accent: '#F5C842', glow: false,
    milestone: { emoji: '💪', text: '전역 100일 전! 보인다!', bg: '#4A7A55', tc: '#fff' },
    particles: [],
  },
  normal: {
    cardBg: '#2E5B4F', screenBg: COLORS.background, accent: '#F5C842', glow: false,
    milestone: null,
    particles: [],
  },
};

/* ─── 떠오르는 파티클 (D-3 이내) ───────────────────────────── */
const PARTICLE_COUNT = 6;
function FloatingParticles({ emojis }) {
  const anims = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      y:     new Animated.Value(0),
      op:    new Animated.Value(0),
      left:  6 + i * 15,
      emoji: emojis[i % emojis.length],
      delay: i * 280,
    }))
  ).current;

  useEffect(() => {
    const loops = anims.map(({ y, op, delay }) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(y,  { toValue: -240, duration: 2800, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(op, { toValue: 1,   duration: 350,  useNativeDriver: true }),
              Animated.delay(1800),
              Animated.timing(op, { toValue: 0,   duration: 400,  useNativeDriver: true }),
            ]),
          ]),
          Animated.timing(y,  { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map(({ y, op, left, emoji }, i) => (
        <Animated.Text
          key={i}
          style={{ position: 'absolute', bottom: 6, left: `${left}%`, fontSize: 22, opacity: op, transform: [{ translateY: y }] }}
        >
          {emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

/* ─── 마일스톤 배너 ─────────────────────────────────────────── */
function MilestoneBanner({ cfg }) {
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 110, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[mb.wrap, { backgroundColor: cfg.bg, transform: [{ scale: scaleAnim }] }]}>
      <Text style={mb.emoji}>{cfg.emoji}</Text>
      <Text style={[mb.text, { color: cfg.tc }]}>{cfg.text}</Text>
    </Animated.View>
  );
}
const mb = StyleSheet.create({
  wrap:  { marginHorizontal: 16, marginTop: 10, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 22 },
  text:  { fontSize: 15, fontWeight: '800', flex: 1 },
});

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [info,       setInfo]       = useState(null);
  const [leaveUsed,  setLeaveUsed]  = useState(0);
  const [leaveTotal, setLeaveTotal] = useState(21);
  const [promotions, setPromotions] = useState(null);
  const [message,    setMessage]    = useState(getRandomMessage());
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const sessionShown = useRef(false); // 세션 당 1회만 시도
  const { adVisible, show: showAd, handleClose: closeAd } = useShowInterstitial();

  useFocusEffect(useCallback(() => {
    loadData();
    setMessage(getRandomMessage());
    // 앱 실행 후 첫 홈 진입 시 하루 1회 광고 (빈도 제한은 adManager가 관리)
    if (!sessionShown.current) {
      sessionShown.current = true;
      setTimeout(() => showAd(), 2000); // 화면 로딩 후 2초 뒤
    }
  }, []));

  const loadData = async () => {
    const mi        = await loadMilitaryInfo();
    setInfo(mi);
    const records   = await loadLeaveRecords();
    setLeaveUsed(records.reduce((s, r) => s + (r.days || 0), 0));
    const base      = await loadLeaveTotal();
    const bonus     = await loadLeaveBonusRecords();
    const bonusDays = bonus.reduce((s, r) => s + (r.days || 0), 0);
    setLeaveTotal(base + bonusDays);
    const promo     = await loadRankPromotions(mi?.enlistDate);
    setPromotions(promo);
  };

  const startPulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 300, useNativeDriver: true }),
    ]).start();
  };

  /* ── 미입력 상태 ── */
  if (!info) {
    return (
      <View style={s.container}>
        <View style={s.emptyWrap}>
          <Text style={s.emptyEmoji}>🪖</Text>
          <Text style={s.emptyTitle}>환영합니다!</Text>
          <Text style={s.emptyText}>
            입대 정보를 입력하면{'\n'}전역까지 얼마나 남았는지 알 수 있어요.
          </Text>
          <TouchableOpacity style={s.setupBtn} onPress={() => navigation.navigate('discharge')}>
            <Text style={s.setupBtnText}>입대 정보 입력하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const daysLeft   = calcDaysLeft(info.dischargeDate);
  const progress   = calcProgress(info.enlistDate, info.dischargeDate);
  const servedDays = calcServedDays(info.enlistDate);
  const rank       = calcRankFromPromotions(promotions) ?? calcRank(servedDays);
  const leaveLeft  = leaveTotal - leaveUsed;
  const rankColor  = RANK_COLOR[rank] ?? COLORS.primary;
  const phase      = getPhase(daysLeft);
  const phaseCfg   = PHASE_CFG[phase];

  return (
    <View style={[s.container, { backgroundColor: phaseCfg.screenBg }]}>
      <AdInterstitial visible={adVisible} onClose={closeAd} />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 컴팩트 헤더 ── */}
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <View style={s.headerLeft}>
            <View style={s.titleRow}>
              <Image source={require('../../assets/icon.png')} style={s.appIcon} />
              <Text style={s.headerTitle}>전역까지</Text>
            </View>
            <Text style={s.headerSub}>{BRANCH_LABEL[info.branch]}</Text>
          </View>

          {/* 계급 태그 (이미지) */}
          <View style={s.rankImgWrap}>
            <Image
              source={RANK_IMAGES[rank]}
              style={s.rankImg}
              resizeMode="contain"
            />
            <Text style={[s.rankTagText, { color: rankColor }]}>{rank}</Text>
          </View>
        </View>

        {/* ── 마일스톤 배너 ── */}
        {phaseCfg.milestone && <MilestoneBanner cfg={phaseCfg.milestone} />}

        {/* ── D-Day 메인카드 (풀 와이드) ── */}
        <TouchableOpacity activeOpacity={0.88} onPress={startPulse}>
          <View style={[s.mainCard, { backgroundColor: phaseCfg.cardBg }]}>
            {phaseCfg.particles.length > 0 && <FloatingParticles emojis={phaseCfg.particles} />}
            <Text style={s.mainLabel}>전역까지</Text>
            <Animated.Text style={[
              s.dday,
              { transform: [{ scale: pulseAnim }], color: phaseCfg.accent },
              phaseCfg.glow && {
                textShadowColor: phaseCfg.accent,
                textShadowRadius: 18,
                textShadowOffset: { width: 0, height: 0 },
              },
            ]}>
              {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-Day!' : '전역 완료!'}
            </Animated.Text>
            <Text style={s.dischargeDate}>{formatDateKo(info.dischargeDate)}</Text>
            <View style={s.progressSection}>
              <Text style={s.progressLabel}>복무 진행률</Text>
              <ProgressBar
                progress={progress}
                trackColor="rgba(255,255,255,0.18)"
                fillColor="#F5C842"
                labelColor="rgba(255,255,255,0.8)"
              />
            </View>
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statValue}>{servedDays}</Text>
                <Text style={s.statLabel}>복무 일수</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statValue}>{daysLeft > 0 ? daysLeft : 0}</Text>
                <Text style={s.statLabel}>남은 일수</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: COLORS.accentLight }]}>{progress}%</Text>
                <Text style={s.statLabel}>진행률</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── 응원 메시지 카드 (풀 와이드) ── */}
        <View style={s.messageCard}>
          <Text style={s.messageEmoji}>💬</Text>
          <Text style={s.messageText}>{message}</Text>
          <TouchableOpacity onPress={() => setMessage(getRandomMessage())} style={s.refreshBtn}>
            <Text style={s.refreshText}>다른 메시지 보기 ↻</Text>
          </TouchableOpacity>
        </View>

        {/* ── 빠른 요약 ── */}
        <View style={[s.quickRow, s.padH]}>
          <Card style={s.quickCard}>
            <Text style={s.quickEmoji}>🏖️</Text>
            <Text style={s.quickValue}>{leaveLeft}일</Text>
            <Text style={s.quickLabel}>남은 휴가</Text>
          </Card>
          <Card style={s.quickCard}>
            <Text style={s.quickEmoji}>⚔️</Text>
            <Text style={s.quickValue}>{servedDays}일</Text>
            <Text style={s.quickLabel}>복무 일수</Text>
          </Card>
        </View>

        {/* ── 광고 ── */}
        <View style={s.padH}>
          <AdBanner unit={AD_UNITS.HOME_BOTTOM} style={{ marginBottom: 12 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  /* ScrollView: 가로 패딩 없음 → 카드 풀 와이드 */
  scroll: { paddingBottom: 24 },

  /* 헤더 영역만 가로 패딩 */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerLeft: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  appIcon: { width: 28, height: 28, borderRadius: 7 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  headerSub: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, marginTop: 2 },

  /* 계급 이미지 태그 */
  rankImgWrap: {
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
  },
  rankImg: {
    width: 64,
    height: 64,
  },
  rankTagText: {
    fontSize: 14,
    fontWeight: '800',
  },

  /* D-Day 메인카드 — 풀 와이드 */
  mainCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary,
  },
  mainLabel: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  dday: { fontSize: 72, fontWeight: '900', color: COLORS.white, letterSpacing: -2 },
  dischargeDate: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 20 },
  progressSection: { width: '100%', marginBottom: 20 },
  progressLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 18,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  /* 응원 메시지 — 풀 와이드 */
  messageCard: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card,
  },
  messageEmoji: { fontSize: 30, marginBottom: 10 },
  messageText: { fontSize: 16, color: COLORS.text, textAlign: 'center', lineHeight: 25, fontWeight: '500' },
  refreshBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: COLORS.background,
    borderRadius: 20,
  },
  refreshText: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '600' },

  /* 가로 패딩이 필요한 영역 */
  padH: { paddingHorizontal: 16 },

  /* 빠른 요약 */
  quickRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  quickCard: { flex: 1, alignItems: 'center', paddingVertical: 20, marginBottom: 12 },
  quickEmoji: { fontSize: 30, marginBottom: 8 },
  quickValue: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  quickLabel: { fontSize: 14, color: COLORS.textSecondary, marginTop: 3 },

  /* 빈 화면 */
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 18 },
  emptyTitle: { fontSize: 26, fontWeight: '800', color: COLORS.primary, marginBottom: 10 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  setupBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 30 },
  setupBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 17 },
});
