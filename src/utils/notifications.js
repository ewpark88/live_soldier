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
  loadLeaveRecords,
} from './storage';
import { buildRoadmap } from './roadmapUtils';
import { parseDate, formatDate } from './dateUtils';
import { getNextPayday, paydayOf } from './upcoming';
import { isOfficer } from '../constants/serviceTerms';

const NOTIF_KEY = '@notif_enabled';      // 레거시 마스터 플래그 (write-through 유지)
const PREFS_KEY = '@notif_prefs_v1';
const PROMPT_KEY = '@notif_prompt_v1';   // 입대일 입력 후 알림 안내를 한 번 보여줬나
const SIG_KEY = '@notif_sig';            // 마지막으로 예약을 잡았을 때의 입력 해시
const PLAN_KEY = '@notif_plan_v1';       // 마지막으로 잡은 예약 목록 (설정 화면 '다음 알림' 표시용)

/* 예약 구성(이벤트·채널)이 바뀌면 올린다 — 서명에 들어가서 업데이트 직후 첫 실행에
   옛 채널로 잡힌 예약이 반드시 새로 잡힌다. */
const SCHEMA = 2;

/* 채널은 4개로 나눈다. 안드로이드는 채널 생성 후 importance 변경을 무시하므로
   기존 id 를 다른 중요도로 재사용하면 안 된다 — 그래서 새 id 를 판다.

   v1.4: 전역·진급과 휴가·일정·월급은 HIGH(화면 상단 팝업). 예전 채널은 DEFAULT·LOW
   였는데, DEFAULT 는 상태바 아이콘만, LOW 는 소리도 없이 알림창에만 쌓여서
   "알림이 안 온다"로 읽혔다. 둘 다 1년에 몇 번 오는 알림이라 팝업이 맞다. */
const CHANNEL_SERVICE = 'service-alerts';      // 전역·진급·마일스톤
const CHANNEL_LIFE = 'life-alerts';            // 휴가·일정·월급날
const CHANNEL_STREAK = 'streak-reminders';
const CHANNEL_DAILY = 'daily-dday';
const LEGACY_CHANNELS = ['discharge-reminders', 'daily-nudge'];

const HOUR = 9;          // 전역·진급·일정 알림 (오전)
const EVENING_HOUR = 21; // 스트릭·마일스톤 전야 (저녁)

/* iOS pending 상한이 64건이다. 캡이 없으면 날짜 있는 일정이 많은 사용자의
   전역 D-Day 알림이 조용히 밀려난다. 우선순위 높은 것부터 먼저 잡는다. */
const MAX_SCHEDULED = 60;

export const DEFAULT_NOTIF_PREFS = {
  master: false,     // 원치 않는 알림은 삭제 유발 1위 — 기본 꺼짐
  discharge: true,   // 전역 D-100·30·7·1·당일
  promotion: true,   // 진급일 당일 (병사)
  milestone: true,   // 입대 100일 당일 + 마일스톤 전날 저녁
  leave: true,       // 휴가 전날 저녁
  todo: true,        // 날짜 있는 일정
  todoTiming: 'morning',   // 'morning' 당일 09시 | 'eve' 전날 21시 | 'both'
  payday: true,      // 월급날 오전
  streak: true,
  daily: false,      // 매일 알림은 명시적으로 켜야 한다
  dailyHour: 9,
};

export const TODO_TIMINGS = ['morning', 'eve', 'both'];

/**
 * 이벤트 목록 — 설정 화면이 이 순서대로 그리고, 예약도 이 키로 켜고 끈다.
 * route 는 알림을 눌렀을 때 열 화면이다 (navigationRef.openNotificationRoute).
 */
