/**
 * 장병내일준비적금 만기 수령액 계산
 * ─────────────────────────────────────────────────────────────────────────
 * 2025년 제도 기준(공개 정보):
 *   · 납입 한도   : 고객별 월 최대 55만원 (은행별 30만원 → 2개 은행 분산 가입 시 55만)
 *   · 가입 기간   : 1 ~ 24개월 (만기 24개월). 복무기간이 길어도 적금은 최대 24개월.
 *   · 기본 금리   : 연 5% (은행 우대금리, 적금식 단리)
 *   · 정부 매칭   : 2024년 이후 납입분은 "원금의 100%"를 정부가 추가 지원(매칭지원금)
 *                   → 전역(만기해지) 다음 달에 별도 지급
 *   · 이자소득 비과세
 * 제도/예산에 따라 실제 금액과 차이가 있을 수 있어 금리·매칭은 인자로 분리해 둔다.
 */

export const SAVINGS = {
  MONTHLY_MAX: 550000,      // 고객별 월 납입 한도(원)
  MAX_MONTHS: 24,           // 적금 최대 가입 개월
  DEFAULT_RATE: 0.05,       // 연 기본금리(5%)
  DEFAULT_MATCH: 1.0,       // 정부 매칭지원금 비율(원금의 100%)
};

/**
 * 적금식 단리 이자 계산
 * 매월 같은 금액을 적립하고 만기에 찾는 적금의 이자(단리):
 *   이자 = 월납입액 × (연이율/12) × (n(n+1)/2)
 * (첫 회차는 n개월, 마지막 회차는 1개월치 이자가 붙는 구조)
 */
export function calcSavingsInterest(monthly, months, annualRate = SAVINGS.DEFAULT_RATE) {
  const m = Math.max(0, Math.floor(monthly) || 0);
  const n = Math.max(0, Math.floor(months) || 0);
  if (m === 0 || n === 0) return 0;
  const monthlyRate = annualRate / 12;
  return Math.round(m * monthlyRate * ((n * (n + 1)) / 2));
}

/**
 * 만기 수령액 종합 계산
 * @returns {{
 *   monthly, months, principal, interest, matchGrant, total, rate, matchRatio
 * }}
 *   principal  : 납입 원금 (월납입 × 개월)
 *   interest   : 은행 이자(단리)
 *   matchGrant : 정부 매칭지원금 (원금 × 매칭비율)
 *   total      : 전역 시 총 수령 예상액
 */
export function calcSavings({
  monthly,
  months,
  rate = SAVINGS.DEFAULT_RATE,
  matchRatio = SAVINGS.DEFAULT_MATCH,
} = {}) {
  // 두 입력 모두 제도 한도로 클램프한다. 예전에는 개월만 24로 자르고 월납입액은
  // 그대로 써서, 100만원 30개월을 넣으면 개월은 24로 줄면서 금액은 55만원 한도를
  // 넘긴 채 계산돼 제도상 불가능한 만기 수령액이 나왔다.
  const m = Math.min(SAVINGS.MONTHLY_MAX, Math.max(0, Math.floor(monthly) || 0));
  const n = Math.min(SAVINGS.MAX_MONTHS, Math.max(0, Math.floor(months) || 0));
  const principal  = m * n;
  const interest   = calcSavingsInterest(m, n, rate);
  const matchGrant = Math.round(principal * matchRatio);
  const total      = principal + interest + matchGrant;
  return { monthly: m, months: n, principal, interest, matchGrant, total, rate, matchRatio };
}

/** 복무 개월 → 적금 권장 가입 개월(최대 24개월) */
export function recommendedSavingMonths(serviceMonths) {
  const n = Math.floor(serviceMonths) || 0;
  return Math.min(SAVINGS.MAX_MONTHS, Math.max(1, n));
}
