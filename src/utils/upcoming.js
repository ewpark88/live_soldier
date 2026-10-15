/**
 * '다가오는 일정' 계산 — 다음 휴가 · 월급날 · 적금 만기.
 *
 * 순수 함수만 있다 (위젯 헤드리스 런타임과 맨 Node 테스트가 둘 다 로드한다).
 * '오늘'은 항상 인자로 받는다 — 테스트가 시계를 고정할 수 있게.
 */
import { todayStr, dayDiff } from './daily';
import { spanDates } from './dateUtils';
import { calcSavings } from './savingsUtils';

/** 'YYYY-MM-DD' 인가 (형식만 — 달력 유효성은 spanDates/parseDate 가 거른다) */
const isYmd = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * 다음(또는 진행 중인) 휴가.
 *
 * records: [{ id, date(시작일), days(시작일 포함 일수), memo }]
 * @returns {null | {
 *   state: 'ongoing' | 'upcoming',
 *   start, end, days, memo,
 *   dday,        // upcoming: 시작까지 남은 일수 (내일이면 1)
 *   dayNo,       // ongoing: 오늘이 휴가 며칠째 (첫날 1)
 *   returnDday,  // ongoing: 마지막 날까지 남은 일수 (마지막 날이면 0)
 * }}
 *
 * 진행 중인 휴가가 있으면 그게 먼저다 — 휴가 중인 사람에게 "다음 휴가 D-40" 은
 * 의미가 없고, 궁금한 건 "복귀까지 며칠"이다. 겹치는 기록이 여럿이면 가장 늦게
 * 끝나는 것을 고른다 (연달아 붙인 휴가의 진짜 복귀일).
 */
export function getNextLeave(records, today = todayStr()) {
  if (!Array.isArray(records) || !records.length) return null;

  let ongoing = null;
  let upcoming = null;
  for (const r of records) {
    if (!r || !isYmd(r.date)) continue;
    const days = Math.max(1, Math.floor(r.days) || 1);
    const span = spanDates(r.date, days);
    if (!span.length) continue;
    const start = span[0];
    const end = span[span.length - 1];

    if (start <= today && today <= end) {
      if (!ongoing || end > ongoing.end) ongoing = { start, end, days, memo: r.memo || '' };
    } else if (start > today) {
      if (!upcoming || start < upcoming.start) upcoming = { start, end, days, memo: r.memo || '' };
    }
  }

  if (ongoing) {
    return {
      state: 'ongoing',
      ...ongoing,
      dayNo: dayDiff(ongoing.start, today) + 1,
      returnDday: dayDiff(today, ongoing.end),
    };
  }
  if (upcoming) {
    return { state: 'upcoming', ...upcoming, dday: dayDiff(today, upcoming.start) };
  }
  return null;
}

/* ─── 월급날 ────────────────────────────────────────────────────────────
 * 병 봉급은 매월 10일 지급이다. 지급일이 토·일이면 직전 금요일로 당긴다.
 * 공휴일(설·추석 등)은 반영하지 않는다 — 공휴일 표를 앱에 넣으면 매년 갱신해야
 * 하고, 틀리면 차라리 없는 것보다 나쁘다. 화면에 '공휴일 미반영'을 함께 적는다.
 */
export const PAYDAY_DOM = 10;

function _ymd(y, m /* 0-based */, d) {
  const dt = new Date(y, m, d);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

/** 해당 연·월(0-based)의 실제 지급일 'YYYY-MM-DD' (주말이면 직전 금요일) */
export function paydayOf(year, monthIndex, dom = PAYDAY_DOM) {
  const dow = new Date(year, monthIndex, dom).getDay();
  const back = dow === 6 ? 1 : dow === 0 ? 2 : 0;
  return _ymd(year, monthIndex, dom - back);
}

/**
 * 오늘 이후(오늘 포함) 가장 가까운 월급날.
 * @returns {{ date: 'YYYY-MM-DD', dday: number, shifted: boolean }}
 *   shifted — 주말이라 앞당겨졌는가 (원래 10일이 아니다)
 */
export function getNextPayday(today = todayStr(), dom = PAYDAY_DOM) {
  const [y, m] = today.split('-').map(Number);
  let date = paydayOf(y, m - 1, dom);
  if (date < today) date = paydayOf(y, m, dom);   // 이번 달 지급일이 지났으면 다음 달
  return {
    date,
    dday: dayDiff(today, date),
    shifted: Number(date.slice(8, 10)) !== dom,
  };
}

/**
 * 장병내일준비적금 — 전역(만기) 시 예상 수령액.
 * 적금 만기는 전역에 맞춰 잡는다는 SavingsScreen 의 전제를 그대로 따른다
 * (매칭지원금은 별도로 전역 다음 달 지급 — 화면 문구가 설명한다).
 *
 * @returns {null | { total, principal, monthly, months, dday }}
 */
export function getSavingsMaturity(plan, dischargeDate, today = todayStr()) {
  if (!plan || !isYmd(dischargeDate)) return null;
  const r = calcSavings({ monthly: plan.monthly, months: plan.months });
  if (!r.total) return null;
  return {
    total: r.total,
    principal: r.principal,
    monthly: r.monthly,
    months: r.months,
    dday: dayDiff(today, dischargeDate),
  };
}