export const NOTIF_EVENTS = [
  { key: 'discharge', group: 'service', route: 'roadmap', title: '전역 D-day', desc: 'D-100·30·7·1·당일 오전 9시', icon: 'flag-outline' },
  { key: 'promotion', group: 'service', route: 'roadmap', title: '진급일', desc: '일병·상병·병장 진급 당일 오전 9시', icon: 'chevron-up-circle-outline', soldierOnly: true },
  { key: 'milestone', group: 'service', route: 'roadmap', title: '마일스톤', desc: '입대 100일 · 반환점 등 전날 저녁 9시', icon: 'trophy-outline' },
  { key: 'leave', group: 'life', route: 'calendar', title: '휴가 전날', desc: '휴가 시작 전날 저녁 9시', icon: 'airplane-outline' },
  { key: 'todo', group: 'life', route: 'calendar', title: '일정', desc: '날짜를 정한 할 일', icon: 'checkbox-outline' },
  { key: 'payday', group: 'life', route: 'salary', title: '월급날', desc: '매월 10일(주말이면 금요일) 오전 9시', icon: 'wallet-outline' },
  { key: 'streak', group: 'habit', route: 'home', title: '출석 스트릭', desc: '앱을 안 연 날 저녁 9시', icon: 'flame-outline' },
  { key: 'daily', group: 'habit', route: 'home', title: '매일 D-day', desc: '정한 시각에 매일 한 번', icon: 'today-outline' },
];

/**
 * 저장된 값 → 현재 스키마. 순수 함수 (테스트가 직접 부른다).
 * v1.3 까지 '전역·진급 알림' 스위치 하나가 진급일까지 묶어 끄고 켰다 — 그 값을
 * 새 promotion 스위치로 물려준다. 일정 알림은 끌 수 없었으니 켜진 상태로 시작한다.
 */
export function normalizeNotifPrefs(v) {
  const src = v && typeof v === 'object' ? v : {};
  const out = { ...DEFAULT_NOTIF_PREFS, ...src };
  if (!('promotion' in src) && 'discharge' in src) out.promotion = !!src.discharge;
  if (!TODO_TIMINGS.includes(out.todoTiming)) out.todoTiming = DEFAULT_NOTIF_PREFS.todoTiming;
  const h = Number(out.dailyHour);
  out.dailyHour = Number.isInteger(h) && h >= 0 && h <= 23 ? h : DEFAULT_NOTIF_PREFS.dailyHour;
  return out;
}

export async function loadNotifPrefs() {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) return normalizeNotifPrefs(JSON.parse(raw));
    // 레거시 단일 스위치에서 승격
    const legacy = await AsyncStorage.getItem(NOTIF_KEY);
    const next = { ...DEFAULT_NOTIF_PREFS, master: legacy === '1' };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return { ...DEFAULT_NOTIF_PREFS };
  }
}

/* 설정 쓰기 직렬화 — 스위치를 빠르게 연달아 바꾸면 '읽기 → 고치기 → 쓰기'가
   겹쳐 앞의 변경이 사라졌다. */
let _prefsChain = Promise.resolve();

/**
 * 알림 설정 저장. **실패하면 던진다** — 예전엔 쓰기 오류를 삼키고 새 값을
 * 돌려줘서, 저장되지 않은 스위치가 화면에서는 바뀐 것처럼 보였다.
 */
