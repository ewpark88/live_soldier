import React, { useMemo, useState, useCallback } from 'react';
import { Alert, Platform, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import ProfileBar from '../components/ProfileBar';
import { Screen, AppHeader, Section, ListRow, Divider, Chip, Txt } from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { useTheme, useThemeColors } from '../theme/ThemeContext';
import { usePrefs } from '../theme/PrefsContext';
import { clearAllData, loadMilitaryInfo, loadRankPromotions } from '../utils/storage';
import { haptic } from '../utils/haptics';
import {
  enableNotifications, disableNotifications, isNotifAvailable,
  loadNotifPrefs, saveNotifPrefs, refreshScheduledNotifications, DEFAULT_NOTIF_PREFS,
} from '../utils/notifications';
import {
  calcDaysLeft, calcServedDays, calcRankByEnlistDate, calcRankFromPromotions, formatDateKo,
} from '../utils/dateUtils';
import { BRANCHES, isOfficer, personnelLabel } from '../constants/serviceTerms';
import { expo as appInfo } from '../../app.json';
import { space as sp } from '../theme/tokens';

const NOTIF_SUB = [
  { key: 'discharge', title: '전역·진급 알림', desc: 'D-100·D-30·D-7·D-1·진급일', icon: 'flag-outline' },
  { key: 'milestone', title: '마일스톤 전날 알림', desc: '진급·반환점 하루 전 저녁 9시', icon: 'trophy-outline' },
  { key: 'streak', title: '출석 스트릭 알림', desc: '그날 앱을 안 열었으면 저녁 9시에', icon: 'flame-outline' },
  { key: 'daily', title: '매일 D-day 알림', desc: '남은 일수를 매일 알려드려요', icon: 'today-outline' },
];

const DAILY_HOURS = [
  { value: 8, label: '아침 8시' },
  { value: 12, label: '점심 12시' },
  { value: 21, label: '저녁 9시' },
];

/** 그룹 라벨 + 카드 + (선택) 힌트 */
function Group({ label, hint, index, children }) {
  return (
    <Section index={index} gap={sp.md}>
      <Txt role="label" tone="secondary" style={{ marginLeft: sp.xs, marginBottom: sp.sm }}>
        {label}
      </Txt>
      {/* pad="none": 행이 좌우 패딩을 직접 갖는다.
          overflow:'hidden' 은 쓰지 않는다 — iOS 에서 카드 그림자가 잘려 사라진다. */}
      <Card pad="none" style={styles.group}>
        {children}
      </Card>
      {hint ? (
        <Txt role="caption" tone="light" style={{ marginTop: sp.sm, marginLeft: sp.xs }}>
          {hint}
        </Txt>
      ) : null}
    </Section>
  );
}

export default function SettingsScreen({ navigation }) {
  const tc = useThemeColors();
  const { theme: currentTheme, introSeen } = useTheme();
  const { haptics, reduceMotion, setHaptics, setReduceMotion } = usePrefs();

  const [notifOn, setNotifOn] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_NOTIF_PREFS);
  const [info, setInfo] = useState(null);
  const [promotions, setPromotions] = useState(null);

  const loadProfile = useCallback(async () => {
    const mi = await loadMilitaryInfo();
    setInfo(mi);
    setPromotions(await loadRankPromotions(mi?.enlistDate));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadNotifPrefs().then((p) => {
        if (!alive) return;
        setNotifPrefs(p);
        setNotifOn(p.master);
      });
      loadProfile();
      return () => { alive = false; };
    }, [loadProfile])
  );

  /* 요약 한 줄 — 계급 · 군별 · 전역일 */
  const summary = useMemo(() => {
    if (!info) return null;
    const officer = isOfficer(info.personnelType);
    const rank = officer
      ? (info.officerRank ?? personnelLabel(info.personnelType))
      : (calcRankFromPromotions(promotions) ?? calcRankByEnlistDate(info.enlistDate));
    const branch = BRANCHES.find((b) => b.key === info.branch)?.label ?? '';
    const left = calcDaysLeft(info.dischargeDate);
    return {
      line1: [branch, rank].filter(Boolean).join(' · '),
      line2: `${formatDateKo(info.dischargeDate)} 전역 · ${left > 0 ? `D-${left}` : '전역 완료'}`,
    };
  }, [info, promotions]);

  /* 병사/간부에 따라 봉급표 행이 갈린다 (예전엔 햄버거 메뉴가 하던 분기) */
  const payRow = isOfficer(info?.personnelType)
    ? { title: '간부 봉급 참고', subtitle: '계급·호봉별 봉급표', icon: 'ribbon-outline', route: 'officerPay' }
    : { title: '병사 월급 가이드', subtitle: '계급별 표준 월급', icon: 'card-outline', route: 'salaryGuide' };

  const SHORTCUTS = [
    { title: '전역 정보', subtitle: '입대일·군별·진급일 수정', icon: 'flag-outline', route: 'discharge' },
    { title: '전역 로드맵', subtitle: '진급·반환점·전역까지의 이정표', icon: 'map-outline', route: 'roadmap' },
    payRow,
    { title: '장병내일적금', subtitle: '전역 시 받을 목돈 계산', icon: 'wallet-outline', route: 'savings' },
    { title: '군인 혜택 모음', subtitle: '금융·교통·문화 할인', icon: 'gift-outline', route: 'benefits' },
  ];

  const switchProps = (on) => ({
    trackColor: { false: tc.border, true: tc.primaryLight },
    thumbColor: Platform.OS === 'android' ? (on ? tc.primary : tc.card) : undefined,
  });

  const handleToggleNotif = async (next) => {
    if (notifBusy) return;
    setNotifBusy(true);
    try {
      if (next) {
        if (!isNotifAvailable()) {
          haptic.warning();
          Alert.alert('알림 사용 불가', 'Expo Go에서는 알림을 사용할 수 없어요. 빌드된 앱에서 이용해주세요.');
          return;
        }
        const ok = await enableNotifications();
        if (ok) {
          setNotifOn(true);
          setNotifPrefs(await loadNotifPrefs());
          haptic.success();
          Alert.alert('알림 켜짐', '전역 D-day·진급·일정 리마인더를 보내드릴게요.');
        } else {
          setNotifOn(false);
          haptic.warning();
          Alert.alert('권한 필요', '기기 설정에서 알림 권한을 허용해주세요.');
        }
      } else {
        await disableNotifications();
        setNotifOn(false);
        setNotifPrefs(await loadNotifPrefs());
      }
    } finally {
      setNotifBusy(false);
    }
  };

  const handleSubToggle = async (key, value) => {
    const next = await saveNotifPrefs({ [key]: value });
    setNotifPrefs(next);
    haptic.select();
    // 예약 구성이 바뀌었으므로 시그니처 게이트를 건너뛰고 다시 잡는다
    refreshScheduledNotifications({ force: true }).catch(() => {});
  };

  const handleClearData = () => {
    haptic.warning();
    Alert.alert(
      '모든 데이터 삭제',
      '삭제를 하면 모든 데이터가 사라집니다. 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('삭제 완료', '모든 데이터가 초기화되었습니다.', [
              { text: '확인', onPress: () => navigation.navigate('home') },
            ]);
          },
        },
      ]
    );
  };

  return (
    <Screen
      ad={AD_UNITS.HOME_BOTTOM}
      header={<AppHeader title="내 정보" />}
    >
      {/* ── 프로필 ── */}
      <Section index={0} gap={sp.md}>
        <Card pad="lg">
          <ProfileBar onChange={loadProfile} />
          {summary ? (
            <View style={styles.summary}>
              <Txt role="bodyLg" style={{ fontWeight: '700' }}>{summary.line1}</Txt>
              <Txt role="caption" tone="secondary" numeric>{summary.line2}</Txt>
            </View>
          ) : null}
        </Card>
      </Section>

      {/* ── 바로가기 ──
          예전엔 이 항목들이 우상단 햄버거 메뉴에만 있었다. 탭 + 드로어라는
          두 개의 네비게이션이 공존해 "이 기능 어디 있지"를 두 군데서 찾아야 했다. */}
      <Group label="바로가기" index={1}>
        {SHORTCUTS.map((row, i) => (
          <View key={row.route}>
            <ListRow
              title={row.title}
              subtitle={row.subtitle}
              icon={row.icon}
              chevron
              onPress={() => navigation.navigate(row.route)}
              style={styles.row}
            />
            {i < SHORTCUTS.length - 1 ? <Divider inset={sp.lg + 48} /> : null}
          </View>
        ))}
      </Group>

      {/* ── 외형 ──
          예전엔 여기서 시스템/라이트/다크 3행을 직접 골랐다. 이제 테마까지
          고를 수 있으므로 외형 설정을 전용 화면 한 곳으로 모은다. */}
      <Group label="외형" index={2}>
        <ListRow
          title="테마"
          subtitle="앱 전체 색과 밝기"
          icon="color-palette-outline"
          iconTone="accent"
          chevron
          onPress={() => navigation.navigate('theme')}
          style={styles.row}
          value={
            introSeen ? currentTheme?.name : undefined
          }
          right={
            introSeen ? undefined : (
              <View style={[styles.newBadge, { backgroundColor: tc.accentSoft }]}>
                <Txt role="micro" style={{ color: tc.accentText, fontWeight: '800' }}>NEW</Txt>
              </View>
            )
          }
        />
      </Group>

      {/* ── 알림 ──
          마스터 + 하위 토글. 매일 알림은 기본 꺼짐이다 — 원치 않는 데일리
          알림은 앱 삭제 유발 1위다. */}
      <Group
        label="알림"
        index={3}
        hint="* 알림은 이 기기에서만 예약되며, 현재 선택된 프로필 기준으로 발송됩니다."
      >
        <ListRow
          title="알림 받기"
          subtitle="전역·진급·일정·출석 리마인더"
          icon="notifications-outline"
          iconTone={notifOn ? 'primary' : 'neutral'}
          style={styles.row}
          right={
            <Switch
              value={notifOn}
              onValueChange={handleToggleNotif}
              disabled={notifBusy}
              {...switchProps(notifOn)}
            />
          }
        />

        {notifOn ? (
          <>
            <Divider inset={sp.lg + 48} />
            {NOTIF_SUB.map((opt, i) => (
              <View key={opt.key}>
                <ListRow
                  title={opt.title}
                  subtitle={opt.desc}
                  icon={opt.icon}
                  iconTone={notifPrefs[opt.key] ? 'primary' : 'neutral'}
                  style={styles.row}
                  right={
                    <Switch
                      value={!!notifPrefs[opt.key]}
                      onValueChange={(v) => handleSubToggle(opt.key, v)}
                      {...switchProps(!!notifPrefs[opt.key])}
                    />
                  }
                />
                {i < NOTIF_SUB.length - 1 ? <Divider inset={sp.lg + 48} /> : null}
              </View>
            ))}

            {notifPrefs.daily ? (
              <View style={styles.hourRow}>
                {DAILY_HOURS.map((h) => (
                  <Chip
                    key={h.value}
                    label={h.label}
                    size="sm"
                    selected={notifPrefs.dailyHour === h.value}
                    onPress={() => handleSubToggle('dailyHour', h.value)}
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </Group>

      {/* ── 모션 (애니메이션·햅틱) ── */}
      <Group
        label="모션"
        index={4}
        hint="* 기기의 '동작 줄이기' 접근성 설정이 켜져 있으면 애니메이션은 자동으로 꺼집니다."
      >
        <ListRow
          title="햅틱 반응"
          subtitle="버튼·선택 시 가볍게 진동합니다"
          icon="pulse-outline"
          iconTone={haptics ? 'primary' : 'neutral'}
          style={styles.row}
          right={
            <Switch
              value={haptics}
              onValueChange={(v) => { setHaptics(v); if (v) haptic.light(); }}
              {...switchProps(haptics)}
            />
          }
        />
        <Divider inset={sp.lg + 48} />
        <ListRow
          title="애니메이션 줄이기"
          subtitle="화면 전환·카운트업 등의 움직임을 최소화합니다"
          icon="eye-off-outline"
          iconTone={reduceMotion ? 'primary' : 'neutral'}
          style={styles.row}
          right={
            <Switch
              value={reduceMotion}
              onValueChange={setReduceMotion}
              {...switchProps(reduceMotion)}
            />
          }
        />
      </Group>

      {/* ── 데이터 ── */}
      <Group
        label="데이터"
        index={5}
        hint="* 모든 데이터는 이 기기에만 저장되며 외부로 전송되지 않습니다."
      >
        <ListRow
          title="모든 데이터 삭제"
          subtitle="모든 프로필·군생활 데이터를 초기화합니다"
          icon="trash-outline"
          danger
          chevron
          onPress={handleClearData}
          style={styles.row}
        />
      </Group>

      {/* ── 앱 정보 ── */}
      <Group label="앱 정보" index={6}>
        <ListRow
          title="앱 이름"
          icon="information-circle-outline"
          iconTone="neutral"
          value={appInfo.name}
          style={styles.row}
        />
        <Divider inset={sp.lg + 48} />
        <ListRow
          title="버전"
          icon="pricetag-outline"
          iconTone="neutral"
          value={appInfo.version}
          style={styles.row}
        />
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { paddingHorizontal: 0 },
  newBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  hourRow: { flexDirection: 'row', gap: sp.sm, paddingHorizontal: sp.lg, paddingBottom: sp.md },
  summary: { marginTop: sp.md, gap: 2 },
  row: { paddingHorizontal: sp.lg },
});
