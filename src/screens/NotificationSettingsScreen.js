import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Screen, AppHeader, Section, ListRow, ListGroup, Chip, SegmentedControl, Txt,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { useThemeColors } from '../theme/ThemeContext';
import { loadMilitaryInfo } from '../utils/storage';
import { haptic } from '../utils/haptics';
import { guardSave, SAVE_FAILED } from '../utils/saveGuard';
import {
  NOTIF_EVENTS, DEFAULT_NOTIF_PREFS,
  enableNotifications, disableNotifications, isNotifAvailable, getNotifPermission,
  loadNotifPrefs, saveNotifPrefs, loadNotifPlan, refreshScheduledNotifications,
} from '../utils/notifications';
import { isOfficer } from '../constants/serviceTerms';
import { space as sp } from '../theme/tokens';

const GROUPS = [
  { key: 'service', label: '전역·복무' },
  { key: 'life', label: '휴가·일정·월급' },
  { key: 'habit', label: '습관' },
];

const DAILY_HOURS = [
  { value: 8, label: '아침 8시' },
  { value: 12, label: '점심 12시' },
  { value: 21, label: '저녁 9시' },
];

const TODO_TIMING_OPTIONS = [
  { key: 'morning', label: '당일 아침 9시' },
  { key: 'eve', label: '전날 저녁 9시' },
  { key: 'both', label: '둘 다' },
];

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

