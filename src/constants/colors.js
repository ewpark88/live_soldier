/**
 * 색상 팔레트 — 라이트/다크 두 벌.
 * 화면은 useThemeColors() 훅으로 현재 테마 팔레트를 받아 스타일을 생성한다.
 * (정적 import 호환용으로 COLORS = lightColors 도 export)
 */
export const lightColors = {
  primary: '#2E5B4F',
  primaryLight: '#4A8C7C',
  primaryDark: '#1A3D34',
  accent: '#F5A623',
  accentLight: '#FBBF47',
  background: '#F0F4F3',
  card: '#FFFFFF',
  text: '#1A2E27',
  textSecondary: '#6B8880',
  textLight: '#A8C0BB',
  border: '#D8E8E5',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  white: '#FFFFFF',
  adBackground: '#E8F0EF',
  adBorder: '#B0C8C4',
  tabActive: '#2E5B4F',
  tabInactive: '#9EB8B3',
  progressBg: '#D8E8E5',
  progressFill: '#2E5B4F',
  shadow: '#2E5B4F',
  highlightBg: '#E8F3F0',   // 현재 항목 강조 배경
  overlay: 'rgba(0,0,0,0.45)',
};

export const darkColors = {
  primary: '#5AA391',
  primaryLight: '#6FB8A6',
  primaryDark: '#3E7A6B',
  accent: '#F5A623',
  accentLight: '#FBBF47',
  background: '#0E1513',
  card: '#19211E',
  text: '#EAF1EF',
  textSecondary: '#A6BDB6',
  textLight: '#708A83',
  border: '#2B3833',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF453A',
  white: '#FFFFFF',
  adBackground: '#19211E',
  adBorder: '#2B3833',
  tabActive: '#6FB8A6',
  tabInactive: '#6B807A',
  progressBg: '#2B3833',
  progressFill: '#5AA391',
  shadow: '#000000',
  highlightBg: '#1E2E2A',
  overlay: 'rgba(0,0,0,0.6)',
};

/** 정적 import 호환(폴백) — 기본은 라이트 팔레트 */
export const COLORS = lightColors;

export function paletteFor(scheme) {
  return scheme === 'dark' ? darkColors : lightColors;
}
