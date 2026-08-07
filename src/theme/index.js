/**
 * 테마 배럴 — 화면/컴포넌트는 여기서 한 줄로 가져다 쓴다.
 *
 *   import { useThemeColors, space as sp, radius as r, type as ty, elev } from '../theme';
 */
export { ThemeProvider, useTheme, useThemeColors } from './ThemeContext';
export { space, gutter, radius, type, tabular, motion, elev } from './tokens';
export {
  THEMES, THEME_LIST, DEFAULT_THEME_ID, LEGACY_THEME_ID,
  getTheme, effectiveScheme, resolvePalette,
} from './palettes';
