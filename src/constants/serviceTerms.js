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
  { key: 'soldier',      label: '병사',            group: 'active', emoji: '🪖', icon: 'person' },
  { key: 'nco',          label: '부사관',          group: 'active', emoji: '🎖️', icon: 'ribbon' },
  // 준위는 부사관이 아니라 '준사관'이다 (군인사법 제3조: 장교·준사관·부사관·병). v1.6
  { key: 'warrant',      label: '준사관',          group: 'active', emoji: '🔰', icon: 'shield' },
  { key: 'officer',      label: '장교',            group: 'active', emoji: '⭐', icon: 'star' },
  // ── 대체복무 (v1.6) — 군부대 밖에서 병역을 이행한다. 군별·계급·호봉이 없다. ──
  { key: 'social',       label: '사회복무요원',    group: 'alt', months: 21, leaveDays: 28, emoji: '🏢', icon: 'business' },
  { key: 'industrial',   label: '산업기능요원',    group: 'alt', months: 34, leaveDays: 0,  emoji: '🏭', icon: 'construct' },
  { key: 'research',     label: '전문연구요원',    group: 'alt', months: 36, leaveDays: 0,  emoji: '🔬', icon: 'flask' },
  { key: 'professional', label: '전문직 대체복무', group: 'alt', months: 36, leaveDays: 0,  emoji: '🩺', icon: 'medkit' },
  { key: 'artsports',    label: '예술·체육요원',   group: 'alt', months: 34, leaveDays: 0,  emoji: '🏅', icon: 'medal' },
];

/**
 * 대체복무 세부 유형. key 는 저장·공유 코드에 남으니 바꾸거나 지우지 않는다.
 * months 는 기본값일 뿐 — 화면에서 고칠 수 있다.
 */
export const ALT_SUBTYPES = {
  industrial: [
    { key: 'active',  label: '현역 대상',   full: '산업기능요원(현역)',   months: 34 },
    { key: 'reserve', label: '보충역 대상', full: '산업기능요원(보충역)', months: 23 },
  ],
  professional: [
    { key: 'doctor', label: '공중보건의사',   full: '공중보건의사',   months: 36 },
    { key: 'lawyer', label: '공익법무관',     full: '공익법무관',     months: 36 },
    { key: 'vet',    label: '공중방역수의사', full: '공중방역수의사', months: 36 },
  ],
};

/** 대체복무 유형 key 목록 */
export const ALT_TYPE_KEYS = ['social', 'industrial', 'research', 'professional', 'artsports'];

/** 간부(부사관·장교) 여부 — 병사 진급/계급 체계 미적용 대상 */
export function isOfficer(personnelType) {
  return personnelType === 'nco' || personnelType === 'warrant' || personnelType === 'officer';
}

/** personnelType key → 라벨 (기본: 병사) */
export function personnelLabel(personnelType) {
  return (PERSONNEL_TYPES.find((p) => p.key === personnelType) ?? PERSONNEL_TYPES[0]).label;
}

/* ─── 복무 갈래 (v1.6) ─────────────────────────────────────────────────
 * 예전엔 isOfficer() 하나로 '간부 / 그 외 전부 = 병사' 두 갈래였다. 대체복무가
 * 들어오면서 세 갈래가 됐다. `!isOfficer` 를 "병사"의 뜻으로 쓰면 대체복무자에게
 * 진급·병 봉급이 붙으니, 병사만을 뜻할 땐 hasSoldierRanks 를 쓴다.
 */

/** 'soldier' | 'cadre' | 'alt'. 모르는 값·미설정은 'soldier' (하위호환). */
export function serviceCategory(personnelType) {
  if (isOfficer(personnelType)) return 'cadre';
  if (ALT_TYPE_KEYS.includes(personnelType)) return 'alt';
  return 'soldier';
}

/** 대체복무 여부 */
export function isAlternative(personnelType) {
  return serviceCategory(personnelType) === 'alt';
}

/** 이병~병장 진급 체계를 쓰는가 (병사만) */
export function hasSoldierRanks(personnelType) {
  return serviceCategory(personnelType) === 'soldier';
}

/** 알 수 없는 신분 키 → null (저장 전 정규화) */
export function normalizePersonnelType(personnelType) {
  return PERSONNEL_TYPES.some((p) => p.key === personnelType) ? personnelType : null;
}

/** 세부 유형 목록 (없으면 빈 배열) */
export function subTypesFor(personnelType) {
  return ALT_SUBTYPES[personnelType] ?? [];
}

function _findSubType(personnelType, subType) {
  return subTypesFor(personnelType).find((s) => s.key === subType) ?? null;
}

function _typeMeta(personnelType) {
  return PERSONNEL_TYPES.find((p) => p.key === personnelType) ?? null;
}

/**
 * 기본 복무개월.
 *  - 병사: 군별 의무복무기간
 *  - 대체복무: 세부 유형 → 유형 기본값 (산업기능요원은 세부 미선택이면 현역 대상 34)
 *  - 간부: null (직접 입력)
 */
export function defaultMonthsFor(personnelType, subType, branchKey) {
  const cat = serviceCategory(personnelType);
  if (cat === 'cadre') return null;
  if (cat === 'soldier') return resolveServiceMonths(branchKey);
  const sub = _findSubType(personnelType, subType);
  return sub ? sub.months : _typeMeta(personnelType).months;
}

