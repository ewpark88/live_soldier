import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import LiveServiceGauge from '../components/LiveServiceGauge';
import ProfileBar from '../components/ProfileBar';
import MenuButton from '../components/MenuButton';
import OnboardingScreen from '../components/OnboardingScreen';
import AdInterstitial from '../components/AdInterstitial';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import EventCalendar from '../components/EventCalendar';
import {
  Screen, Section, HeroCard, Chip, StatTile,
  EmptyState, Txt, AnimatedNumber, PressScale, AdFooter,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { RANK_IMAGES } from '../constants/rankImages';
import {
  loadMilitaryInfo, loadLeaveRecords, loadLeaveTotal,
  loadLeaveBonusRecords, loadRankPromotions, listProfiles,
  loadPersonnelType, savePersonnelType, loadTodos,
} from '../utils/storage';
import { shareDischarge } from '../utils/shareUtils';
import { refreshScheduledNotifications } from '../utils/notifications';
import useShowInterstitial from '../hooks/useShowInterstitial';
import { useMotion } from '../hooks/useMotion';
import { haptic } from '../utils/haptics';
import {
  calcDaysLeft, calcServedDays, calcRank, calcRankFromPromotions,
  formatDateKo, nextPromotion,
} from '../utils/dateUtils';
import { isOfficer, personnelLabel, BRANCHES } from '../constants/serviceTerms';
import { motion, radius as r, space as sp, type as ty } from '../theme/tokens';

/* ─── 복무 단계 ───────────────────────────────────────────── */
function getPhase(daysLeft) {
  if (daysLeft <= 0) return 'done';
  if (daysLeft <= 3) return 'd3';
  if (daysLeft <= 7) return 'd7';
  if (daysLeft <= 30) return 'd30';
  if (daysLeft <= 100) return 'd100';
  return 'normal';
}

/**
 * 단계별 히어로 설정.
 *
 * 예전엔 screenBg 로 "화면 전체 배경"을 크림색으로 물들였는데, 그게 정확히
 * 촌스러워지는 지점이었고 다크모드도 깨뜨렸다. 이제 단계는 히어로만 표현한다.
 */
const PHASE_CFG = {
  done: {
    gradient: ['#1E4A3F', '#0D2721'], accent: '#FFD24A', glow: true, embers: 'dense',
    milestone: { icon: 'trophy', text: '드디어 전역이다!!' },
  },
  d3: {
    gradient: ['#204A3F', '#0F2B25'], accent: '#FFCF45', glow: true, embers: 'normal',
    milestone: { icon: 'ribbon', text: '전역 3일 전!! 거의 다 왔다!' },
  },
  d7: {
    gradient: ['#245043', '#12302A'], accent: '#F7C53C', glow: true, embers: null,
    milestone: { icon: 'trophy-outline', text: '전역까지 일주일!' },
  },
  d30: {
    gradient: ['#27584C', '#16362F'], accent: '#F4C04A', glow: false, embers: null,
    milestone: { icon: 'flame', text: '전역 한 달 전! 조금만 더!' },
  },
  d100: {
    gradient: ['#2A5C50', '#183A32'], accent: '#F0C45E', glow: false, embers: null,
    milestone: { icon: 'barbell', text: '전역 100일 전! 보인다!' },
  },
  normal: {
    gradient: ['#2A5C50', '#1A3E36'], accent: '#F0C45E', glow: false, embers: null,
    milestone: null,
  },
};

/* ─── 골드 불티 ────────────────────────────────────────────────
   예전엔 🎆🎊🎉🥳 이모지가 떠다녔다 — 앱에서 가장 촌스러운 요소였고,
   overflow 클리핑이 없는 카드를 뚫고 위 섹션까지 침범했다.
   HeroCard 는 항상 overflow:'hidden' 이라 물리적으로 새어나갈 수 없다. */
function Ember({ index, dense }) {
  const m = useMotion();
  const p = useSharedValue(0);

  const size = 2 + (index % 3);
  const left = 4 + ((index * 7.3) % 92);
  const drift = ((index % 5) - 2) * 8;
  const dur = 3200 + (index % 4) * 700;

  useEffect(() => {
    if (m.reduced) return;
    p.value = withDelay(
      index * (dense ? 160 : 300),
      withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false)
    );
  }, [m.reduced]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -180 * p.value },
      { translateX: drift * p.value },
    ],
    // 떠오르며 밝아졌다가 사그라든다
    opacity: interpolate(p.value, [0, 0.15, 0.7, 1], [0, 0.5, 0.28, 0]),
  }));

  if (m.reduced) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          bottom: 4,
          left: `${left}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#F0C45E',
        },
        style,
      ]}
    />
  );
}

function EmberField({ dense }) {
  const count = dense ? 18 : 12;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <Ember key={i} index={i} dense={dense} />
      ))}
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  const m = useMotion();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [info, setInfo] = useState(null);
  const [leaveUsed, setLeaveUsed] = useState(0);
  const [leaveTotal, setLeaveTotal] = useState(21);
  const [promotions, setPromotions] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [personnelType, setPersonnelType] = useState(undefined);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [bonusRecords, setBonusRecords] = useState([]);
  const [todos, setTodos] = useState([]);
  const [replay, setReplay] = useState(0);

  const { adVisible, show: showAd, handleClose: closeAd } = useShowInterstitial();
  const sessionShown = React.useRef(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
      if (!sessionShown.current) {
        sessionShown.current = true;
        setTimeout(() => showAd(), 2000);
      }
    }, [])
  );

  const loadData = async () => {
    const { activeId, profiles } = await listProfiles();
    const active = profiles.find((p) => p.id === activeId);
    setProfileName(active?.name ?? '');
    setPersonnelType(await loadPersonnelType());

    const mi = await loadMilitaryInfo();
    setInfo(mi);

    const records = await loadLeaveRecords();
    setLeaveRecords(records);
    setLeaveUsed(records.reduce((acc, x) => acc + (x.days || 0), 0));

    const base = await loadLeaveTotal();
    const bonus = await loadLeaveBonusRecords();
    setBonusRecords(bonus);
    setLeaveTotal(base + bonus.reduce((acc, x) => acc + (x.days || 0), 0));

    setTodos(await loadTodos());
    setPromotions(await loadRankPromotions(mi?.enlistDate));

    refreshScheduledNotifications().catch(() => {});
  };

  const handleSelectType = async (type) => {
    await savePersonnelType(type);
    setPersonnelType(type);
    navigation.navigate('discharge');
  };

  /* ── 로딩 ── */
  if (!info && personnelType === undefined) {
    return <Screen scroll={false} />;
  }

  /* ── 온보딩 ── */
  if (!info && !personnelType) {
    return (
      <Screen scroll={false} ad={AD_UNITS.HOME_BOTTOM}>
        <View style={s.topRow}>
          <View style={{ flex: 1 }}>
            <ProfileBar onChange={loadData} />
          </View>
          <MenuButton navigation={navigation} current="home" />
        </View>
        <OnboardingScreen name={profileName} onSelect={handleSelectType} />
      </Screen>
    );
  }

  /* ── 입대 정보 미입력 ── */
  if (!info) {
    return (
      <Screen ad={AD_UNITS.HOME_BOTTOM}>
        <View style={s.topRow}>
          <View style={{ flex: 1 }}>
            <ProfileBar onChange={loadData} />
          </View>
          <MenuButton navigation={navigation} current="home" />
        </View>
        <EmptyState
          icon="shield-half"
          title={profileName ? `${profileName} 님, 환영합니다!` : '환영합니다!'}
          desc={'입대 정보를 입력하면\n전역까지 얼마나 남았는지 알 수 있어요.'}
          action={{
            label: '입대 정보 입력하기',
            icon: 'create-outline',
            onPress: () => navigation.navigate('discharge'),
          }}
        />
      </Screen>
    );
  }

  const daysLeft = calcDaysLeft(info.dischargeDate);
  const servedDays = calcServedDays(info.enlistDate);
  const officer = isOfficer(info.personnelType);
  const rank = officer
    ? (info.officerRank ?? personnelLabel(info.personnelType))
    : (calcRankFromPromotions(promotions) ?? calcRank(servedDays));
  const leaveLeft = leaveTotal - leaveUsed;
  const branchLabel = BRANCHES.find((b) => b.key === info.branch)?.label ?? '';
  const phase = getPhase(daysLeft);
  const cfg = PHASE_CFG[phase];
  const promo = officer ? null : nextPromotion(promotions);
  const crest = RANK_IMAGES[rank];

  const ddayText = daysLeft > 0 ? null : daysLeft === 0 ? 'D-Day!' : '전역 완료!';

  const tapDday = () => {
    haptic.medium();
    setReplay((x) => x + 1); // 카운트업을 처음부터 다시 돌린다
  };

  return (
    <>
      {/* 한 화면 고정 레이아웃 — 히어로(D-Day)는 콘텐츠 높이만큼, 캘린더가 남은
          공간을 flex 로 꽉 채운다. 스크롤·패럴랙스를 걷어내 둘이 한 화면에 딱 맞는다.
          데이터는 useFocusEffect 로 탭 진입 때마다 새로고침되므로 당겨서 새로고침은
          없어도 무방하다. */}
      <View style={[s.root, { backgroundColor: tc.background }]}>
        {/* ── 히어로 (풀블리드) ── */}
        <HeroCard
          fullBleed
          gradient={cfg.gradient}
          sheen
          contentStyle={[s.heroPad, { paddingTop: insets.top + sp.sm }]}
          style={s.hero}
        >
          {cfg.embers ? <EmberField dense={cfg.embers === 'dense'} /> : null}

          <View style={s.topRow}>
            <View style={{ flex: 1 }}>
              <ProfileBar onChange={loadData} onDark />
            </View>
            <MenuButton navigation={navigation} current="home" color={tc.heroText} />
          </View>

          {cfg.milestone ? (
            <Animated.View entering={m.enter(FadeIn, 0, motion.duration.slow)}>
              <Chip
                label={cfg.milestone.text}
                icon={cfg.milestone.icon}
                tone="accent"
                style={s.milestone}
              />
            </Animated.View>
          ) : null}

          <View style={s.heroMain}>
            <View style={{ flex: 1 }}>
              <Txt role="label" tone="heroMuted" style={s.eyebrow}>전역까지</Txt>

              <PressScale onPress={tapDday} haptic={null} style={s.ddayTap}>
                {ddayText ? (
                  <Txt
                    role="hero"
                    style={[
                      { color: cfg.accent },
                      cfg.glow && s.glow,
                      cfg.glow && { textShadowColor: cfg.accent },
                    ]}
                  >
                    {ddayText}
                  </Txt>
                ) : (
                  <View style={s.ddayRow}>
                    <Txt role="subtitle" tone="heroMuted">D-</Txt>
                    <AnimatedNumber
                      value={daysLeft}
                      replayKey={replay}
                      style={[
                        ty.display,
                        { color: cfg.accent },
                        cfg.glow && s.glow,
                        cfg.glow && { textShadowColor: cfg.accent },
                      ]}
                    />
                  </View>
                )}
              </PressScale>

              <View style={s.dateRow}>
                <Txt role="caption" tone="heroMuted">
                  {formatDateKo(info.dischargeDate)}
                </Txt>
                <PressScale
                  onPress={() => shareDischarge(info, rank, profileName)}
                  haptic="light"
                  style={s.shareBtn}
                  accessibilityLabel="전역일 공유"
                >
                  <Ionicons name="share-social" size={15} color={tc.heroText} />
                  <Txt role="micro" tone="hero">자랑하기</Txt>
                </PressScale>
              </View>
            </View>

            {/* 계급장 */}
            <View style={s.crestWrap}>
              {cfg.glow ? <View style={[s.crestGlow, { backgroundColor: cfg.accent }]} /> : null}
              {crest ? (
                <Image source={crest} style={s.crest} resizeMode="contain" />
              ) : (
                <Ionicons
                  name={info.personnelType === 'officer' ? 'star' : 'ribbon'}
                  size={36}
                  color={cfg.accent}
                />
              )}
              <Txt role="caption" tone="hero" style={{ fontWeight: '700' }}>{rank}</Txt>
            </View>
          </View>

          <View style={s.gauge}>
            <LiveServiceGauge
              enlistDate={info.enlistDate}
              dischargeDate={info.dischargeDate}
              fillColor={cfg.accent}
            />
          </View>

          <View style={s.statRow}>
            <StatTile label="복무 일수" value={servedDays} unit="일" onHero countUp />
            <StatTile label="남은 휴가" value={leaveLeft} unit="일" onHero countUp />
            {promo ? (
              <StatTile
                label={`다음 진급 · ${promo.rank}`}
                value={`D-${promo.daysLeft}`}
                onHero
                onPress={() => navigation.navigate('roadmap')}
              />
            ) : (
              <StatTile label="복무 개월" value={info.months} unit="개월" onHero countUp />
            )}
          </View>
        </HeroCard>

        {/* ── 휴가·일정 캘린더 (남은 공간 flex 로 채움) ── */}
        <View style={s.body}>
          <Section index={0} gap={0} style={{ flex: 1 }}>
            <Card style={s.calCard}>
              <SectionTitle icon="calendar-outline">휴가·일정 캘린더</SectionTitle>
              <View style={s.calInner}>
                <EventCalendar
                  fill
                  records={leaveRecords}
                  bonusRecords={bonusRecords}
                  todos={todos}
                />
              </View>
            </Card>
          </Section>
        </View>

        <AdFooter unit={AD_UNITS.HOME_BOTTOM} />
      </View>

      <AdInterstitial visible={adVisible} onClose={closeAd} />
    </>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    root: { flex: 1 },
    // 캘린더와 한 화면에 담기 위해 세로 리듬을 촘촘히 — 예전 xl(20) 간격들을 md(12)로.
    hero: { marginBottom: sp.md },
    heroPad: { paddingHorizontal: sp.lg, paddingBottom: sp.lg },

    topRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },

    milestone: { alignSelf: 'flex-start', marginTop: sp.sm },

    heroMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.md,
      marginTop: sp.sm,
    },
    eyebrow: { letterSpacing: 2 },
    ddayTap: { alignSelf: 'flex-start' },
    ddayRow: { flexDirection: 'row', alignItems: 'baseline', gap: sp.xxs },
    glow: { textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },

    dateRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md, marginTop: sp.xs },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.xs,
      paddingVertical: sp.xs,
      paddingHorizontal: sp.sm,
      borderRadius: r.pill,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },

    crestWrap: { alignItems: 'center', gap: sp.xs, width: 72 },
    crest: { width: 56, height: 56 },
    crestGlow: {
      position: 'absolute',
      top: 4,
      width: 48,
      height: 48,
      borderRadius: 24,
      opacity: 0.28,
    },

    gauge: { marginTop: sp.md },
    statRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.md },

    // 히어로 아래 남은 세로 공간을 캘린더가 전부 차지한다.
    body: { flex: 1, paddingHorizontal: sp.lg, paddingBottom: sp.md },
    calCard: { flex: 1, overflow: 'hidden' },
    calInner: { flex: 1, marginTop: sp.md },
  });