export function saveNotifPrefs(patch) {
  const run = _prefsChain.then(async () => {
    const cur = await loadNotifPrefs();
    const next = { ...cur, ...patch };
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
    // 롤백 안전망 — 구버전이 읽는 키에도 계속 써 둔다
    try { await AsyncStorage.setItem(NOTIF_KEY, next.master ? '1' : '0'); } catch {}
    return next;
  });
  _prefsChain = run.catch(() => {});
  return run;
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
  const PUBLIC = Notifications.AndroidNotificationVisibility?.PUBLIC;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_SERVICE, {
      name: '전역·진급·마일스톤',
      description: '전역 D-day, 진급일, 입대 100일·반환점 같은 이정표',
      importance: A.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      ...(PUBLIC != null ? { lockscreenVisibility: PUBLIC } : {}),
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_LIFE, {
      name: '휴가·일정·월급날',
      description: '휴가 전날, 일정 당일·전날, 월급날',
      importance: A.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      ...(PUBLIC != null ? { lockscreenVisibility: PUBLIC } : {}),
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_STREAK, {
      name: '출석 스트릭',
      importance: A.DEFAULT,
      vibrationPattern: [0, 200],
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_DAILY, {
      name: '매일 D-day',
      importance: A.DEFAULT,
    });
  } catch (e) {}
  // 옛 채널은 지운다 — 남겨 두면 시스템 알림 설정에 같은 이름이 두 벌 보인다.
  // (이 함수는 전체 취소·재예약 직전에만 불리므로 옛 채널에 걸린 예약은 곧 사라진다)
  for (const id of LEGACY_CHANNELS) {
    try { await Notifications.deleteNotificationChannelAsync?.(id); } catch (e) {}
  }
}

/** 마스터 스위치. 기본 꺼짐 — 사용자가 명시적으로 켜야 함 */
export async function isNotifEnabled() {
  return (await loadNotifPrefs()).master;
}

async function setNotifEnabledFlag(on) {
  try {
    await saveNotifPrefs({ master: on });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * OS 알림 권한 상태.
 * @returns {Promise<{status: 'granted'|'denied'|'undetermined'|'unavailable', canAskAgain: boolean}>}
 *   denied 면서 canAskAgain 이 false 면 앱 안에서 다시 물을 수 없다 — 설정 앱으로 보내야 한다.
 */
export async function getNotifPermission() {
  if (!Notifications) return { status: 'unavailable', canAskAgain: false };
  try {
    const p = await Notifications.getPermissionsAsync();
    return { status: p.status, canAskAgain: p.canAskAgain !== false };
  } catch (e) {
    return { status: 'undetermined', canAskAgain: true };
  }
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
  if (!(await setNotifEnabledFlag(true))) return false;
  await refreshScheduledNotifications({ force: true });
  return true;
}

/**
 * 입대일 입력 뒤 홈에서 '알림 받을래요?' 안내를 띄울지.
 * 기본이 꺼짐이라 설정 → 알림을 찾아 들어가지 않으면 알림을 한 번도 못 받았다.
 * **한 번만** 묻는다 — 거절·닫기도 기록한다 (재촉은 삭제 사유다).
 * 이미 켜져 있거나, OS 가 다시 묻지 못하게 막아 둔 상태(denied + !canAskAgain)면 묻지 않는다.
 */
export async function shouldOfferNotifPrompt() {
  if (!Notifications) return false;
  try {
    if (await AsyncStorage.getItem(PROMPT_KEY)) return false;
  } catch (e) {
    return false;   // 읽기 실패 시 묻지 않는 쪽으로 — 매 실행마다 뜨는 것보다 낫다
  }
  if ((await loadNotifPrefs()).master) return false;
  const pm = await getNotifPermission();
  return !(pm.status === 'denied' && !pm.canAskAgain);
}

/** 안내를 봤다고 기록. 실패해도 조용히 — 최악은 다음 실행에 한 번 더 뜨는 것 */
export async function markNotifPromptDone() {
  try { await AsyncStorage.setItem(PROMPT_KEY, '1'); } catch (e) {}
}

/** 알림 끄기: 모든 예약 취소 + 플래그 저장 */
export async function disableNotifications() {
  await setNotifEnabledFlag(false);
  await _clearAll();
}

async function _clearAll() {
  try { await AsyncStorage.multiRemove([SIG_KEY, PLAN_KEY]); } catch (e) {}
  if (!Notifications) return;
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (e) {}
}

/**
 * 마지막으로 잡은 예약 목록 — 설정 화면의 '다음 알림'.
 * 지난 항목은 걸러서 시각순으로 돌려준다. 매일 반복은 { daily: hour } 로 온다.
 * @returns {Promise<Array<{event, title, body, at?: number, daily?: number}>>}
 */
export async function loadNotifPlan() {
  try {
    const raw = await AsyncStorage.getItem(PLAN_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    const now = Date.now();
    return list
      .filter((x) => x && (x.daily != null || (typeof x.at === 'number' && x.at > now)))
      .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity));
  } catch (e) {
    return [];
  }
}

const EVENT_CHANNEL = {
  discharge: CHANNEL_SERVICE, promotion: CHANNEL_SERVICE, milestone: CHANNEL_SERVICE,
  leave: CHANNEL_LIFE, todo: CHANNEL_LIFE, payday: CHANNEL_LIFE,
  streak: CHANNEL_STREAK, daily: CHANNEL_DAILY,
};
const EVENT_ROUTE = Object.fromEntries(NOTIF_EVENTS.map((e) => [e.key, e.route]));

function _content(event, title, body) {
  const ch = EVENT_CHANNEL[event];
  const high = ch === CHANNEL_SERVICE || ch === CHANNEL_LIFE;
  const P = Notifications?.AndroidNotificationPriority;
  return {
    title,
    body,
    sound: 'default',
    // 채널이 없는 안드로이드 7 이하는 이 값으로 팝업 여부가 갈린다
    ...(P ? { priority: high ? P.HIGH : P.DEFAULT } : {}),
    data: { event, route: EVENT_ROUTE[event] ?? 'home' },
  };
}

/**
 * 알림을 눌러 앱이 열렸을 때 이벤트의 화면으로 보낸다.
 * 앱이 꺼져 있다가 알림으로 켜진 경우(getLastNotificationResponseAsync)도 받는다.
 * @param {(route: string) => void} onRoute
 * @returns {() => void} 구독 해제
 */
export function subscribeNotificationTaps(onRoute) {
  if (!Notifications) return () => {};
  const handle = (resp) => {
    try {
      const route = resp?.notification?.request?.content?.data?.route;
      if (typeof route === 'string') onRoute(route);
    } catch (e) {}
  };
  let sub = null;
  try { sub = Notifications.addNotificationResponseReceivedListener(handle); } catch (e) {}
  try {
    Notifications.getLastNotificationResponseAsync?.()
      .then((r) => {
        if (!r) return;
        handle(r);
        // 다음 실행에서 같은 응답을 다시 처리하지 않게
        try { Notifications.clearLastNotificationResponseAsync?.(); } catch (e) {}
      })
      .catch(() => {});
  } catch (e) {}
  return () => { try { sub?.remove(); } catch (e) {} };
}

/* 예약 카운터·목록 — 한 번의 refresh 안에서만 유효하다 */
let _scheduled = 0;
let _plan = [];

/**
 * 미래 시각에 알림 1건 예약.
 * 60건 캡에 걸리면 조용히 건너뛴다 (우선순위가 높은 것부터 호출된다).
 *
 * @returns {Promise<boolean>} 실제로 예약됐는지. 호출부가 이 값으로 중복 제거를
 *   판단하므로, 모든 경로가 반드시 boolean 을 돌려줘야 한다.
 */
async function scheduleAt(event, dateStr, title, body, opts = {}) {
  if (!Notifications) return false;
  if (_scheduled >= MAX_SCHEDULED) return false;

  const { hour = HOUR } = opts;
  const channel = EVENT_CHANNEL[event] ?? CHANNEL_SERVICE;
  const when = parseDate(dateStr);
  if (!when) return false;
  when.setHours(hour, 0, 0, 0);
  if (when.getTime() <= Date.now()) return false; // 과거는 스킵

  try {
    await Notifications.scheduleNotificationAsync({
      content: _content(event, title, body),
      trigger: Platform.OS === 'android'
        ? { type: 'date', channelId: channel, date: when }
        : { type: 'date', date: when },
    });
    _scheduled += 1;
    _plan.push({ event, title, body, at: when.getTime() });
    return true;
  } catch (e) {
    return false;
  }
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
      content: _content('daily', title, body),
      trigger: Platform.OS === 'android'
        ? { type: 'daily', channelId: CHANNEL_DAILY, hour, minute: 0 }
        : { type: 'daily', hour, minute: 0 },
    });
    _scheduled += 1;
    _plan.push({ event: 'daily', title, body, daily: hour });
    return true;
  } catch (e) {
    return false;
  }
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
  // 반환 약속은 '끝나면 한 번 더'까지 기다린다 — 설정 화면이 이 약속 뒤에
  // '다음 알림' 목록을 다시 읽는데, 재실행 전에 풀리면 옛 목록이 보인다.
  _refreshing = _refreshScheduledNotifications(o)
    .catch(() => {})
    .then(() => {
      _refreshing = null;
      const next = _rerun;
      _rerun = null;
      if (next) return refreshScheduledNotifications(next);
      return undefined;
    });
  return _refreshing;
}

