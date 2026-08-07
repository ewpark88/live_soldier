import { todayStr, dayDiff } from './daily';

/**
 * 출석 스트릭 — 순수 로직 (저장은 storage.js, 발화는 StreakContext).
 *
 * 서버가 없으므로 "하루"는 기기의 로컬 달력일이다. 그래서 시계를 되돌리는
 * 경우를 반드시 방어해야 한다.
 *
 * ── 1일 유예(스트릭 보호)를 넣는 이유 ──────────────────────────────
 * 이 앱 사용자는 훈련·당직으로 폰을 못 만지는 날이 실제로 있다. 앱이 프리셋으로
 * 갖고 있는 혹한기(7일)·유격(5일)이 정확히 그런 기간이다. 하루 놓쳤다고 0으로
 * 되돌리면, 가장 고생하는 사용자를 정확히 겨냥해 벌을 주는 꼴이 된다.
 * 대신 유예를 몰래 쓰지 않는다 — UI 에 "스트릭 보호 사용됨"을 표시해야 신뢰가
 * 유지된다.
 */

export const FREEZE_COOLDOWN_DAYS = 14;   // 유예 재충전 간격
export const DAYS_WINDOW = 62;            // days 배열 상한 (무한 증가 방지)
const CLOCK_SKEW_MS = 12 * 60 * 60 * 1000;

export const EMPTY_STREAK = {
  first: null,
  last: null,
  current: 0,
  best: 0,
  total: 0,
  days: [],
  freezeUsed: null,
  lastSeenTs: 0,
};

/** 티어 — 콘텐츠를 잠그지 않는, 잃을 수 없는 보상 */
export const STREAK_TIERS = [
  { min: 365, key: 'beacon', label: '봉화', icon: 'bonfire' },
  { min: 100, key: 'blaze', label: '화염', icon: 'flame' },
  { min: 30, key: 'fire', label: '불꽃', icon: 'flame' },
  { min: 7, key: 'spark', label: '불씨', icon: 'flame-outline' },
  { min: 0, key: 'none', label: '', icon: 'flame-outline' },
];

export function tierOf(count) {
  return STREAK_TIERS.find((t) => count >= t.min) ?? STREAK_TIERS[STREAK_TIERS.length - 1];
}

function pushDay(days, day) {
  if (days.includes(day)) return days;
  const next = [...days, day].sort();
  return next.length > DAYS_WINDOW ? next.slice(next.length - DAYS_WINDOW) : next;
}

/**
 * 체크인 (멱등).
 * @returns {{ next, changed, event }}  event: 'same'|'first'|'continue'|'freeze'|'reset'|'skew'
 */
export function checkIn(state, now = new Date()) {
  const s = { ...EMPTY_STREAK, ...(state || {}) };
  const today = todayStr(now);
  const ts = now.getTime();

  // 시계를 크게 되돌린 흔적 — 증가도 리셋도 하지 않고 동결한다
  if (s.lastSeenTs && ts < s.lastSeenTs - CLOCK_SKEW_MS) {
    return { next: s, changed: false, event: 'skew' };
  }

  if (!s.last) {
    const next = {
      ...s,
      first: today, last: today, current: 1,
      best: Math.max(1, s.best), total: s.total + 1,
      days: pushDay(s.days, today), lastSeenTs: ts,
    };
    return { next, changed: true, event: 'first' };
  }

  const gap = dayDiff(s.last, today);

  if (gap === 0) {
    // 같은 날 재진입 — 타임스탬프만 갱신
    return { next: { ...s, lastSeenTs: ts }, changed: false, event: 'same' };
  }

  // 과거로 이동(서쪽 시차 / 수동 변경) — 아무것도 하지 않는다
  if (gap < 0) {
    return { next: { ...s, lastSeenTs: ts }, changed: false, event: 'skew' };
  }

  const base = {
    ...s, last: today, total: s.total + 1,
    days: pushDay(s.days, today), lastSeenTs: ts,
  };

  if (gap === 1) {
    const current = s.current + 1;
    return {
      next: { ...base, current, best: Math.max(current, s.best) },
      changed: true,
      event: 'continue',
    };
  }

  // 하루만 빠졌고 유예가 충전돼 있으면 이어준다
  const freezeReady = !s.freezeUsed || dayDiff(s.freezeUsed, today) >= FREEZE_COOLDOWN_DAYS;
  if (gap === 2 && freezeReady && s.current > 0) {
    const current = s.current + 1;
    const missed = todayStrOffset(today, -1);
    return {
      next: { ...base, current, best: Math.max(current, s.best), freezeUsed: missed },
      changed: true,
      event: 'freeze',
    };
  }

  return {
    next: { ...base, current: 1, best: s.best, brokenFrom: s.current },
    changed: true,
    event: 'reset',
  };
}

/** 'YYYY-MM-DD' 에 일수를 더한 문자열 */
export function todayStrOffset(dateStr, delta) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return todayStr(dt);
}

/** 최근 n일 [{ date, present, isToday }] — 스트립 표시용 */
export function recentDays(state, n = 7, today = todayStr()) {
  const set = new Set(state?.days ?? []);
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = todayStrOffset(today, -i);
    out.push({ date, present: set.has(date), isToday: i === 0 });
  }
  return out;
}

/** 오늘 유예가 쓰였는지 (UI 에 솔직히 표시하기 위함) */
export function freezeActive(state, today = todayStr()) {
  return !!state?.freezeUsed && dayDiff(state.freezeUsed, today) <= 1;
}
