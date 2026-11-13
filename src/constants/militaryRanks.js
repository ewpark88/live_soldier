/**
 * 간부(부사관·준사관·장교) 계급 및 봉급 참고 데이터
 *
 * ⚠️ 봉급 값은 2026년 "1호봉 월 기본급" 기준의 참고치입니다 (수당 미포함).
 * 호봉별 상세표는 반영하지 않으며, 정확한 금액은 앱 내 "직접 입력"으로 덮어쓴다.
 * 출처: 인사혁신처 공무원보수규정 별표13(군인의 봉급표) 2026년분 — 공개 정리 자료 3곳을
 * 교차 확인했다. 대위·소령은 자료 간 100원 차이가 있어 다수 값을 따랐고,
 * 준위·대령은 한 곳에서만 확인돼 '참고'로 둔다. 매년 1월 갱신 대상.
 */

// 계급명 문자열이 저장값이다 — 순서는 표시 순서일 뿐.
export const NCO_RANKS     = ['하사', '중사', '상사', '원사'];                 // 부사관
export const WARRANT_RANKS = ['준위'];                                         // 준사관 (군인사법 제3조)
export const OFFICER_RANKS = ['소위', '중위', '대위', '소령', '중령', '대령']; // 장교

/** personnelType key → 해당 계급 배열 */
export function ranksFor(personnelType) {
  if (personnelType === 'nco')     return NCO_RANKS;
  if (personnelType === 'warrant') return WARRANT_RANKS;
  if (personnelType === 'officer') return OFFICER_RANKS;
  return [];
}

/** 봉급표 기준 연도 — 화면 문구가 이 값을 쓴다 */
export const OFFICER_PAY_YEAR = 2026;

/** 2026년 1호봉 월 기본급 (참고, 원) */
export const OFFICER_BASE_PAY = {
  하사: 2133000,
  중사: 2181500,
  상사: 2468000,
  원사: 3568100,
  준위: 2544300,
  소위: 2150400,
  중위: 2306700,
  대위: 2805000,
  소령: 3382700,
  중령: 4105800,
  대령: 4671200,
};

/** 계급의 1호봉 참고 월급 반환 (없으면 null) */
export function getOfficerBasePay(rank) {
  const v = OFFICER_BASE_PAY[rank];
  return typeof v === 'number' ? v : null;
}

/** 봉급 참고표(가이드 표시용) — 값이 있는 계급만 */
export const OFFICER_PAY_GUIDE = [
  ...NCO_RANKS.map((rank) => ({ rank, amount: getOfficerBasePay(rank), group: '부사관' })),
  ...WARRANT_RANKS.map((rank) => ({ rank, amount: getOfficerBasePay(rank), group: '준사관' })),
  ...OFFICER_RANKS.map((rank) => ({ rank, amount: getOfficerBasePay(rank), group: '장교' })),
];
/* 참고값이 없는 계급(원사·준위·소령 이상)도 행은 보여준다 — amount=null 이면 '직접 입력'.
   예전엔 아예 빠져 있어서 소령이 이 화면을 열면 자기 계급이 없고 '현재' 표시도 없었다. */