async function _refreshScheduledNotifications({ force = false } = {}) {
  if (!Notifications) return;
  if (!(await isNotifEnabled())) return;

  const info = await loadMilitaryInfo();
  if (!info?.dischargeDate || !info?.enlistDate) {
    // 입대정보가 없는 프로필(새 프로필로 전환, 전체 삭제 직후)이면 이전 프로필의
    // 예약을 반드시 지운다. 예전엔 그냥 return 해서 다른 사람 이름이 박힌
    // 'D-30' 이 계속 울렸다.
    await _clearAll();
    return;
  }

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

  const officer = isOfficer(info.personnelType);
  const promoForSig = officer
    ? null
    : await loadRankPromotions(info.enlistDate).catch(() => null);
  let todosForSig = [];
  try { todosForSig = await loadTodos(); } catch (e) {}
  let leavesForSig = [];
  try { leavesForSig = await loadLeaveRecords(); } catch (e) {}

  const sig = _hash(JSON.stringify({
    schema: SCHEMA,
    // 스트릭 알림이 켜져 있으면 '오늘'을 서명에 넣어 하루 한 번은 반드시
    // 다시 잡히게 한다. 예전에는 서명에 날짜가 없어서, 이틀째부터는 서명이
    // 같고 전역 D-100 같은 장기 예약이 pending 에 남아 있다는 이유로 그대로
    // 빠져나갔다. 그 결과 '앱을 열면 다음 날로 밀린다'가 동작하지 않아
    // 이미 출석한 사람에게도 알림이 울렸고, 한 번 울린 뒤에는 다시 예약되지
    // 않아 기능이 조용히 멈췄다.
    //
    // 스트릭 설정과 무관하게 날짜를 넣는다. 스트릭을 꺼 두면 서명이 영원히 같아져서
    // 처음 열 때 180일 밖이던 마일스톤 전야(반환점 등)가 끝내 예약되지 않았다.
    day: _todayStr(),
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
    leaves: (leavesForSig || []).map((r) => `${r.id}|${r.date}|${r.days}`).sort(),
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

  // 60건 캡을 이 순서대로 소진한다:
  // 전역 > 진급 > 마일스톤 > 휴가 > 스트릭 > 월급날 > 일정 > 매일
  _scheduled = 0;
  _plan = [];

  const today = _todayStr();
  const disc = info.dischargeDate;
  // 전역 하루 전 09시 알림이 실제로 잡혔는지 — 전야(21시) 억제 여부를 여기에 건다
  let dischargeEveScheduled = false;

  if (prefs.discharge) {
    await scheduleAt('discharge', addDaysStr(disc, -100), '전역 D-100 🔥', `${who}전역까지 100일 남았어요! 이제 보입니다.`);
    await scheduleAt('discharge', addDaysStr(disc, -30),  '전역 D-30 🔥',  `${who}전역 한 달 전! 가장 설레는 시기예요.`);
    await scheduleAt('discharge', addDaysStr(disc, -7),   '전역 D-7 🏆',   `${who}전역까지 일주일! 끝까지 무사고로.`);
    dischargeEveScheduled = await scheduleAt('discharge', addDaysStr(disc, -1), '전역 D-1 🎖️', `${who}내일이면 전역입니다! 마지막 밤 잘 보내요.`);
    await scheduleAt('discharge', disc, '전역을 축하합니다! 🎉', `${who}국방의 의무를 마쳤습니다. 정말 고생 많았어요!`);
  }

  if (prefs.promotion && promoForSig) {
    const promo = promoForSig;
    if (promo.일병) await scheduleAt('promotion', promo.일병, '일병 진급 🎖️', `${who}오늘은 일병 진급일이에요. 축하해요!`);
    if (promo.상병) await scheduleAt('promotion', promo.상병, '상병 진급 🎖️', `${who}오늘은 상병 진급일이에요. 축하해요!`);
    if (promo.병장) await scheduleAt('promotion', promo.병장, '병장 진급 👑', `${who}오늘은 병장 진급일이에요. 최고참!`);
  }

  // 마일스톤 — 입대 100일 당일 + 이정표 전야 (향후 180일 이내만, 최대 7건으로 유계)
  //
  // 전야 알림은 마일스톤 '하루 전' 21시, 전역 블록은 '당일' 09시다.
  // 따라서 둘이 같은 날에 겹치는 건 전역뿐이다 —
  // 'D-1'(전역 하루 전 09시) 과 '내일은 전역!'(전역 하루 전 21시).
  // 입대 100일·진급일은 전야와 당일이 서로 다른 날이라 의도된 한 쌍이다.
  //
  // 단, D-1 이 '실제로 잡혔을 때'만 억제한다. 전역 전날 09시가 지난 뒤 앱을
  // 열면 D-1 은 과거라 건너뛰는데, 그때 전야까지 막으면 전역 전날에 알림이
  // 하나도 가지 않는다 — 이 앱에서 가장 중요한 알림이다.
  //
  // 전역 D-day 를 꺼 둔 사람에게도 '내일은 전역!' 전야는 간다 — 마일스톤 스위치
  // 소관이고, 전역 전날 아무 알림도 없는 쪽이 더 나쁘다.
  if (prefs.milestone) {
    await scheduleAt('milestone', addDaysStr(info.enlistDate, 99), '입대 100일 💯', `${who}벌써 입대 100일! 잘 적응하고 있어요.`);

    const roadmap = buildRoadmap(info, promoForSig);
    for (const ms of roadmap) {
      if (ms.done || ms.dday > 180) continue;
      if (ms.key === 'discharge' && dischargeEveScheduled) continue;
      await scheduleAt(
        'milestone',
        addDaysStr(ms.dateStr, -1),
        `내일은 ${ms.label}! ${ms.emoji ?? '🎖️'}`,
        `${who}하루 뒤예요. 잊지 말고 챙기세요.`,
        { hour: EVENING_HOUR }
      );
    }
  }

  // 휴가 전날 저녁 — 다가오는 휴가 최대 3건
  if (prefs.leave) {
    const upcoming = (leavesForSig || [])
      .filter((r) => r && typeof r.date === 'string' && r.date > today)
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .slice(0, 3);
    for (const r of upcoming) {
      const days = Math.max(1, Math.floor(r.days) || 1);
      await scheduleAt(
        'leave',
        addDaysStr(r.date, -1),
        '내일부터 휴가! 🏖️',
        `${who}${days}일 휴가가 시작돼요. 짐 챙기세요.`,
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
    await scheduleAt('streak', addDaysStr(today, 1), '오늘 출석 아직이에요 🔥', body, { hour: EVENING_HOUR });
  }

  // 월급날 — 다가오는 3회 (앱을 몇 주 안 열어도 끊기지 않게). 전역 뒤 월급은 없다.
  if (prefs.payday) {
    let pay = getNextPayday(today).date;
    for (let i = 0; i < 3 && pay <= disc; i += 1) {
      await scheduleAt('payday', pay, '오늘은 월급날 💰', `${who}이번 달 월급이 들어오는 날이에요. (공휴일이면 하루 이를 수 있어요)`);
      const [y, m] = pay.split('-').map(Number);
      pay = paydayOf(y, m);   // m 은 1-based 라 0-based 인자로 넘기면 곧 다음 달이다
    }
  }

  // 일정(날짜 있는 항목) — 가까운 것부터. 예전엔 저장 순서(최근 추가 순)대로 잡아서
  // 캡에 걸리면 내일 일정이 몇 달 뒤 일정에 밀려날 수 있었다.
  if (prefs.todo) {
    const timing = prefs.todoTiming;
    const items = todosForSig
      .filter((t) => t && !t.done && typeof t.date === 'string' && t.date >= today)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    for (const t of items) {
      const label = t.title || '일정';
      if (timing === 'eve' || timing === 'both') {
        await scheduleAt('todo', addDaysStr(t.date, -1), '내일 일정 📌', `${who}${label}`, { hour: EVENING_HOUR });
      }
      if (timing === 'morning' || timing === 'both') {
        await scheduleAt('todo', t.date, '오늘 일정 📌', `${who}${label}`);
      }
    }
  }

  // 매일 D-day 넛지 — 반복 트리거 1건 (기본 꺼짐)
  // 전역한 뒤에는 '전역까지 한 걸음' 넛지가 의미가 없다
  if (prefs.daily && today <= disc) {
    await scheduleDaily(prefs.dailyHour ?? 9, '오늘도 전역까지 한 걸음 🪖', `${who}앱에서 남은 일수를 확인해보세요.`);
  }

  try {
    await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(_plan));
    await AsyncStorage.setItem(SIG_KEY, sig);
  } catch (e) {}
}
