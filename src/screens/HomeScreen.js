import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import ProfileBar from '../components/ProfileBar';
import OnboardingScreen from '../components/OnboardingScreen';
import HomeHero from '../components/home/HomeHero';
import HomeTopBar from '../components/home/HomeTopBar';
import DailyCard from '../components/home/DailyCard';
import ThisWeek from '../components/home/ThisWeek';
import Upcoming, { won } from '../components/home/Upcoming';
import StreakSheet from '../components/home/StreakSheet';
import QuickActions from '../components/home/QuickActions';
import ShareSheet from '../components/share/ShareSheet';
import { Screen, Section, EmptyState } from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { RANK_IMAGES } from '../constants/rankImages';
import {
  loadMilitaryInfo, loadLeaveRecords, loadLeaveTotal,
  loadLeaveBonusRecords, loadRankPromotions, listProfiles,
  loadPersonnelType, savePersonnelType, loadTodos, toggleTodo,
  loadSavingsPlan, loadSalaryInfo,
} from '../utils/storage';
import { shareDischarge, shareStreak } from '../utils/shareUtils';
import { refreshScheduledNotifications } from '../utils/notifications';
import { getNextLeave, getNextPayday, getSavingsMaturity } from '../utils/upcoming';
import { getSalaryByRank } from '../constants/salaryGuide';
import { useProfilesChanged } from '../state/appEvents';
import { useDailyHero } from '../hooks/useDailyHero';
import { useStreak } from '../state/StreakContext';
import { haptic } from '../utils/haptics';
import { guardSave, SAVE_FAILED } from '../utils/saveGuard';
import {
  calcDaysLeft, calcServedDays, calcProgress,
  calcRankByEnlistDate, calcRankFromPromotions, nextPromotion,
  formatDateKo, parseDate,
} from '../utils/dateUtils';
import { buildRoadmap, milestoneProgress } from '../utils/roadmapUtils';
import { BRANCHES, isOfficer, personnelLabel } from '../constants/serviceTerms';
import { getPhase, PHASE_META } from '../constants/phases';
import { space as sp } from '../theme/tokens';

/* 단계별 히어로 색은 테마 팔레트가 소유한다 — tc.phase[stage].
   아이콘·문구·불티 밀도는 constants/phases.js 의 PHASE_META. */

const WD = ['일', '월', '화', '수', '목', '금', '토'];
/** 'YYYY-MM-DD' → '11월 2일(월)' */
function md(dateStr) {
  const d = parseDate(dateStr);
  return d ? `${d.getMonth() + 1}월 ${d.getDate()}일(${WD[d.getDay()]})` : '';
}

