import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import ProfileBar from '../components/ProfileBar';
import OnboardingScreen from '../components/OnboardingScreen';
import StreakCard from '../components/StreakCard';
import HomeHero from '../components/home/HomeHero';
import HomeTopBar from '../components/home/HomeTopBar';
import DailyCard from '../components/home/DailyCard';
import WeekStrip from '../components/home/WeekStrip';
import TodayTodos from '../components/home/TodayTodos';
import NextMilestone from '../components/home/NextMilestone';
import QuickActions from '../components/home/QuickActions';
import { Screen, Section, EmptyState } from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { RANK_IMAGES } from '../constants/rankImages';
import {
  loadMilitaryInfo, loadLeaveRecords, loadLeaveTotal,
  loadLeaveBonusRecords, loadRankPromotions, listProfiles,
  loadPersonnelType, savePersonnelType, loadTodos, toggleTodo,
} from '../utils/storage';
import { shareDischarge } from '../utils/shareUtils';
import { refreshScheduledNotifications } from '../utils/notifications';
import useShowInterstitial from '../hooks/useShowInterstitial';
import { useDailyHero } from '../hooks/useDailyHero';
import { useStreak } from '../state/StreakContext';
import { haptic } from '../utils/haptics';
import { guardSave, SAVE_FAILED } from '../utils/saveGuard';
import {
  calcDaysLeft, calcServedDays, calcProgress,
  calcRankByEnlistDate, calcRankFromPromotions, nextPromotion,
} from '../utils/dateUtils';
import { buildRoadmap, milestoneProgress } from '../utils/roadmapUtils';
import { isOfficer, personnelLabel } from '../constants/serviceTerms';
import { getPhase, PHASE_META } from '../constants/phases';
import { space as sp } from '../theme/tokens';

/* 단계별 히어로 색은 테마 팔레트가 소유한다 — tc.phase[stage].
   아이콘·문구·불티 밀도는 constants/phases.js 의 PHASE_META. */

