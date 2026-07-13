/**
 * 색상 팔레트 — 라이트/다크 두 벌.
 * 화면은 useThemeColors() 훅으로 현재 테마 팔레트를 받아 스타일을 생성한다.
 * (정적 import 호환용으로 COLORS = lightColors 도 export)
 */
export const lightColors = {
  primary: '#234E44',        // 깊고 차분한 포레스트 그린 (로고와 통일)
  primaryLight: '#3F8170',
  primaryDark: '#15352D',
  accent: '#D99A2B',         // 메탈릭 골드 (로고 별과 동일 계열, 쨍한 주황 대체)
  accentLight: '#F0C45E',
  background: '#F5F7F6',      // 맑은 오프화이트 (칙칙한 회녹색 제거)
  card: '#FFFFFF',
  text: '#15231E',
  textSecondary: '#647C75',
  textLight: '#A1B4AE',
  border: '#E6ECEA',         // 한층 옅고 부드러운 구분선
  success: '#1FA971',
  warning: '#E8943A',
  danger: '#E4564B',
  white: '#FFFFFF',
  adBackground: '#EEF2F1',
  adBorder: '#DCE5E2',
  tabActive: '#234E44',
  tabInactive: '#A1B4AE',
  progressBg: '#E6ECEA',
  progressFill: '#234E44',
  shadow: '#1B3F37',         // 초록빛이 도는 부드러운 그림자
  highlightBg: '#EAF3EF',    // 현재 항목 강조 배경
  overlay: 'rgba(12,22,18,0.5)',

  // ── 대비 보장 ────────────────────────────────────────────────
  // primary 위에 얹는 글자색. 다크에서 primary 는 밝은 민트라
  // 흰 글자를 쓰면 읽을 수 없다. 버튼은 반드시 이 값을 쓴다.
  onPrimary: '#FFFFFF',

  // ── 히어로 (브랜드 표면) ──────────────────────────────────────
  // 라이트/다크 양쪽 모두 딥그린이다. 브랜드 표면이라 테마 분기가 없다.
  heroFrom: '#2E6455',
  heroTo: '#173B33',
  heroText: '#F2F7F5',
  heroTextMuted: 'rgba(242,247,245,0.72)',
  heroBorder: 'rgba(255,255,255,0.10)',
  heroSheen: 'rgba(255,255,255,0.12)',

  // ── 메탈릭 골드 ──────────────────────────────────────────────
  goldFrom: '#F0C45E',
  goldTo: '#C9861B',
  onGold: '#3A2705',

  // ── 소프트 표면 (하드코딩 색을 흡수한다) ──────────────────────
  primarySoft: '#E8F1EE',
  accentSoft: '#FDF3DF',
  accentText: '#7A4800',
  successSoft: '#E4F5EE',
  warningSoft: '#FDF0E1',
  dangerSoft: '#FCE9E7',
  surfaceSunken: '#EFF3F1',
  surfaceSunkenBorder: '#DFE7E4',
  cardElevated: '#FFFFFF',
  skeleton: '#E6ECEA',
  shadowStrong: '#0B211B',

  // 달력 주말
  sat: '#3B72C4',
  sun: '#D8483E',

  // 모달 딤 — 기존 overlay 와 같은 값. 신규 코드는 scrim 을 쓴다.
  scrim: 'rgba(12,22,18,0.5)',
  scrimStrong: 'rgba(12,22,18,0.7)',

  // ── 카운트다운 단계별 배경 틴트 ───────────────────────────────
  // 히어로만 단계를 표현한다. 화면 전체 배경을 물들이지 않는다.
  phase: {
    normal: { bg: '#F5F7F6' },
    d100: { bg: '#F4F6EE' },
    d30: { bg: '#FAF4E8' },
    d7: { bg: '#FDF0E3' },
  },
};

export const darkColors = {
  primary: '#5FB09B',
  primaryLight: '#74C2AE',
  primaryDark: '#3E7A6B',
  accent: '#E8B24A',
  accentLight: '#F2C46B',
  background: '#0D1412',
  card: '#171F1C',
  text: '#EAF1EF',
  textSecondary: '#9FB6AF',
  textLight: '#6A827B',
  border: '#28332F',
  success: '#2DB67D',
  warning: '#E8943A',
  danger: '#E5635A',
  white: '#FFFFFF',
  adBackground: '#171F1C',
  adBorder: '#28332F',
  tabActive: '#74C2AE',
  tabInactive: '#6A827B',
  progressBg: '#28332F',
  progressFill: '#5FB09B',
  shadow: '#000000',
  highlightBg: '#1B2723',
  overlay: 'rgba(0,0,0,0.6)',

  // 다크에서 primary 는 밝은 민트다. 그 위엔 어두운 글자를 얹어야 읽힌다.
  onPrimary: '#08120F',

  heroFrom: '#22564A',
  heroTo: '#12312A',
  heroText: '#EAF1EF',
  heroTextMuted: 'rgba(234,241,239,0.68)',
  heroBorder: 'rgba(255,255,255,0.08)',
  heroSheen: 'rgba(255,255,255,0.10)',

  goldFrom: '#F2C46B',
  goldTo: '#D08F22',
  onGold: '#2A1C03',

  primarySoft: '#17302A',
  accentSoft: '#2C2415',
  accentText: '#F0C45E',
  successSoft: '#12332A',
  warningSoft: '#33291A',
  dangerSoft: '#39211F',
  surfaceSunken: '#101917',
  surfaceSunkenBorder: '#28332F',
  cardElevated: '#1D2724',
  skeleton: '#222D29',
  shadowStrong: '#000000',

  sat: '#7FA8E8',
  sun: '#E8776D',

  scrim: 'rgba(0,0,0,0.6)',
  scrimStrong: 'rgba(0,0,0,0.78)',

  phase: {
    normal: { bg: '#0D1412' },
    d100: { bg: '#111512' },
    d30: { bg: '#151510' },
    d7: { bg: '#1A1410' },
  },
};

/** 정적 import 호환(폴백) — 기본은 라이트 팔레트 */
export const COLORS = lightColors;

export function paletteFor(scheme) {
  return scheme === 'dark' ? darkColors : lightColors;
}
