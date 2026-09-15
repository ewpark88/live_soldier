/**
 * 로컬 알림 (서버 없이 기기에서 예약)
 * ─────────────────────────────────────────────────────────────────────────
 * 활성 프로필의 입대정보·진급일·일정을 기반으로 전역 D-day·진급·일정 리마인더를
 * 기기 로컬에 예약한다. (원격 푸시 아님 → 서버 불필요)
 *
 * expo-notifications 는 개발 빌드에서만 동작하므로 Expo Go/미설치 환경에서는
 * try/catch 로 우회한다(AdBanner·App 패턴과 동일).
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadMilitaryInfo, loadRankPromotions, loadTodos, listProfiles, loadStreak,
} from './storage';
import { buildRoadmap } from './roadmapUtils';
import { parseDate, formatDate } from './dateUtils';
import { isOfficer } from '../constants/serviceTerms';

const NOTIF_KEY = '@notif_enabled';      // 레거시 마스터 플래그 (write-through 유지)
const PREFS_KEY = '@notif_prefs_v1';
const SIG_KEY = '@notif_sig';            // 마지막으로 예약을 잡았을 때의 입력 해시

/* 채널은 3개로 나눈다. 안드로이드는 채널 생성 후 importance 변경을 무시하므로
   기존 id 를 다른 중요도로 재사용하면 안 된다 — 그래서 새 id 를 판다. */
const CHANNEL_ID = 'discharge-reminders';
const CHANNEL_DAILY = 'daily-nudge';
const CHANNEL_STREAK = 'streak-reminders';

const HOUR = 9;          // 전역·진급·일정 알림 (오전)
const EVENING_HOUR = 21; // 스트릭·마일스톤 전야 (저녁)

/* iOS pending 상한이 64건이다. 캡이 없으면 날짜 있는 일정이 많은 사용자의
   전역 D-Day 알림이 조용히 밀려난다. 우선순위 높은 것부터 먼저 잡는다. */
const MAX_SCHEDULED = 60;

export const DEFAULT_NOTIF_PREFS = {
  master: false,     // 원치 않는 알림은 삭제 유발 1위 — 기본 꺼짐
  discharge: true,
  milestone: true,
  streak: true,
  daily: false,      // 매일 알림은 명시적으로 켜야 한다
  dailyHour: 9,
};

export async function loadNotifPrefs() {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      return { ...DEFAULT_NOTIF_PREFS, ...(v && typeof v === 'object' ? v : {}) };
    }
    // 레거시 단일 스위치에서 승격
    const legacy = await AsyncStorage.getItem(NOTIF_KEY);
    const next = { ...DEFAULT_NOTIF_PREFS, master: legacy === '1' };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

export async function saveNotifPrefs(patch) {
  const cur = await loadNotifPrefs();
  const next = { ...cur, ...patch };
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    // 롤백 안전망 — 구버전이 읽는 키에도 계속 써 둔다
    await AsyncStorage.setItem(NOTIF_KEY, next.master ? '1' : '0');
  } catch {}
  return next;
}

/** FNV-1a 32bit — 시그니처 게이트용 (utils/daily.js 와 동일 알고리즘) */
function _hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return String(h >>> 0);
}

let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Expo Go / 미설치 환경 → 알림 비활성
}

export function isNotifAvailable() {
  return !!Notifications;
}

/** 알림 핸들러 설정 (앱 시작 시 1회) */
export function configureNotificationHandler() {
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        // 구버전 호환
        shouldShowAlert: true,
      }),
    });
  } catch (e) {}
}

async function ensureAndroidChannel() {
  if (!Notifications || Platform.OS !== 'android') return;
  const A = Notifications.AndroidImportance;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '전역 리마인더',
      importance: A.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_STREAK, {
      name: '출석 스트릭',
      importance: A.DEFAULT,
      vibrationPattern: [0, 200],
    });
    // 매일 오는 알림은 조용히 — 배너로 방해하지 않는다
    await Notifications.setNotificationChannelAsync(CHANNEL_DAILY, {
      name: '매일 D-day',
      importance: A.LOW,
    });
  } catch (e) {}
}

/** 마스터 스위치. 기본 꺼짐 — 사용자가 명시적으로 켜야 함 */
export async function isNotifEnabled() {
  return (await loadNotifPrefs()).master;
}