export default function HomeScreen({ navigation }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  const { streak, days, tier, usedFreeze, today } = useStreak();

  const [info, setInfo] = useState(null);
  const [leaveUsed, setLeaveUsed] = useState(0);
  const [leaveTotal, setLeaveTotal] = useState(0);   // loadLeaveTotal 이 군종 기본값으로 채운다
  const [promotions, setPromotions] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [personnelType, setPersonnelType] = useState(undefined);
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [bonusRecords, setBonusRecords] = useState([]);
  const [todos, setTodos] = useState([]);
  const [savingsPlan, setSavingsPlan] = useState(null);
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [replay, setReplay] = useState(0);
  const [streakOpen, setStreakOpen] = useState(false);
  const [shareCard, setShareCard] = useState(null);   // { title, kind, data, onText, family } | null

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });

  useFocusEffect(
    useCallback(() => { loadData(); }, [])
  );
  // 공유 코드로 프로필을 받거나 백업을 복원하면 탭 포커스는 그대로라 위 effect 가
  // 다시 돌지 않는다 — 신호로 다시 읽는다.
  useProfilesChanged(() => { loadData(); });

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
    setSavingsPlan(await loadSavingsPlan());
    setSalaryInfo(await loadSalaryInfo());
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
          desc={'입대 정보를 입력하면\n전역까지 얼마나 남았는지 알 수 있어요.\n\n가족·곰신이라면 장병에게 받은 공유 코드로\n바로 추가할 수도 있어요 (위쪽 프로필 \'추가\').'}
          action={{
            label: '입대 정보 입력하기',
            icon: 'create-outline',
            onPress: () => navigation.navigate('discharge'),
          }}
        />
      </Screen>
    );
  }

  const servedDays = calcServedDays(info.enlistDate, info.dischargeDate);
  const officer = isOfficer(info.personnelType);
  const rank = officer
    ? (info.officerRank ?? personnelLabel(info.personnelType))
    : (calcRankFromPromotions(promotions) ?? calcRankByEnlistDate(info.enlistDate));
  const leaveLeft = leaveTotal - leaveUsed;
  const cfg = tc.phase[phase];
  const meta = PHASE_META[phase];
  const promo = officer ? null : nextPromotion(promotions);
  const crest = RANK_IMAGES[rank];
  const branchLabel = BRANCHES.find((b) => b.key === info.branch)?.label ?? '';

  const roadmap = buildRoadmap(info, promotions);
  const nextMs = roadmap.find((mi) => !mi.done) ?? null;
  /* 행의 링은 '다음 마일스톤까지의 구간'이다. 예전엔 servedDays/(servedDays+daysLeft),
     즉 전체 복무 진행률이라 마일스톤이 바뀌어도 리셋되지 않았다. */
  const msProgress = nextMs ? milestoneProgress(roadmap, nextMs.key) : 0;
  /* 히어로 배경 광원의 세기 — 일 기준 진행률(위젯·공유와 같은 값) */
  const heroProgress = calcProgress(info.enlistDate, info.dischargeDate) / 100;

  /* ── 다가오는 일정 ── */
  const upcoming = [];
  const nextLeave = getNextLeave(leaveRecords, today);
  if (nextLeave?.state === 'ongoing') {
    upcoming.push({
      key: 'leave',
      icon: 'airplane',
      tone: 'primary',
      title: `휴가 중 · ${nextLeave.dayNo}일차`,
      subtitle: `${md(nextLeave.start)} ~ ${md(nextLeave.end)}${nextLeave.memo ? ` · ${nextLeave.memo}` : ''}`,
      ddayLabel: nextLeave.returnDday > 0 ? `복귀 D-${nextLeave.returnDday}` : '마지막 날',
      onPress: () => goCalendar('leave'),
    });
  } else if (nextLeave?.state === 'upcoming') {
    upcoming.push({
      key: 'leave',
      icon: 'airplane-outline',
      tone: 'primary',
      title: '다음 휴가',
      subtitle: `${md(nextLeave.start)}${nextLeave.days > 1 ? ` ~ ${md(nextLeave.end)}` : ''} · ${nextLeave.days}일${nextLeave.memo ? ` · ${nextLeave.memo}` : ''}`,
      dday: nextLeave.dday,
      onPress: () => goCalendar('leave'),
    });
  } else if (daysLeft > 0) {
    upcoming.push({
      key: 'leave',
      icon: 'airplane-outline',
      tone: 'neutral',
      title: '다음 휴가',
      subtitle: '계획한 휴가를 기록하면 출발까지 남은 날을 세어 드려요',
      ddayLabel: '기록',
      ddayMuted: true,
      onPress: () => goCalendar('leave'),
    });
  }

  // 월급날 — 병 봉급(매월 10일)만. 간부 지급일·호봉 반영은 확실하지 않아 넣지 않는다.
  if (!officer && daysLeft > 0) {
    const pay = getNextPayday(today);
    const amount = salaryInfo?.monthlyAmount || getSalaryByRank(rank);
    upcoming.push({
      key: 'payday',
      icon: 'cash-outline',
      tone: 'success',
      title: '월급날',
      subtitle: `${md(pay.date)} · 예상 ${won(amount)}\n${pay.shifted ? '10일이 주말이라 앞당겨 계산 · ' : ''}공휴일은 반영하지 않아요`,
      dday: pay.dday,
      onPress: () => navigation.navigate('salary'),
    });
  }

  if (nextMs) {
    upcoming.push({
      key: 'milestone',
      icon: nextMs.icon ?? 'flag',
      tone: 'accent',
      title: nextMs.label,
      subtitle: `${formatDateKo(nextMs.date)} · 이 구간 ${Math.round(msProgress * 100)}%`,
      dday: Math.max(0, nextMs.dday),
      progress: msProgress,
      onPress: () => navigation.navigate('roadmap'),
    });
  }

  const maturity = daysLeft > 0 ? getSavingsMaturity(savingsPlan, info.dischargeDate, today) : null;
  if (maturity) {
    upcoming.push({
      key: 'savings',
      icon: 'calculator-outline',
      tone: 'success',
      title: '적금 만기 (전역 시)',
      subtitle: `예상 수령 ${won(maturity.total)} · 원금 ${won(maturity.principal)}`,
      dday: maturity.dday,
      onPress: () => navigation.navigate('savings'),
    });
  }

  /* 바로가기 — 탭바와 겹치는 항목(휴가 기록·급여)은 뺐다. 탭 한 번이면 가는 곳을
     홈에 또 두면 버튼만 늘고 발견성은 늘지 않는다. */
  const quickActions = [
    { key: 'family', icon: 'people-outline', label: '가족·곰신 공유', tone: 'primary', onPress: () => navigation.navigate('shareProfile') },
    { key: 'savings', icon: 'calculator-outline', label: '장병내일적금', tone: 'success', onPress: () => navigation.navigate('savings') },
    { key: 'roadmap', icon: 'map-outline', label: '전역 로드맵', tone: 'accent', onPress: () => navigation.navigate('roadmap') },
    { key: 'benefits', icon: 'gift-outline', label: '군인 혜택', tone: 'neutral', onPress: () => navigation.navigate('benefits') },
  ];

  const openDdayShare = () => setShareCard({
    title: '전역일 자랑하기',
    kind: 'dday',
    data: {
      name: profileName,
      branchLabel,
      rank,
      daysLeft,
      progress: calcProgress(info.enlistDate, info.dischargeDate),
      dischargeDate: info.dischargeDate,
    },
    onText: () => shareDischarge(info, rank, profileName),
    family: true,
  });

  const openStreakShare = () => {
    setStreakOpen(false);
    setShareCard({
      title: '스트릭 자랑하기',
      kind: 'streak',
      data: { name: profileName, branchLabel, rank, daysLeft, streak },
      onText: () => shareStreak(streak, info, profileName),
      family: false,
    });
  };

  return (
    <>
      {/*
        v1.0.8 은 스크롤을 걷어내 히어로와 월간 캘린더를 한 화면에 넣었다. 그
        의도(둘이 한 화면에)는 지금 요구와 정면충돌한다 — 스트릭·데일리·마일스톤을
        그 위에 얹으면 D-Day 가 반드시 작아지기 때문이다.
        그래서 캘린더를 캘린더 탭에 내주고, 대신 "첫 화면 = 히어로" 계약을 지킨다.
        스크롤은 더 보고 싶은 사람만 쓰는 깊이다.

        v1.3: 히어로 아래 6섹션 → 4섹션. 스트릭 카드는 배지 → 시트로,
        '이번 주'와 '오늘 할 일'은 한 카드로, '다음 마일스톤'은 '다가오는 일정'으로.
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
          onShare={openDdayShare}
          onReloadProfiles={loadData}
          onPressStreak={() => setStreakOpen(true)}
          onPressPromo={() => navigation.navigate('roadmap')}
          onPressLeave={() => goCalendar('leave')}
        />

        <View style={s.body}>
          <Section index={0}>
            <Upcoming items={upcoming} />
          </Section>

          <Section index={1}>
            <ThisWeek
              today={today}
              records={leaveRecords}
              bonusRecords={bonusRecords}
              todos={todos}
              attendance={days}
              onToggle={handleToggleTodo}
              onPressAll={() => goCalendar('todo')}
              onPressDay={() => goCalendar('month')}
            />
          </Section>

          <Section index={2}>
            <DailyCard
              message={daily.message}
              subline={daily.subline}
              sublineMeta={daily.sublineMeta}
            />
          </Section>

          {/* 본문 인라인 배너(AD_UNITS.HOME_TOP)는 걷어냈다 — 홈 한 화면에 배너가
              둘이면 콘텐츠보다 광고가 먼저 읽힌다. 홈의 광고는 푸터 하나뿐이다. */}
          <Section index={3} gap={0}>
            <QuickActions items={quickActions} />
          </Section>
        </View>
      </Screen>

      <StreakSheet
        visible={streakOpen}
        onClose={() => setStreakOpen(false)}
        streak={streak}
        days={days}
        tier={tier}
        usedFreeze={usedFreeze}
        onShare={openStreakShare}
      />

      <ShareSheet
        visible={!!shareCard}
        onClose={() => setShareCard(null)}
        title={shareCard?.title}
        card={shareCard}
        onText={shareCard?.onText}
        onFamily={shareCard?.family ? () => navigation.navigate('shareProfile') : undefined}
      />
    </>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    topRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    // 히어로만 풀블리드다. 그 아래 섹션들은 표준 거터를 되찾는다.
    body: { paddingHorizontal: sp.lg, paddingTop: sp.md },
  });
