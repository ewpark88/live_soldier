/**
 * 테마 레지스트리.
 *
 * 팔레트는 (themeId × scheme) 로 해석된다. 각 테마는 base 위의 부분
 * 오버라이드만 제공하므로, 머지 결과는 항상 전 키가 채워져 있다.
 *
 * ⚠️ 이 디렉터리는 런타임 라이브러리를 import 하지 않는다 (base.js 헤더 참고).
 *    형제 팔레트 파일 import 만 허용.
 */
import { baseLight, baseDark } from './base';
import forest from './forest';
import nightvision from './nightvision';
import aurora from './aurora';
import sunset from './sunset';
import abyss from './abyss';
import matte from './matte';
import sakura from './sakura';
import redalert from './redalert';
import steel from './steel';
import oldman from './oldman';
import victory from './victory';

/** 2단계로 머지할 키. 그 외는 얕은 머지, 배열은 통째 교체. */
const NESTED = ['phase'];

function mergePalette(base, over) {
  if (!over) return base;
  const out = { ...base, ...over };
  for (const key of NESTED) {
    if (!over[key]) continue;
    const merged = { ...base[key] };
    for (const stage of Object.keys(over[key])) {
      merged[stage] = { ...base[key][stage], ...over[key][stage] };
    }
    out[key] = merged;
  }
  return out;
}

/* ─── 테마 목록 ──────────────────────────────────────────────── */

export const THEMES = {
  nightvision, forest, aurora, sunset, abyss, matte, sakura, redalert,
  steel, oldman, victory,
};

/** 피커 표시 순서 — 해금 테마는 맨 뒤 (잠겨 있어도 보여준다) */
export const THEME_LIST = [
  nightvision, forest, aurora, sunset, abyss, matte, sakura, redalert,
  steel, oldman, victory,
];

/** 신규 설치 기본값 */
export const DEFAULT_THEME_ID = 'nightvision';

/** 기존 사용자가 업데이트 후 유지할 테마 */
export const LEGACY_THEME_ID = 'forest';

/* ─── 해석 ───────────────────────────────────────────────────── */

export function getTheme(themeId) {
  return THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
}

/**
 * 테마가 요청한 scheme 을 지원하지 않으면 지원하는 첫 scheme 으로 강제한다.
 * 저장된 mode 는 건드리지 않는다 — 양쪽 지원 테마로 돌아오면 복원돼야 한다.
 */
export function effectiveScheme(themeId, requested) {
  const t = getTheme(themeId);
  return t.schemes.includes(requested) ? requested : t.schemes[0];
}

const cache = new Map();

/** (themeId, scheme) → 완성된 팔레트. 메모이즈됨. */
export function resolvePalette(themeId, requested) {
  const t = getTheme(themeId);
  const scheme = effectiveScheme(t.id, requested);
  const key = `${t.id}:${scheme}`;
  if (!cache.has(key)) {
    const base = scheme === 'dark' ? baseDark : baseLight;
    cache.set(key, mergePalette(base, t[scheme]));
  }
  return cache.get(key);
}
