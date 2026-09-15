/**
 * 계급별 표준 월급 (2026년 기준 — 2025년과 동일하게 유지).
 * 진급 기준: 이병 0~1개월, 일병 2~7개월, 상병 8~13개월, 병장 14개월~
 *
 * 예전엔 이 배열이 SalaryScreen 과 SalaryGuideScreen 에 그대로 복붙돼 있었다.
 * 돈 데이터의 진실 원천이 둘이면 언젠가 한쪽만 갱신된다 — 하나로 못 박는다.
 */
/** 봉급표 기준 연도 — 화면 라벨이 참조한다. 갱신 시 여기만 고치면 된다. */
export const SALARY_YEAR = 2026;

/**
 * 장병내일준비적금 매칭지원금(월 최대 55만원)은 복무 중 매달 받는 돈이 아니라
 * 전역 시 일괄 지급되므로 이 표에 넣지 않는다. (적금은 benefits.js / savingsUtils.js)
 */
export const SALARY_GUIDE = [
  { rank: '이병', months: '0 ~ 1개월', amount: 750000, start: 0, end: 1 },
  { rank: '일병', months: '2 ~ 7개월', amount: 900000, start: 2, end: 7 },
  { rank: '상병', months: '8 ~ 13개월', amount: 1200000, start: 8, end: 13 },
  { rank: '병장', months: '14개월~', amount: 1500000, start: 14, end: 999 },
];

/** 표에서 가장 높은 월급 — 비례 막대의 기준값 */
export const MAX_SALARY = Math.max(...SALARY_GUIDE.map((s) => s.amount));

/** 계급명 → 월급 (없으면 이병) */
export function getSalaryByRank(rank) {
  const g = SALARY_GUIDE.find((s) => s.rank === rank);
  return (g || SALARY_GUIDE[0]).amount;
}

/**
 * 복무 개월수 → 해당 구간의 계급 (봉급 구간 조회용)
 *
 * 경계는 dateUtils.rankFromServedMonths 와 같아야 한다 —
 * scripts/test-calc.js 의 '계급 구간 교차 검증' 블록이 0~36개월 전 구간을 대조한다.
 */
export function getRankByMonths(months) {
  const g = SALARY_GUIDE.find((s) => months >= s.start && months <= s.end);
  return (g || SALARY_GUIDE[0]).rank;
}

/** 1,250,000 형태로 */
export function formatMoney(n) {
  return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