async function setNotifEnabledFlag(on) {
  await saveNotifPrefs({ master: on });
}

/** 권한 요청 → 허용 시 true */
export async function requestPermission() {
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch (e) {
    return false;
  }
}

/** 알림 켜기: 권한 요청 + 플래그 저장 + 예약. 성공 여부 반환 */
export async function enableNotifications() {
  if (!Notifications) return false;
  const ok = await requestPermission();
  if (!ok) return false;
  await setNotifEnabledFlag(true);
  await refreshScheduledNotifications();
  return true;
}

/** 알림 끄기: 모든 예약 취소 + 플래그 저장 */
export async function disableNotifications() {
  await setNotifEnabledFlag(false);
  if (!Notifications) return;
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (e) {}
}

/* 예약 카운터 — 한 번의 refresh 안에서만 유효하다 */
let _scheduled = 0;

/**
 * 미래 시각에 알림 1건 예약.
 * 60건 캡에 걸리면 조용히 건너뛴다 (우선순위가 높은 것부터 호출된다).
 */
async function scheduleAt(dateStr, title, body, opts = {}) {
  if (!Notifications) return false;
  if (_scheduled >= MAX_SCHEDULED) return false;

  const { hour = HOUR, channel = CHANNEL_ID } = opts;
  const when = parseDate(dateStr);
  if (!when) return false;
  when.setHours(hour, 0, 0, 0);
  if (when.getTime() <= Date.now()) return false; // 과거는 스킵

  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, ...(Platform.OS === 'android' ? { channelId: channel } : {}) },
      trigger: Platform.OS === 'android'
        ? { type: 'date', channelId: channel, date: when }
        : { type: 'date', date: when },
    });
    _scheduled += 1;
  } catch (e) {}
}

/**
 * 매일 반복 알림 1건.
 *
 * 날짜별로 365건을 잡으면 iOS 상한(64)을 즉시 넘긴다. 반복 트리거는 딱 1건만
 * 차지하고 재부팅에도 살아남는다. 대신 본문에 D-숫자를 박을 수 없어서 정적
 * 문구를 쓴다 — 매일 알림에선 그게 맞는 절충이다.
 */
async function scheduleDaily(hour, title, body) {
  if (!Notifications) return false;
  if (_scheduled >= MAX_SCHEDULED) return false;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, ...(Platform.OS === 'android' ? { channelId: CHANNEL_DAILY } : {}) },
      trigger: Platform.OS === 'android'
        ? { type: 'daily', channelId: CHANNEL_DAILY, hour, minute: 0 }
        : { type: 'daily', hour, minute: 0 },
    });
    _scheduled += 1;
  } catch (e) {}
}

