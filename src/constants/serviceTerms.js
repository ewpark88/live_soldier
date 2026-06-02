/**
 * 군별 의무복무기간 / 계급 관련 상수
 *
 * months 값은 2020년 6월부로 단축이 완료된 "현행" 의무복무기간(개월)입니다.
 * (과거: 육군 21 / 해군 23 / 공군 24 → 현행: 18 / 20 / 21, 단축 반영됨)
 * 현재 복무 중인 인원은 모두 단축된 기간이 적용되므로 별도 입대시기 보정 불필요.
 */
export const BRANCHES = [
  { key: 'army',     label: '육군',   months: 18, emoji: '🪖' },
  { key: 'navy',     label: '해군',   months: 20, emoji: '⚓' },
  { key: 'airforce', label: '공군',   months: 21, emoji: '✈️' },
  { key: 'marines',  label: '해병대', months: 18, emoji: '🦅' },
];

/** 군별 현행 복무개월 반환 (없으면 육군 기준) */
export function resolveServiceMonths(branchKey) {
  return (BRANCHES.find((b) => b.key === branchKey) ?? BRANCHES[0]).months;
}

/** 병사 계급 순서 */
export const RANK_ORDER = ['이병', '일병', '상병', '병장'];

/**
 * 군 인사 구분 (병사 / 부사관 / 장교)
 * - soldier: 병사. 군별 의무복무기간 + 이병~병장 진급 체계 적용.
 * - nco/officer: 간부. 의무복무기간이 다양하고 호봉제이므로
 *   복무개월·급여를 사용자가 직접 입력하고, 병사 진급/계급 체계는 적용하지 않는다.
 */
export const PERSONNEL_TYPES = [
  { key: 'soldier', label: '병사',   emoji: '🪖' },
  { key: 'nco',     label: '부사관', emoji: '🎖️' },
  { key: 'officer', label: '장교',   emoji: '⭐' },
];

/** 간부(부사관·장교) 여부 — 병사 진급/계급 체계 미적용 대상 */
export function isOfficer(personnelType) {
  return personnelType === 'nco' || personnelType === 'officer';
}

/** personnelType key → 라벨 (기본: 병사) */
export function personnelLabel(personnelType) {
  return (PERSONNEL_TYPES.find((p) => p.key === personnelType) ?? PERSONNEL_TYPES[0]).label;
}
