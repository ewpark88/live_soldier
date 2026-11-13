/**
 * 연 단위 연가 계산 (v1.6, 간부 전용).
 *
 * 병사·대체복무는 '복무기간 전체 연가'(leaveTotal) 하나로 센다. 간부 연가는 매년
 * 새로 부여되므로 '올해 받은 연가(leaveAnnual) − 올해 쓴 날'로 센다.
 * 연도는 달력 연도(1/1~12/31)다. 휴가 기록의 형태({ date, days })는 그대로라
 * 구버전 앱이 같은 기록을 읽어도 아무 문제가 없다 — 새 필드는 leaveAnnual 하나뿐이다.
 *
 * ⚠️ 순수 모듈 — scripts/test-calc.js 가 import 를 지우고 이 파일을 그대로 로드한다.
 *    import 는 한 줄로 둔다.
 */
import { spanDates } from './dateUtils';

/**
 * 기록들 중 해당 연도에 속한 날만 센다. 연말에 시작해 새해로 넘어가는 휴가는
 * 두 해에 나눠 잡힌다 (12/30~1/2 → 작년 2일 + 올해 2일).
 * @param records [{ date: 'YYYY-MM-DD', days }]
 * @param year    숫자 연도
 */
export function leaveDaysInYear(records, year) {
  const prefix = `${year}-`;
  let n = 0;
  for (const r of records || []) {
    if (!r || typeof r.date !== 'string') continue;
    for (const d of spanDates(r.date, r.days)) if (d.startsWith(prefix)) n += 1;
  }
  return n;
}

/**
 * 부여 기록(포상휴가 등) 중 부여일이 해당 연도인 것의 일수 합.
 * 부여는 하루짜리 사건이라 기간으로 쪼개지 않는다.
 */
export function grantedDaysInYear(grants, year) {
  const prefix = `${year}-`;
  return (grants || []).reduce(
    (acc, g) => (g && typeof g.date === 'string' && g.date.startsWith(prefix) ? acc + (Math.floor(g.days) || 0) : acc),
    0,
  );
}

/** 저장값 → 유효한 연가 일수 (1 이상 정수) | null(미설정) */
export function normalizeAnnualLeave(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 올해 연가 요약.
 * @returns {{ year, annual: number|null, bonus, total, used, remaining: number|null }}
 *          annual 이 미설정이면 remaining 은 null — 화면은 숫자 대신 '입력' 안내를 그린다
 *          (0 으로 두면 '-사용일' 음수가 보인다).
 */
export function annualLeaveSummary(records, annual, year, grants = []) {
  const a = normalizeAnnualLeave(annual);
  const used = leaveDaysInYear(records, year);
  const bonus = grantedDaysInYear(grants, year);
  const total = (a ?? 0) + bonus;
  return { year, annual: a, bonus, total, used, remaining: a == null ? null : total - used };
}

/**
 * 지난 연도별 사용 일수 (올해 제외, 최근 연도부터). 기록이 있는 해만.
 * @returns [{ year, used }]
 */
export function leaveUsedByYear(records, currentYear) {
  const map = new Map();
  for (const r of records || []) {
    if (!r || typeof r.date !== 'string') continue;
    for (const d of spanDates(r.date, r.days)) {
      const y = Number(d.slice(0, 4));
      if (y < currentYear) map.set(y, (map.get(y) ?? 0) + 1);
    }
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([y, used]) => ({ year: y, used }));
}
