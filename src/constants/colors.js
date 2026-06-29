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
};

/** 정적 import 호환(폴백) — 기본은 라이트 팔레트 */
export const COLORS = lightColors;

export function paletteFor(scheme) {
  return scheme === 'dark' ? darkColors : lightColors;
}