/**
 * 기본 연가 일수 (사용자가 직접 정하지 않았을 때).
 * 대체복무: 사회복무요원 28일(복무기간 전체), 그 외는 근무처 규정을 따르므로 0 = 미설정.
 */
export function defaultLeaveDaysFor(militaryInfo) {
  const pt = militaryInfo?.personnelType;
  if (isAlternative(pt)) return _typeMeta(pt).leaveDays;
  // 간부 연가는 복무기간 전체가 아니라 매년 부여된다 — 병사용 군종 기본값(24~28)을
  // 쓰면 틀린 값이 '기본값'처럼 보인다. 0 = 미설정(직접 입력 안내).
  if (serviceCategory(pt) === 'cadre') return 0;
  return resolveLeaveDays(militaryInfo?.branch);
}

/** 장병내일준비적금 가입 대상 (현역병·사회복무요원) */
export function savingsEligible(personnelType) {
  return hasSoldierRanks(personnelType) || personnelType === 'social';
}

/** 매월 10일 월급날을 쓰는가 (현역만 — 대체복무는 복무기관·근무처마다 다르다) */
export function paydayEligible(personnelType) {
  return !isAlternative(personnelType);
}

/**
 * 계급·군별을 표시하던 자리에 들어갈 신분 라벨.
 * 대체복무: 세부 유형 전체 이름(공중보건의사 등) → 없으면 유형 라벨. 그 외: personnelLabel.
 */
export function serviceLabel(militaryInfo) {
  const pt = militaryInfo?.personnelType;
  const sub = _findSubType(pt, militaryInfo?.subType);
  return sub ? sub.full : personnelLabel(pt);
}

/** 군별 라벨 (대체복무·미설정이면 null) */
export function branchLabelOf(militaryInfo) {
  if (!militaryInfo || isAlternative(militaryInfo.personnelType)) return null;
  return BRANCHES.find((b) => b.key === militaryInfo.branch)?.label ?? null;
}

/**
 * 받침에 맞는 조사를 붙인다.
 *   josa('전역', '을/를') → '전역을' · josa('소집해제', '을/를') → '소집해제를'
 * pair: '을/를' | '이/가' | '은/는' | '과/와' | '으로/로'
 */
export function josa(word, pair) {
  const w = String(word ?? '');
  const [withB, withoutB] = pair.split('/');
  const code = w.charCodeAt(w.length - 1) - 0xac00;
  if (!(code >= 0 && code <= 11171)) return w + withoutB;
  const jong = code % 28;
  if (pair === '으로/로' && (jong === 0 || jong === 8)) return w + withoutB;   // ㄹ 받침도 '로'
  return w + (jong ? withB : withoutB);
}

/*
 * 문구 사전 — 화면·알림·위젯·공유 문구가 '입대/전역'을 하드코딩하지 않도록.
 * 앱 이름 '전역까지' 만 예외로 고정이다. 모든 사전은 같은 키를 가져야 한다 (test-calc).
 */
const TERMS_ACTIVE = {
  start: '입대', end: '전역',
  startDate: '입대일', endDate: '전역일',
  endDone: '전역 완료', endCheer: '드디어 전역이다!!',
  info: '입대 정보', infoScreen: '전역 정보',
  member: '장병', family: '곰신', familyAnd: '가족·곰신',
  duty: '국방의 의무', benefitsTitle: '군인 혜택 모음', benefitsShort: '군인 혜택',
  roadmapTitle: '전역 로드맵', emoji: '🪖', bonusLeave: '포상휴가',
  bonusLeaveHint: '예) 분대장 포상, GOP 포상',
};

/* 간부는 '입대'가 아니라 '임관' — 호봉도 임관일 기준이다. 끝은 똑같이 '전역'. */
const TERMS_CADRE = {
  ...TERMS_ACTIVE,
  start: '임관', startDate: '임관일', info: '임관 정보',
  member: '간부',
};

const TERMS_SOCIAL = {
  start: '소집', end: '소집해제',
  startDate: '소집일', endDate: '소집해제일',
  endDone: '소집해제 완료', endCheer: '드디어 소집해제다!!',
  info: '복무 정보', infoScreen: '복무 정보',
  member: '요원', family: '가족·연인', familyAnd: '가족·연인',
  duty: '병역의 의무', benefitsTitle: '복무 혜택 모음', benefitsShort: '복무 혜택',
  roadmapTitle: '복무 로드맵', emoji: '🏢', bonusLeave: '추가 휴가',
  bonusLeaveHint: '예) 병가, 특별휴가',
};

const TERMS_ALT = {
  ...TERMS_SOCIAL,
  start: '편입', end: '복무만료',
  startDate: '편입일', endDate: '복무만료일',
  endDone: '복무 완료', endCheer: '드디어 복무만료다!!',
};

/** 신분 → 문구 사전 (모르는 값은 현역 문구) */
export function termsFor(personnelType) {
  if (personnelType === 'social') return TERMS_SOCIAL;
  if (isAlternative(personnelType)) return { ...TERMS_ALT, emoji: _typeMeta(personnelType).emoji };
  if (serviceCategory(personnelType) === 'cadre') return TERMS_CADRE;
  return TERMS_ACTIVE;
}
