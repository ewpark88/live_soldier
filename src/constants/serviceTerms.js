/**
 * 군별 의무복무기간 / 계급 관련 상수
 *
 * months 값은 2020년 6월부로 단축이 완료된 "현행" 의무복무기간(개월)입니다.
 * (과거: 육군 21 / 해군 23 / 공군 24 → 현행: 18 / 20 / 21, 단축 반영됨)
 * 현재 복무 중인 인원은 모두 단축된 기간이 적용되므로 별도 입대시기 보정 불필요.
 */
/* emoji 는 위젯·공유 텍스트가 쓰므로 남겨둔다. 화면 UI 는 icon(Ionicons) 을 쓴다. */
/*
 * leaveDays = 의무복무기간 전체에 부여되는 연가(정기휴가) 일수.
 * 복무기간이 길수록 늘어난다 — 예전에는 군종과 무관하게 21일 고정이었는데,
 * 21일은 단축 이전 육군 21개월 시절 값이라 현행 기준과 맞지 않았다.
 * 사용자가 화면에서 직접 고칠 수 있으므로 어디까지나 기본값이다.
 */
export const BRANCHES = [
  { key: 'army',     label: '육군',   months: 18, leaveDays: 24, emoji: '🪖', icon: 'shield-half' },
  { key: 'navy',     label: '해군',   months: 20, leaveDays: 27, emoji: '⚓', icon: 'boat' },
  { key: 'airforce', label: '공군',   months: 21, leaveDays: 28, emoji: '✈️', icon: 'airplane' },
  { key: 'marines',  label: '해병대', months: 18, leaveDays: 24, emoji: '🦅', icon: 'flame' },
];

/** 군종 기본 연가 일수 (없으면 육군 기준) */
export function resolveLeaveDays(branchKey) {
  return (BRANCHES.find((b) => b.key === branchKey) ?? BRANCHES[0]).leaveDays;
}

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
  { key: 'soldier', label: '병사',   emoji: '🪖', icon: 'person' },
  { key: 'nco',     label: '부사관', emoji: '🎖️', icon: 'ribbon' },
  { key: 'officer', label: '장교',   emoji: '⭐', icon: 'star' },
];

/** 간부(부사관·장교) 여부 — 병사 진급/계급 체계 미적용 대상 */
export function isOfficer(personnelType) {
  return personnelType === 'nco' || personnelType === 'officer';
}

/** personnelType key → 라벨 (기본: 병사) */
export function personnelLabel(personnelType) {
  return (PERSONNEL_TYPES.find((p) => p.key === personnelType) ?? PERSONNEL_TYPES[0]).label;
}
