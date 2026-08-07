/**
 * 하위호환 shim.
 *
 * 팔레트의 진짜 소유자는 `src/theme/palettes/` 다 (테마별 레지스트리).
 * 이 파일은 예전 경로로 색을 import 하던 코드를 위해 남겨둔 재수출 계층이고,
 * 신규 코드는 `useThemeColors()` 또는 `src/theme/palettes` 를 쓴다.
 *
 * 2릴리스 뒤 삭제 후보.
 */
import { baseLight, baseDark } from '../theme/palettes/base';
import { resolvePalette, LEGACY_THEME_ID } from '../theme/palettes';

export const lightColors = baseLight;
export const darkColors = baseDark;

/** 정적 import 호환(폴백) — 기본은 라이트 팔레트 */
export const COLORS = baseLight;

export function paletteFor(scheme) {
  return resolvePalette(LEGACY_THEME_ID, scheme);
}