/** 로컬 달력 기준 오늘. toISOString 은 UTC 라 KST 에선 하루 어긋난다. */
function _todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dd}`;
}

function addDaysStr(dateStr, n) {
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

/**
 * 활성 프로필 데이터 기반으로 모든 리마인더 재예약.
 *
 * 시그니처 게이트 ─────────────────────────────────────────────────
 * 예전엔 홈 탭에 포커스가 갈 때마다 "전체 취소 + 최대 20건 직렬 재예약"이
 * 통째로 돌았다. 탭을 한 번 옮길 때마다 네이티브 브리지를 20번 왕복한 셈이다.
 * 이제 예약에 영향을 주는 값들만 해시로 뽑아, 바뀐 게 없고 예약도 살아 있으면
 * AsyncStorage 읽기 한 번으로 끝낸다.
 *
 * @param {{force?: boolean}} opts  force 면 게이트를 무시하고 다시 잡는다
 */
let _refreshing = null;   // 진행 중인 재예약
let _rerun = null;        // 진행 중에 들어온 요청 (null 이면 없음)

/**
 * 재예약 직렬화.
 *
 * 앱 시작 시 App.js 와 StreakProvider.onCheckIn 이 거의 동시에 부른다.
 * 서명에 '오늘'이 들어간 뒤로는 둘 다 게이트를 통과하므로, 그대로 두면 서로의
 * cancelAllScheduledNotificationsAsync() 가 상대 예약을 지우고 모듈 전역
 * _scheduled 카운터까지 뒤엉킨다.
 *
 * 진행 중에 또 불리면 즉시 실행하지 않고 '끝나면 한 번 더'로 예약한다.
 * 진행 중인 약속을 그냥 돌려주면, 그 사이에 바뀐 일정·설정이 반영되지 않는다.
 * force 요청이 하나라도 섞이면 재실행도 force 로 돈다.
 */
export function refreshScheduledNotifications(opts) {
  const o = opts || {};
  if (_refreshing) {
    _rerun = { force: !!(o.force || (_rerun && _rerun.force)) };
    return _refreshing;
  }
  _refreshing = _refreshScheduledNotifications(o)
    .finally(() => {
      _refreshing = null;
      const next = _rerun;
      _rerun = null;
      if (next) refreshScheduledNotifications(next).catch(() => {});
    });
  return _refreshing;
}

async function _refreshScheduledNotifications({ force = false } = {}) {
  if (!Notifications) return;
  if (!(await isNotifEnabled())) return;

  const info = await loadMilitaryInfo();
  if (!info?.dischargeDate || !info?.enlistDate) return;

  let name = '';
  try {
    const { activeId, profiles } = await listProfiles();
    name = profiles.find((p) => p.id === activeId)?.name ?? '';
  } catch (e) {}
  const who = name ? `${name} · ` : '';

  const prefs = await loadNotifPrefs();

  // 스트릭 리마인더는 '내일 저녁' 1건만 미래에 두고 매일 다시 잡아야 한다.
  // 그래서 오늘 날짜와 스트릭 상태가 서명에 들어가야 한다 (아래 주석 참고).
  const streakForSig = prefs.streak ? await loadStreak().catch(() => null) : null;

  const promoForSig = isOfficer(info.personnelType)
    ? null
    : await loadRankPromotions(info.enlistDate).catch(() => null);
  let todosForSig = [];
  try { todosForSig = await loadTodos(); } catch (e) {}

  const sig = _hash(JSON.stringify({
    // 스트릭 알림이 켜져 있으면 '오늘'을 서명에 넣어 하루 한 번은 반드시
    // 다시 잡히게 한다. 예전에는 서명에 날짜가 없어서, 이틀째부터는 서명이
    // 같고 전역 D-100 같은 장기 예약이 pending 에 남아 있다는 이유로 그대로
    // 빠져나갔다. 그 결과 '앱을 열면 다음 날로 밀린다'가 동작하지 않아
    // 이미 출석한 사람에게도 알림이 울렸고, 한 번 울린 뒤에는 다시 예약되지
    // 않아 기능이 조용히 멈췄다.
    day: prefs.streak ? _todayStr() : null,
    streak: streakForSig ? streakForSig.current : null,
    lastCheck: streakForSig ? streakForSig.last ?? null : null,
    disc: info.dischargeDate,
    enlist: info.enlistDate,
    type: info.personnelType,
    promo: promoForSig,
    name,
    prefs,
    todos: todosForSig
      .filter((t) => !t.done && t.date)
      .map((t) => `${t.id}|${t.date}|${t.title ?? ''}`)
      .sort(),
  }));

  if (!force) {
    try {
      const prev = await AsyncStorage.getItem(SIG_KEY);
      if (prev === sig) {
        const pending = await Notifications.getAllScheduledNotificationsAsync();
        if (pending.length) return;   // 바뀐 것도 없고 예약도 살아 있다
      }
    } catch (e) {}
  }

  await ensureAndroidChannel();
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (e) {}

  // 60건 캡을 이 순서대로 소진한다: 전역 > 진급 > 마일스톤 전야 > 스트릭 > 일정 > 매일
  _scheduled = 0;

  const disc = info.dischargeDate;
  // 전역 하루 전 09시 알림이 실제로 잡혔는지 — 전야(21시) 억제 여부를 여기에 건다
  let dischargeEveScheduled = false;

  if (prefs.discharge) {
    await scheduleAt(addDaysStr(disc, -100), '전역 D-100 🔥', `${who}전역까지 100일 남았어요! 이제 보입니다.`);
    await scheduleAt(addDaysStr(disc, -30),  '전역 D-30 🔥',  `${who}전역 한 달 전! 가장 설레는 시기예요.`);
    await scheduleAt(addDaysStr(disc, -7),   '전역 D-7 🏆',   `${who}전역까지 일주일! 끝까지 무사고로.`);
    dischargeEveScheduled = await scheduleAt(addDaysStr(disc, -1), '전역 D-1 🎖️', `${who}내일이면 전역입니다! 마지막 밤 잘 보내요.`);
    await scheduleAt(disc,                    '전역을 축하합니다! 🎉', `${who}국방의 의무를 마쳤습니다. 정말 고생 많았어요!`);

    await scheduleAt(addDaysStr(info.enlistDate, 99), '입대 100일 💯', `${who}벌써 입대 100일! 잘 적응하고 있어요.`);

    if (!isOfficer(info.personnelType) && promoForSig) {
      const promo = promoForSig;
      if (promo.일병) await scheduleAt(promo.일병, '일병 진급 🎖️', `${who}오늘은 일병 진급일이에요. 축하해요!`);
      if (promo.상병) await scheduleAt(promo.상병, '상병 진급 🎖️', `${who}오늘은 상병 진급일이에요. 축하해요!`);
      if (promo.병장) await scheduleAt(promo.병장, '병장 진급 👑', `${who}오늘은 병장 진급일이에요. 최고참!`);
    }
  }

  // 마일스톤 전야 — 향후 180일 이내만 (최대 7건으로 유계)
  //
  // 전야 알림은 마일스톤 '하루 전' 21시, discharge 블록은 '당일' 09시다.
  // 따라서 둘이 같은 날에 겹치는 건 전역뿐이다 —
  // 'D-1'(전역 하루 전 09시) 과 '내일은 전역!'(전역 하루 전 21시).
  // 입대 100일·진급일은 전야와 당일이 서로 다른 날이라 의도된 한 쌍이다.
  //
  // 단, D-1 이 '실제로 잡혔을 때'만 억제한다. 전역 전날 09시가 지난 뒤 앱을
  // 열면 D-1 은 과거라 건너뛰는데, 그때 전야까지 막으면 전역 전날에 알림이
  // 하나도 가지 않는다 — 이 앱에서 가장 중요한 알림이다.
  const coveredByDischarge = new Set();
  if (dischargeEveScheduled) coveredByDischarge.add('discharge');

  if (prefs.milestone) {
    const roadmap = buildRoadmap(info, promoForSig);
    for (const ms of roadmap) {
      if (ms.done || ms.dday > 180) continue;
      if (coveredByDischarge.has(ms.key)) continue;
      await scheduleAt(
        addDaysStr(ms.dateStr, -1),
        `내일은 ${ms.label}! ${ms.emoji ?? '🎖️'}`,
        `${who}하루 뒤예요. 잊지 말고 챙기세요.`,
        { hour: EVENING_HOUR }
      );
    }
  }

  // 스트릭 위험 리마인더 — 항상 "내일 저녁" 딱 1건만 미래에 둔다.
  // 조건부 로컬 알림은 만들 수 없으므로, 앱을 열 때마다 취소·재예약해서
  // "안 열면 울리고, 열면 다음 날로 밀린다"를 만든다. 서버 없이 조건부 알림을
  // 구현한 것과 동치다.
  if (prefs.streak) {
    const count = streakForSig?.current ?? 0;
    const body = count > 1
      ? `${count}일 연속 기록이 걸려 있어요.`
      : '오늘 하루도 기록해두면 내일이 조금 더 가벼워요.';
    await scheduleAt(
      addDaysStr(_todayStr(), 1),
      '오늘 출석 아직이에요 🔥',
      body,
      { hour: EVENING_HOUR, channel: CHANNEL_STREAK }
    );
  }

  // 일정(일자 있는 항목) — 당일 오전 알림
  for (const t of todosForSig) {
    if (t.done || !t.date) continue;
    await scheduleAt(t.date, '오늘 일정 📌', `${who}${t.title || '일정'}`);
  }

  // 매일 D-day 넛지 — 반복 트리거 1건 (기본 꺼짐)
  if (prefs.daily) {
    await scheduleDaily(prefs.dailyHour ?? 9, '오늘도 전역까지 한 걸음 🪖', `${who}앱에서 남은 일수를 확인해보세요.`);
  }

  try { await AsyncStorage.setItem(SIG_KEY, sig); } catch (e) {}
}
