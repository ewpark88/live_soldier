/**
 * 간부(부사관·장교) 계급 및 봉급 참고 데이터
 *
 * ⚠️ 봉급 값은 2025년 "초임(1호봉) 월 기본급" 기준의 참고·추정치입니다.
 * 호봉별 상세표·각종 수당은 반영되지 않으며(공개 상세표가 이미지로만 제공),
 * 정확한 금액은 앱 내 "직접 입력"으로 덮어쓰도록 설계했습니다.
 * 출처: 인사혁신처 공무원보수규정 별표13(군인 봉급표) 2025년분 공개 자료 기반.
 */

export const NCO_RANKS     = ['하사', '중사', '상사', '원사'];      // 부사관
export const OFFICER_RANKS = ['소위', '중위', '대위', '소령', '중령', '대령']; // 장교

/** personnelType key → 해당 계급 배열 */
export function ranksFor(personnelType) {
  if (personnelType === 'nco')     return NCO_RANKS;
  if (personnelType === 'officer') return OFFICER_RANKS;
  return [];
}

/**
 * 2025년 초임(1호봉) 월 기본급 (참고·추정, 원)
 * 값이 없는 상위 계급(원사/소령 이상)은 직접 입력 유도.
 */
export const OFFICER_BASE_PAY_2025 = {
  하사: 1933000,
  중사: 2100000,
  상사: 2384500,
  소위: 2017300,
  중위: 2163900,
  대위: 2710100,
};

/** 계급의 초임(1호봉) 참고 월급 반환 (없으면 null) */
export function getOfficerBasePay(rank) {
  const v = OFFICER_BASE_PAY_2025[rank];
  return typeof v === 'number' ? v : null;
}

/** 봉급 참고표(가이드 표시용) — 값이 있는 계급만 */
export const OFFICER_PAY_GUIDE = [
  { rank: '하사', amount: OFFICER_BASE_PAY_2025.하사, group: '부사관' },
  { rank: '중사', amount: OFFICER_BASE_PAY_2025.중사, group: '부사관' },
  { rank: '상사', amount: OFFICER_BASE_PAY_2025.상사, group: '부사관' },
  { rank: '소위', amount: OFFICER_BASE_PAY_2025.소위, group: '장교' },
  { rank: '중위', amount: OFFICER_BASE_PAY_2025.중위, group: '장교' },
  { rank: '대위', amount: OFFICER_BASE_PAY_2025.대위, group: '장교' },
];