/** 1735689600000 → '12월 3일 (수) 오전 9시' */
function fmtWhen(ms) {
  const d = new Date(ms);
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]}) ${ampm} ${h12}시`;
}

function fmtHour(h) {
  return `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}시`;
}

/**
 * 알림 설정 (2단계).
 *
 * 내 정보 탭엔 '알림' 한 줄만 두고, 이벤트별 스위치는 여기서 켜고 끈다.
 * 예전엔 다섯 개 스위치가 내 정보 탭 한가운데 펼쳐져 있었고, '전역·진급' 한 스위치가
 * 진급일·입대 100일까지 묶어서 껐다. 일정 알림은 아예 끌 수 없었다.
 *
 * 각 행 아래에 '다음 알림'을 보여준다 — 알림이 정말 잡혀 있는지 사용자가 직접
 * 확인할 수 있어야 "알림이 안 와요"를 줄인다.
 */
export default function NotificationSettingsScreen() {
  const tc = useThemeColors();

  const [prefs, setPrefs] = useState(DEFAULT_NOTIF_PREFS);
  const [busy, setBusy] = useState(false);
  const [perm, setPerm] = useState({ status: 'undetermined', canAskAgain: true });
  const [plan, setPlan] = useState([]);
  const [officer, setOfficer] = useState(false);
  const [hasInfo, setHasInfo] = useState(true);
  const alive = useRef(true);

  useEffect(() => () => { alive.current = false; }, []);

  const reload = useCallback(async () => {
    const [p, pm, pl, mi] = await Promise.all([
      loadNotifPrefs(), getNotifPermission(), loadNotifPlan(), loadMilitaryInfo().catch(() => null),
    ]);
    if (!alive.current) return;
    setPrefs(p);
    setPerm(pm);
    setPlan(p.master ? pl : []);
    setOfficer(isOfficer(mi?.personnelType));
    setHasInfo(!!(mi?.enlistDate && mi?.dischargeDate));
  }, []);

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  /* 설정 앱에서 권한을 켜고 돌아오면 바로 반영하고 예약을 다시 잡는다 */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      getNotifPermission().then(async (pm) => {
        if (!alive.current) return;
        const wasDenied = perm.status !== 'granted';
        setPerm(pm);
        if (wasDenied && pm.status === 'granted' && prefs.master) {
          await refreshScheduledNotifications({ force: true }).catch(() => {});
          reload();
        }
      });
    });
    return () => sub.remove();
  }, [perm.status, prefs.master, reload]);

  const openSystemSettings = () => {
    Linking.openSettings().catch(() => {});
  };

  /* 이벤트 키 → 가장 가까운 예약 1건 */
  const nextByEvent = useMemo(() => {
    const m = {};
    for (const x of plan) if (!m[x.event]) m[x.event] = x;
    return m;
  }, [plan]);

  const upcoming = useMemo(() => plan.filter((x) => x.at != null).slice(0, 5), [plan]);

  const switchProps = (on, label, disabled) => ({
    trackColor: { false: tc.border, true: tc.primaryLight },
    thumbColor: Platform.OS === 'android' ? (on ? tc.primary : tc.card) : undefined,
    accessibilityLabel: label,
    accessibilityRole: 'switch',
    disabled,
  });

  const handleMaster = async (next) => {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        if (!isNotifAvailable()) {
          haptic.warning();
          Alert.alert('알림 사용 불가', 'Expo Go에서는 알림을 사용할 수 없어요. 빌드된 앱에서 이용해주세요.');
          return;
        }
        const ok = await enableNotifications();
        if (ok) {
          haptic.success();
        } else {
          haptic.warning();
          const pm = await getNotifPermission();
          if (pm.status === 'denied' && !pm.canAskAgain) {
            Alert.alert(
              '알림 권한이 꺼져 있어요',
              '휴대폰 설정 → 앱 → 전역까지 → 알림에서 허용해 주세요.',
              [{ text: '취소', style: 'cancel' }, { text: '설정 열기', onPress: openSystemSettings }]
            );
          } else {
            Alert.alert('권한 필요', '알림을 받으려면 알림 권한을 허용해 주세요.');
          }
        }
      } else {
        await disableNotifications();
      }
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const savePatch = async (patch) => {
    // 낙관적 반영 → 실패하면 되돌린다
    const prev = prefs;
    setPrefs({ ...prev, ...patch });
    haptic.select();
    const next = await guardSave(() => saveNotifPrefs(patch));
    if (next === SAVE_FAILED) { setPrefs(prev); return; }
    setPrefs(next);
    // 예약 구성이 바뀌었으므로 시그니처 게이트를 건너뛰고 다시 잡는다
    await refreshScheduledNotifications({ force: true }).catch(() => {});
    if (alive.current) setPlan(await loadNotifPlan());
  };

  const master = !!prefs.master;
  const permBlocked = master && perm.status !== 'granted' && perm.status !== 'unavailable';

  const subtitleFor = (ev) => {
    if (ev.key === 'todo') {
      const t = TODO_TIMING_OPTIONS.find((o) => o.key === prefs.todoTiming);
      return `할 일 · ${t ? t.label : ''}`;
    }
    if (ev.key === 'daily') return `매일 ${fmtHour(prefs.dailyHour ?? 9)}`;
    return ev.desc;
  };

  const nextLine = (ev) => {
    if (!master || !prefs[ev.key]) return null;
    const n = nextByEvent[ev.key];
    if (!n) return '예약된 알림 없음';
    if (n.daily != null) return `매일 ${fmtHour(n.daily)}`;
    return `다음 · ${fmtWhen(n.at)}`;
  };

  const renderEvent = (ev) => {
    const on = !!prefs[ev.key];
    const next = nextLine(ev);
    return (
      <ListRow
        key={ev.key}
        title={ev.title}
        subtitle={next ? `${subtitleFor(ev)}\n${next}` : subtitleFor(ev)}
        icon={ev.icon}
        iconTone={master && on ? 'primary' : 'neutral'}
        disabled={!master}
        right={
          <Switch
            value={on}
            onValueChange={(v) => savePatch({ [ev.key]: v })}
            {...switchProps(on, ev.title, !master)}
          />
        }
      />
    );
  };

  return (
    <Screen
      standalone
      ad={AD_UNITS.SALARY_MIDDLE}
      header={<AppHeader title="알림" subtitle="이벤트마다 따로 켜고 끕니다" back />}
    >
      {/* ── 마스터 ── */}
      <Section index={0} gap={sp.xl}>
        <ListGroup
          footnote={hasInfo ? undefined : '* 전역 정보를 먼저 입력해야 알림을 예약할 수 있어요.'}
        >
          <ListRow
            title="알림 받기"
            subtitle={master ? '아래에서 받을 알림을 고르세요' : '꺼져 있어요 — 켜면 권한을 요청합니다'}
            icon="notifications-outline"
            iconTone={master ? 'primary' : 'neutral'}
            right={
              <Switch
                value={master}
                onValueChange={handleMaster}
                {...switchProps(master, '알림 받기', busy)}
              />
            }
          />
          {permBlocked ? (
            <ListRow
              title="휴대폰 알림 권한이 꺼져 있어요"
              subtitle="눌러서 설정에서 허용해 주세요 — 지금은 알림이 오지 않아요"
              icon="alert-circle-outline"
              danger
              chevron
              onPress={openSystemSettings}
            />
          ) : null}
        </ListGroup>
      </Section>

      {/* ── 이벤트별 ── */}
      {GROUPS.map((g, gi) => (
        <Section key={g.key} index={gi + 1} gap={sp.xl}>
          <ListGroup label={g.label}>
            {NOTIF_EVENTS
              .filter((ev) => ev.group === g.key && !(ev.soldierOnly && officer))
              .map(renderEvent)}
            {g.key === 'life' && master && prefs.todo ? (
              <View key="todoTiming" style={styles.optionRow}>
                <Txt role="caption" tone="secondary">일정 알림 시각</Txt>
                <SegmentedControl
                  options={TODO_TIMING_OPTIONS}
                  value={prefs.todoTiming}
                  onChange={(k) => savePatch({ todoTiming: k })}
                />
              </View>
            ) : null}
            {g.key === 'habit' && master && prefs.daily ? (
              <View key="dailyHour" style={styles.optionRow}>
                <Txt role="caption" tone="secondary">매일 알림 시각</Txt>
                <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="매일 알림 시각">
                  {DAILY_HOURS.map((h) => (
                    <Chip
                      key={h.value}
                      label={h.label}
                      size="sm"
                      selected={prefs.dailyHour === h.value}
                      onPress={() => savePatch({ dailyHour: h.value })}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </ListGroup>
        </Section>
      ))}

      {/* ── 예약 현황 ── */}
      <Section index={GROUPS.length + 1} gap={sp.lg}>
        <ListGroup
          label="다가오는 알림"
          footnote="* 알림은 이 기기에서만 예약되며, 현재 선택된 프로필 기준으로 발송됩니다. 배터리 절약 모드에서는 몇 분 늦게 올 수 있어요."
        >
          {master && upcoming.length
            ? upcoming.map((x, i) => (
              <ListRow
                key={`${x.event}-${x.at}-${i}`}
                title={x.title}
                subtitle={fmtWhen(x.at)}
                icon={NOTIF_EVENTS.find((e) => e.key === x.event)?.icon ?? 'notifications-outline'}
                iconTone="neutral"
              />
            ))
            : (
              <ListRow
                key="empty"
                title={master ? '예약된 알림이 없어요' : '알림이 꺼져 있어요'}
                subtitle={master ? '켜 둔 이벤트 중 다가오는 일정이 없어요' : '위에서 알림 받기를 켜 주세요'}
                icon="time-outline"
                iconTone="neutral"
              />
            )}
        </ListGroup>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  optionRow: { gap: sp.sm, paddingVertical: sp.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
});