export default function HomeScreen({ navigation }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  const { streak, days, tier, usedFreeze } = useStreak();

  const [info, setInfo] = useState(null);
  const [leaveUsed, setLeaveUsed] = useState(0);
  const [leaveTotal, setLeaveTotal] = useState(0);   // loadLeaveTotal 이 군종 기본값으로 채운다
  const [promotions, setPromotions] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [personnelType, setPersonnelType] = useState(undefined);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [bonusRecords, setBonusRecords] = useState([]);
  const [todos, setTodos] = useState([]);
  const [replay, setReplay] = useState(0);

  /* 전면 광고는 '저장' 시점에만 띄운다 — 전역 정보·휴가 기록·할 일·급여.
     여기서 훅을 호출하는 목적은 노출이 아니라 프리로드다. 홈이 첫 화면이라
     여기서 미리 로드해 두면 나중 저장 시점의 노출 성공률이 올라간다.
     (예전에는 홈 포커스 6초 뒤 자동 노출이 있었다 = 사실상 '앱 실행 시 광고') */
  useShowInterstitial();

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );

  const loadData = async () => {
    try {
      await _loadData();
    } catch (e) {
      if (__DEV__) console.warn('[HomeScreen] 데이터 로드 실패:', e && e.message);
      // 로딩 센티널(!info && personnelType === undefined)이 영원히 안 풀려
      // 홈 탭이 빈 화면으로 멈추던 문제 — 최소한 온보딩/입력 화면으로 떨군다.
      setInfo(null);
      setPersonnelType((prev) => (prev === undefined ? null : prev));
    }
  };

  const _loadData = async () => {
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
  };

  const handleSelectType = async (type) => {
    if ((await guardSave(() => savePersonnelType(type))) === SAVE_FAILED) return;
    setPersonnelType(type);
    navigation.navigate('discharge');
  };

  /* 캘린더 탭의 세그먼트로 이동. 같은 탭 재진입에도 params 가 갱신되도록
     타임스탬프를 함께 넘긴다 (없으면 두 번째부터 세그먼트가 안 바뀐다). */
  const goCalendar = (section) =>
    navigation.navigate('calendar', { section, ts: Date.now() });

  const handleToggleTodo = async (id) => {
    const next = await guardSave(() => toggleTodo(id));
    if (next === SAVE_FAILED) return;
    setTodos(next);
    refreshScheduledNotifications().catch(() => {});
  };

  const daysLeft = info ? calcDaysLeft(info.dischargeDate) : 0;
  const phase = getPhase(daysLeft);
  const daily = useDailyHero(phase);

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

  const servedDays = calcServedDays(info.enlistDate);
  const officer = isOfficer(info.personnelType);
  const rank = officer
    ? (info.officerRank ?? personnelLabel(info.personnelType))
    : (calcRankFromPromotions(promotions) ?? calcRankByEnlistDate(info.enlistDate));
  const leaveLeft = leaveTotal - leaveUsed;
  const cfg = tc.phase[phase];
  const meta = PHASE_META[phase];
  const promo = officer ? null : nextPromotion(promotions);
  const crest = RANK_IMAGES[rank];

  const roadmap = buildRoadmap(info, promotions);
  const nextMs = roadmap.find((mi) => !mi.done) ?? null;
  /* 카드의 바는 '다음 마일스톤까지의 구간'이다. 예전엔 servedDays/(servedDays+daysLeft),
     즉 전체 복무 진행률이라 마일스톤이 바뀌어도 리셋되지 않았다. */
  const msProgress = nextMs ? milestoneProgress(roadmap, nextMs.key) : 0;
  /* 히어로 배경 광원의 세기 — 일 기준 진행률(위젯·공유와 같은 값) */
  const heroProgress = calcProgress(info.enlistDate, info.dischargeDate) / 100;

  const quickActions = [
    { key: 'leave', icon: 'airplane-outline', label: '휴가 기록', tone: 'primary', onPress: () => goCalendar('leave') },
    { key: 'salary', icon: 'wallet-outline', label: '급여 계산', tone: 'accent', onPress: () => navigation.navigate('salary') },
    { key: 'savings', icon: 'calculator-outline', label: '장병내일적금', tone: 'success', onPress: () => navigation.navigate('savings') },
    { key: 'benefits', icon: 'gift-outline', label: '군인 혜택', tone: 'neutral', onPress: () => navigation.navigate('benefits') },
  ];

  return (
    <>
      {/*
        v1.0.8 은 스크롤을 걷어내 히어로와 월간 캘린더를 한 화면에 넣었다. 그
        의도(둘이 한 화면에)는 지금 요구와 정면충돌한다 — 스트릭·데일리·마일스톤을
        그 위에 얹으면 D-Day 가 반드시 작아지기 때문이다.
        그래서 캘린더를 캘린더 탭에 내주고, 대신 "첫 화면 = 히어로" 계약을 지킨다.
        스크롤은 더 보고 싶은 사람만 쓰는 깊이다.
      */}
      <Screen
        scroll
        padded={false}
        onScroll={onScroll}
        ad={AD_UNITS.HOME_BOTTOM}
        /* Screen 은 헤더가 없으면 insets.top 을 콘텐츠에 먹인다. 히어로도 같은
           값을 갖고 있어서 덮지 않으면 상태바 높이만큼 이중 여백이 생긴다. */
        contentContainerStyle={{ paddingTop: 0, paddingBottom: sp.md }}
        overlay={<HomeTopBar scrollY={scrollY} daysLeft={daysLeft} name={profileName} />}
      >
        <HomeHero
          info={info}
          rank={rank}
          crest={crest}
          daysLeft={daysLeft}
          servedDays={servedDays}
          leaveLeft={leaveLeft}
          months={info.months}
          promo={promo}
          progress={heroProgress}
          cfg={cfg}
          meta={meta}
          angle={daily.heroAngle}
          streak={{ count: streak.current, tier }}
          replayKey={replay}
          onTapDday={() => { haptic.medium(); setReplay((x) => x + 1); }}
          onShare={() => shareDischarge(info, rank, profileName)}
          onReloadProfiles={loadData}
          onPressStreak={() => {}}
          onPressPromo={() => navigation.navigate('roadmap')}
          onPressLeave={() => goCalendar('leave')}
        />

        <View style={s.body}>
          <Section index={0}>
            <DailyCard
              message={daily.message}
              subline={daily.subline}
              sublineMeta={daily.sublineMeta}
            />
          </Section>

          <Section index={1}>
            <WeekStrip
              records={leaveRecords}
              bonusRecords={bonusRecords}
              todos={todos}
              attendance={days}
              onPress={() => goCalendar('leave')}
            />
          </Section>

          <Section index={2}>
            <TodayTodos
              todos={todos}
              onToggle={handleToggleTodo}
              onPressAll={() => goCalendar('todo')}
            />
          </Section>

          <Section index={3}>
            <NextMilestone
              milestone={nextMs}
              progress={msProgress}
              onPress={() => navigation.navigate('roadmap')}
            />
          </Section>

          <Section index={4}>
            <StreakCard streak={streak} days={days} tier={tier} usedFreeze={usedFreeze} />
          </Section>

          {/* 본문 인라인 배너(AD_UNITS.HOME_TOP)는 걷어냈다 — 홈 한 화면에 배너가
              둘이면 콘텐츠보다 광고가 먼저 읽힌다. 홈의 광고는 푸터 하나뿐이다. */}
          <Section index={5} gap={0}>
            <QuickActions items={quickActions} />
          </Section>
        </View>
      </Screen>

    </>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    topRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    // 히어로만 풀블리드다. 그 아래 섹션들은 표준 거터를 되찾는다.
    body: { paddingHorizontal: sp.lg, paddingTop: sp.md },
  });
