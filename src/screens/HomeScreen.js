import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/ThemeContext';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import LiveServiceGauge from '../components/LiveServiceGauge';
import RoadmapTimeline from '../components/RoadmapTimeline';
import AdBanner from '../components/AdBanner';
import ProfileBar from '../components/ProfileBar';
import OnboardingScreen from '../components/OnboardingScreen';
import { buildRoadmap } from '../utils/roadmapUtils';
import { shareDischarge } from '../utils/shareUtils';
import { refreshScheduledNotifications } from '../utils/notifications';
import { Ionicons } from '@expo/vector-icons';
import { AD_UNITS } from '../constants/adUnits';
import {
  loadMilitaryInfo, loadLeaveRecords, loadLeaveTotal,
  loadLeaveBonusRecords, loadRankPromotions, listProfiles,
  loadPersonnelType, savePersonnelType,
} from '../utils/storage';
import { nextHobongInfo } from '../utils/officerUtils';
import AdInterstitial from '../components/AdInterstitial';
import useShowInterstitial from '../hooks/useShowInterstitial';
import {
  calcDaysLeft, calcProgress, calcServedDays,
  calcRank, calcRankFromPromotions, getMessageForPhase, nextPromotion, formatDateKo,
} from '../utils/dateUtils';
import { isOfficer, personnelLabel } from '../constants/serviceTerms';

const BRANCH_LABEL = { army: '육군', navy: '해군', airforce: '공군', marines: '해병대' };

/* ─── 계급 이미지 (static require) ────────────────────────── */
/* 파일명은 ASCII로 고정 — Metro가 한글 파일명을 동일 안드로이드 리소스로
   충돌시켜(중위→대령 등) 잘못 매칭되는 문제 방지. 키는 한글 계급명 유지. */
const RANK_IMAGES = {
  '이병': require('../../assets/ranks/ibyeong.png'),
  '일병': require('../../assets/ranks/ilbyeong.png'),
  '상병': require('../../assets/ranks/sangbyeong.png'),
  '병장': require('../../assets/ranks/byeongjang.png'),
};

