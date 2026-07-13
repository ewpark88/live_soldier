/**
 * 계급별 표준 월급 (2024년 기준).
 * 진급 기준: 이병 0~1개월, 일병 2~7개월, 상병 8~13개월, 병장 14개월~
 *
 * 예전엔 이 배열이 SalaryScreen 과 SalaryGuideScreen 에 그대로 복붙돼 있었다.
 * 돈 데이터의 진실 원천이 둘이면 언젠가 한쪽만 갱신된다 — 하나로 못 박는다.
 */
export const SALARY_GUIDE = [
  { rank: '이병', months: '0 ~ 1개월', amount: 640000, start: 0, end: 1 },
  { rank: '일병', months: '2 ~ 7개월', amount: 800000, start: 2, end: 7 },
  { rank: '상병', months: '8 ~ 13개월', amount: 1000000, start: 8, end: 13 },
  { rank: '병장', months: '14개월~', amount: 1250000, start: 14, end: 999 },
];

/** 표에서 가장 높은 월급 — 비례 막대의 기준값 */
export const MAX_SALARY = Math.max(...SALARY_GUIDE.map((s) => s.amount));

/** 계급명 → 월급 (없으면 이병) */
export function getSalaryByRank(rank) {
  const g = SALARY_GUIDE.find((s) => s.rank === rank);
  return (g || SALARY_GUIDE[0]).amount;
}

/** 복무 개월수 → 해당 구간의 계급 */
export function getRankByMonths(months) {
  const g = SALARY_GUIDE.find((s) => months >= s.start && months <= s.end);
  return (g || SALARY_GUIDE[0]).rank;
}

/** 1,250,000 형태로 */
export function formatMoney(n) {
  return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
