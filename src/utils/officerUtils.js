/**
 * 간부 호봉(복무 연차) 관련 계산 유틸
 *
 * 호봉은 통상 복무 1년마다 1호봉씩 상승한다(임관일 기준).
 * 경력 환산 등 세부 규정은 부대/개인별로 다르므로, 본 앱은
 * "임관일 + 복무 연수"에 기반한 추정 호봉을 제공한다.
 */
import { calcDaysLeft } from './dateUtils';

/**
 * 임관일로부터 지난 만(滿) 연수. 달력 기준으로 세어야 한다.
 * 예전에는 servedDays / 365.25 로 계산해서, 평년(365일)인 주년 당일에
 * 1년이 안 된 것으로 판정돼 '1호봉 · 다음 승급 D-0' 같은 표시가 나왔다.
 */
function _fullYearsSince(dateStr) {
  if (typeof dateStr !== 'string' || dateStr.length !== 10) return 0;
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7));
  const d = Number(dateStr.slice(8, 10));
  if (!y || !m || !d) return 0;

  const now = new Date();
  let years = now.getFullYear() - y;
  const beforeAnniversary =
    now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d);
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
}

/**
 * 현재 호봉(추정) = 1 + 복무 만(滿) 연수
 * @param {string} enlistDate 임관일(YYYY-MM-DD)
 * @returns {number} 1 이상의 정수
 */
export function calcHobong(enlistDate) {
  if (!enlistDate) return 1;
  return 1 + _fullYearsSince(enlistDate);
}

/**
 * 다음 호봉 승급일까지 정보
 * @param {string} enlistDate 임관일
 * @returns {{ current: number, next: number, nextDate: string, daysLeft: number } | null}
 */
export function nextHobongInfo(enlistDate) {
  if (!enlistDate) return null;
  const current = calcHobong(enlistDate);
  // 다음 승급일 = 임관일 + (현재 복무연수+1)년
  const base = new Date(enlistDate);
  if (isNaN(base.getTime())) return null;
  const nextDate = new Date(base);
  nextDate.setFullYear(base.getFullYear() + current); // current = 복무연수+1 → 다음 주년
  const yyyy = nextDate.getFullYear();
  const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
  const dd = String(nextDate.getDate()).padStart(2, '0');
  const nextDateStr = `${yyyy}-${mm}-${dd}`;
  return {
    current,
    next: current + 1,
    nextDate: nextDateStr,
    daysLeft: calcDaysLeft(nextDateStr),
  };
}