/* ─── 간부 계급 이미지 (부사관·장교) ───────────────────────── */
const OFFICER_RANK_IMAGES = {
  '하사': require('../../assets/ranks/hasa.png'),
  '중사': require('../../assets/ranks/jungsa.png'),
  '상사': require('../../assets/ranks/sangsa.png'),
  '원사': require('../../assets/ranks/wonsa.png'),
  '소위': require('../../assets/ranks/sowi.png'),
  '중위': require('../../assets/ranks/jungwi.png'),
  '대위': require('../../assets/ranks/daewi.png'),
  '소령': require('../../assets/ranks/soryeong.png'),
  '중령': require('../../assets/ranks/jungryeong.png'),
  '대령': require('../../assets/ranks/daeryeong.png'),
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

// 딥 그린 히어로 카드를 유지하면서, 전역이 가까워질수록 카드를 살짝 더 깊게 +
// 골드 액센트를 점점 밝게 + 글로우/마일스톤으로 고조시킨다. (촌스러운 갈색 배경 제거)
const PHASE_CFG = {
  done:  {
    cardBg: '#1A4D42', screenBg: '#FAF6EA', accent: '#FFD24A', glow: true,
    milestone: { emoji: '🎆', text: '드디어 전역이다!!', bg: '#CFA13A', tc: '#15231E' },
    particles: ['🎆','🎊','🎉','🥳','🎖️','⭐'],
  },
  d3:    {
    cardBg: '#1B4E43', screenBg: '#FAF4E6', accent: '#FFCF45', glow: true,
    milestone: { emoji: '🎖️', text: '전역 3일 전!! 거의 다 왔다!', bg: '#CFA13A', tc: '#15231E' },
    particles: ['🎖️','✨','⭐','🔥','🎊'],
  },
  d7:    {
    cardBg: '#1E5246', screenBg: '#F8F4EA', accent: '#F7C53C', glow: true,
    milestone: { emoji: '🏆', text: '전역까지 일주일!', bg: '#C9962E', tc: '#15231E' },
    particles: [],
  },
  d30:   {
    cardBg: '#215649', screenBg: '#F6F6EF', accent: '#F4C04A', glow: false,
    milestone: { emoji: '🔥', text: '전역 한 달 전! 조금만 더!', bg: '#2B6457', tc: '#fff' },
    particles: [],
  },
  d100:  {
    cardBg: '#234E44', screenBg: '#F4F8F5', accent: '#F0C45E', glow: false,
    milestone: { emoji: '💪', text: '전역 100일 전! 보인다!', bg: '#2B6457', tc: '#fff' },
    particles: [],
  },
  normal: {
    cardBg: '#234E44', screenBg: null, accent: '#F0C45E', glow: false,
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
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [info,       setInfo]       = useState(null);
  const [leaveUsed,  setLeaveUsed]  = useState(0);
  const [leaveTotal, setLeaveTotal] = useState(21);
  const [promotions, setPromotions] = useState(null);
  const [profileName,  setProfileName]  = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [personnelType, setPersonnelType] = useState(undefined); // undefined=로딩중, null=미설정
  const [message,    setMessage]    = useState(() => getMessageForPhase('normal'));
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const sessionShown = useRef(false); // 세션 당 1회만 시도
  const { adVisible, show: showAd, handleClose: closeAd } = useShowInterstitial();

  useFocusEffect(useCallback(() => {
    loadData();
    // 앱 실행 후 첫 홈 진입 시 하루 1회 광고 (빈도 제한은 adManager가 관리)
    if (!sessionShown.current) {
      sessionShown.current = true;
      setTimeout(() => showAd(), 2000); // 화면 로딩 후 2초 뒤
    }
  }, []));

  const loadData = async () => {
    const { activeId, profiles } = await listProfiles();
    const active = profiles.find((p) => p.id === activeId);
    setProfileName(active?.name ?? '');
    setProfilePhoto(active?.photo ?? null);
    setPersonnelType(await loadPersonnelType());
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
    // 남은 일수(phase)에 맞는 응원 메시지
    setMessage(getMessageForPhase(mi ? getPhase(calcDaysLeft(mi.dischargeDate)) : 'normal'));
    // 알림이 켜져 있으면 최신 데이터(프로필 전환·정보 수정 포함)로 리마인더 재예약
    refreshScheduledNotifications().catch(() => {});
  };

  const startPulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 300, useNativeDriver: true }),
    ]).start();
  };

  /* ── 신분 미선택(온보딩) 상태 ── */
  const handleSelectType = async (type) => {
    await savePersonnelType(type);
    setPersonnelType(type);
    navigation.navigate('discharge');
  };

  // 신분 로딩 중에는 깜빡임 방지를 위해 아무것도 렌더하지 않음
  if (!info && personnelType === undefined) {
    return <View style={s.container} />;
  }

  // 입대정보 없고 신분도 미설정 → 온보딩
  if (!info && !personnelType) {
    return (
      <View style={s.container}>
        <View style={{ paddingTop: insets.top + 8 }}>
          <ProfileBar onChange={loadData} />
        </View>
        <OnboardingScreen name={profileName} onSelect={handleSelectType} />
      </View>
    );
  }

  /* ── 신분은 정했으나 입대정보 미입력 상태 ── */
  if (!info) {
    return (
      <View style={[s.container, { paddingTop: insets.top + 10 }]}>
        <ProfileBar onChange={loadData} />
        <View style={s.emptyWrap}>
          <Ionicons name="shield-half" size={52} color={tc.primaryLight} style={s.emptyEmoji} />
          <Text style={s.emptyTitle}>
            {profileName ? `${profileName} 님, 환영합니다!` : '환영합니다!'}
          </Text>
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
  const officer    = isOfficer(info.personnelType);
  const rank       = officer ? (info.officerRank ?? personnelLabel(info.personnelType))
                             : (calcRankFromPromotions(promotions) ?? calcRank(servedDays));
  const leaveLeft  = leaveTotal - leaveUsed;
  const rankColor  = officer ? tc.primary : (RANK_COLOR[rank] ?? tc.primary);
  const phase      = getPhase(daysLeft);
  const phaseCfg   = PHASE_CFG[phase];
  const promo      = officer ? null : nextPromotion(promotions);
  const hobong     = officer ? nextHobongInfo(info.enlistDate) : null;
  const roadmap    = buildRoadmap(info, promotions);
  const onShare    = () => shareDischarge(info, rank, profileName);

  return (
    <View style={[s.container, { backgroundColor: phaseCfg.screenBg ?? tc.background }]}>
      <AdInterstitial visible={adVisible} onClose={closeAd} />
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 프로필 스위처 ── */}
        <View style={{ paddingTop: insets.top + 8, marginBottom: 6 }}>
          <ProfileBar onChange={loadData} />
        </View>

        {/* ── 컴팩트 헤더 ── */}
        <View style={[s.header, { paddingTop: 4 }]}>
          <View style={s.headerLeft}>
            <View style={s.titleRow}>
              <Image source={require('../../assets/icon.png')} style={s.appIcon} />
              <Text style={s.headerTitle}>전역까지</Text>
            </View>
            <Text style={s.headerSub}>{BRANCH_LABEL[info.branch]}</Text>
          </View>

          {/* 계급/구분 태그 — 병사·간부 모두 계급 이미지, 미지정 간부는 이모지 */}
          <View style={s.rankImgWrap}>
            {officer ? (
              OFFICER_RANK_IMAGES[rank] ? (
                <Image source={OFFICER_RANK_IMAGES[rank]} style={s.rankImg} resizeMode="contain" />
              ) : (
                <Text style={s.rankEmoji}>{info.personnelType === 'officer' ? '⭐' : '🎖️'}</Text>
              )
            ) : (
              <Image
                source={RANK_IMAGES[rank]}
                style={s.rankImg}
                resizeMode="contain"
              />
            )}
            <Text style={[s.rankTagText, { color: rankColor }]}>{rank}</Text>
          </View>
        </View>

        {/* ── 마일스톤 배너 ── */}
        {phaseCfg.milestone && <MilestoneBanner cfg={phaseCfg.milestone} />}

        {/* ── D-Day 메인카드 (풀 와이드) ── */}
        <TouchableOpacity activeOpacity={0.88} onPress={startPulse}>
          <View style={[s.mainCard, { backgroundColor: phaseCfg.cardBg }]}>
            {phaseCfg.particles.length > 0 && <FloatingParticles emojis={phaseCfg.particles} />}
            {(profilePhoto || profileName) ? (
              <View style={s.profileTag}>
                {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={s.profileTagAvatar} />
                ) : null}
                <Text style={s.profileTagName}>{profileName}</Text>
              </View>
            ) : null}
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
              <LiveServiceGauge
                enlistDate={info.enlistDate}
                dischargeDate={info.dischargeDate}
              />
            </View>
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statValue}>{servedDays}</Text>
                <Text style={s.statLabel}>복무 일수</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={[s.statValue, { color: tc.accentLight }]}>{leaveLeft}</Text>
                <Text style={s.statLabel}>남은 휴가</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── 응원 메시지 카드 (풀 와이드) ── */}
        <View style={s.messageCard}>
          <Ionicons name="chatbubble-ellipses" size={26} color={tc.primaryLight} style={s.messageEmoji} />
          <Text style={s.messageText}>{message}</Text>
          <TouchableOpacity onPress={() => setMessage(getMessageForPhase(phase))} style={s.refreshBtn}>
            <Ionicons name="refresh" size={14} color={tc.primaryLight} />
            <Text style={s.refreshText}>다른 메시지 보기</Text>
          </TouchableOpacity>
        </View>

        {/* ── 전역일 공유 버튼 ── */}
        <View style={s.padH}>
          <TouchableOpacity style={s.shareBtn} activeOpacity={0.85} onPress={onShare}>
            <Ionicons name="share-social" size={19} color={tc.primary} />
            <Text style={s.shareBtnText}>내 전역일 자랑하기</Text>
          </TouchableOpacity>
        </View>

        {/* ── 다음 진급 카운트다운 (병사) ── */}
        {promo && (
          <View style={s.padH}>
            <Card style={s.nextPromoCard}>
              <Ionicons name="medal" size={24} color={tc.primary} style={s.nextPromoEmoji} />
              <View style={s.nextPromoInfo}>
                <Text style={s.nextPromoLabel}>다음 진급 · {promo.rank}</Text>
                <Text style={s.nextPromoSub}>{formatDateKo(promo.date)}</Text>
              </View>
              <Text style={s.nextPromoDday}>D-{promo.daysLeft}</Text>
            </Card>
          </View>
        )}

        {/* ── 다음 호봉 카운트다운 (간부) ── */}
        {hobong && (
          <View style={s.padH}>
            <Card style={s.nextPromoCard}>
              <Ionicons name="trending-up" size={24} color={tc.primary} style={s.nextPromoEmoji} />
              <View style={s.nextPromoInfo}>
                <Text style={s.nextPromoLabel}>현재 {hobong.current}호봉 · 다음 {hobong.next}호봉</Text>
                <Text style={s.nextPromoSub}>{formatDateKo(hobong.nextDate)} 승급 예정</Text>
              </View>
              <Text style={s.nextPromoDday}>D-{hobong.daysLeft}</Text>
            </Card>
          </View>
        )}

        {/* ── 전역 로드맵 타임라인 ── */}
        {roadmap.length > 0 && (
          <View style={s.padH}>
            <Card style={s.roadmapCard}>
              <SectionTitle icon="map-outline" size={16}>전역 로드맵</SectionTitle>
              <Text style={s.roadmapSub}>입대부터 전역까지 주요 순간</Text>
              <View style={{ marginTop: 14 }}>
                <RoadmapTimeline roadmap={roadmap} />
              </View>
            </Card>
          </View>
        )}

        {/* ── 광고 ── */}
        <View style={s.padH}>
          <AdBanner unit={AD_UNITS.HOME_BOTTOM} style={{ marginTop: 16, marginBottom: 12 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  container: { flex: 1, backgroundColor: tc.background },

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
  headerTitle: { fontSize: 28, fontWeight: '800', color: tc.primary },
  headerSub: { fontSize: 16, fontWeight: '700', color: tc.textSecondary, marginTop: 2 },

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
  rankEmoji: {
    fontSize: 46,
    height: 64,
    lineHeight: 64,
    textAlign: 'center',
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
    backgroundColor: tc.primary,
  },
  profileTag: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  profileTagAvatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  profileTagName: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.92)' },
  mainLabel: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  dday: { fontSize: 72, fontWeight: '900', color: tc.white, letterSpacing: -2 },
  dischargeDate: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 20 },
  progressSection: { width: '100%', marginBottom: 20 },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 18,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '800', color: tc.white },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  /* 응원 메시지 — 풀 와이드 */
  messageCard: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 20,
    backgroundColor: tc.card,
  },
  messageEmoji: { fontSize: 30, marginBottom: 10 },
  messageText: { fontSize: 16, color: tc.text, textAlign: 'center', lineHeight: 25, fontWeight: '500' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: tc.background,
    borderRadius: 20,
  },
  refreshText: { fontSize: 14, color: tc.primaryLight, fontWeight: '600' },

  /* 가로 패딩이 필요한 영역 */
  padH: { paddingHorizontal: 16 },

  /* 전역일 공유 버튼 */
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, paddingVertical: 15, borderRadius: 16,
    backgroundColor: tc.highlightBg, borderWidth: StyleSheet.hairlineWidth, borderColor: tc.border,
  },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: tc.primary },

  /* 전역 로드맵 */
  roadmapCard: { marginTop: 12 },
  roadmapTitle: { fontSize: 16, fontWeight: '800', color: tc.text },
  roadmapSub: { fontSize: 12.5, color: tc.textSecondary, marginTop: 2 },

  /* 다음 진급 카운트다운 */
  nextPromoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 12,
    marginBottom: 0,
    gap: 12,
  },
  nextPromoEmoji: { fontSize: 26 },
  nextPromoInfo: { flex: 1 },
  nextPromoLabel: { fontSize: 15, fontWeight: '700', color: tc.text },
  nextPromoSub: { fontSize: 13, color: tc.textSecondary, marginTop: 2 },
  nextPromoDday: { fontSize: 22, fontWeight: '900', color: tc.primary, letterSpacing: -0.5 },

  /* 빈 화면 */
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 18 },
  emptyTitle: { fontSize: 26, fontWeight: '800', color: tc.primary, marginBottom: 10 },
  emptyText: { fontSize: 16, color: tc.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  setupBtn: { backgroundColor: tc.primary, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 30 },
  setupBtnText: { color: tc.white, fontWeight: '700', fontSize: 17 },
});
