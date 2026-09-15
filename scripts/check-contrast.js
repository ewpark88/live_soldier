/* eslint-disable no-console */
/**
 * 테마 대비 검증 (의존성 없음).
 *
 *   node scripts/check-contrast.js
 *   npm run theme:check
 *
 * THEME_LIST × 지원 scheme 을 전부 돌며 `src/theme/contrastPairs.js` 의 페어를
 * WCAG 상대휘도 공식으로 검사한다. 하나라도 미달이면 exit 1.
 *
 * 팔레트 파일들은 순수 데이터(런타임 라이브러리 import 0)라 ESM 키워드만
 * 벗겨내면 Node 에서 그대로 실행된다 — `scripts/test-calc.js` 와 같은 방식이다.
 * 덕분에 머지 로직(mergePalette/resolvePalette)이 앱과 스크립트에서 한 벌이다.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

/* ─── 초경량 ESM 로더 ─────────────────────────────────────────── */

const IMPORT_RE = /^\s*import\s+([^;]+?)\s+from\s+['"](.+?)['"];?[ \t]*\r?$/gm;

function resolveDep(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const cand of [base, `${base}.js`, path.join(base, 'index.js')]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  throw new Error(`모듈을 찾을 수 없음: ${spec} (from ${fromFile})`);
}

function collectNames(code) {
  const names = new Set();
  for (const re of [/^function\s+([A-Za-z0-9_$]+)/gm, /^const\s+([A-Za-z0-9_$]+)\s*=/gm]) {
    let m;
    while ((m = re.exec(code))) names.add(m[1]);
  }
  return [...names];
}

const cache = new Map();

function loadModule(file) {
  if (cache.has(file)) return cache.get(file);

  const raw = fs.readFileSync(file, 'utf8');
  const sandbox = { console, Object, Array, Map, Set, String, Number, JSON, Math };

  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(raw))) {
    const clause = m[1].trim();
    const dep = loadModule(resolveDep(file, m[2]));
    if (clause.startsWith('{')) {
      clause.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean)
        .forEach((n) => { sandbox[n] = dep[n]; });
    } else {
      sandbox[clause] = dep.default;
    }
  }

  const code = raw
    .replace(IMPORT_RE, '')
    .replace(/^export\s+default\s+/gm, 'const __default = ')
    .replace(/^export\s+/gm, '');

  vm.createContext(sandbox);
  vm.runInContext(`${code}\nthis.__api = { ${collectNames(code).join(', ')} };`, sandbox);

  const api = sandbox.__api;
  if ('__default' in api) api.default = api.__default;
  cache.set(file, api);
  return api;
}

/* ─── 색 파싱 · 대비 계산 ─────────────────────────────────────── */

function parseColor(c) {
  if (typeof c !== 'string') return null;
  const hex = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgba = c.trim().match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const p = rgba[1].split(',').map((x) => parseFloat(x.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  return null;
}

/** 알파가 있는 전경색을 배경 위에 합성한다 */
function composite(fg, bg) {
  if (fg.a >= 1) return fg;
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fgRaw, bgRaw) {
  const bg = parseColor(bgRaw);
  const fg0 = parseColor(fgRaw);
  if (!bg || !fg0) return null;
  // 배경 자체가 반투명이면 이 검사에서 다룰 수 없다 (팔레트엔 없음)
  const fg = composite(fg0, bg);
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** 'phase.d7.gradient.@last' 같은 점 경로를 판다 */
function pick(palette, dotted) {
  let cur = palette;
  for (const seg of dotted.split('.')) {
    if (cur == null) return undefined;
    cur = seg === '@last' && Array.isArray(cur) ? cur[cur.length - 1] : cur[seg];
  }
  return cur;
}

/* ─── 실행 ────────────────────────────────────────────────────── */

const palettes = loadModule(path.join(ROOT, 'src', 'theme', 'palettes', 'index.js'));
const pairsMod = loadModule(path.join(ROOT, 'src', 'theme', 'contrastPairs.js'));

const { THEME_LIST, resolvePalette } = palettes;
const { CONTRAST_PAIRS, PHASE_PAIRS, PHASE_STAGES, KNOWN_ISSUES } = pairsMod;

const failures = [];
const waived = [];
let checked = 0;

console.log('\n──────────── 테마 대비 검사 ────────────');

for (const theme of THEME_LIST) {
  for (const scheme of theme.schemes) {
    const p = resolvePalette(theme.id, scheme);

    const pairs = [
      ...CONTRAST_PAIRS,
      ...PHASE_STAGES.flatMap((stage) =>
        PHASE_PAIRS.flatMap((q) => {
          if (!q.bg.endsWith('.@all')) {
            return [{
              fg: `phase.${stage}.${q.fg}`,
              bg: `phase.${stage}.${q.bg}`,
              min: q.min,
              label: `${q.label} · ${stage}`,
            }];
          }
          // @all — 배열 길이만큼 전개한다 (테마마다 스톱 수가 다르다)
          const base = q.bg.slice(0, -'.@all'.length);
          const arr = pick(p, `phase.${stage}.${base}`);
          if (!Array.isArray(arr)) {
            return [{ fg: `phase.${stage}.${q.fg}`, bg: `phase.${stage}.${base}`, min: q.min, label: `${q.label} · ${stage}` }];
          }
          return arr.map((_, i) => ({
            fg: `phase.${stage}.${q.fg}`,
            bg: `phase.${stage}.${base}.${i}`,
            min: q.min,
            label: `${q.label} · ${stage} · 스톱${i + 1}/${arr.length}`,
          }));
        })
      ),
    ];

    for (const pair of pairs) {
      const fg = pick(p, pair.fg);
      const bg = pick(p, pair.bg);
      if (fg === undefined || bg === undefined) {
        failures.push({ theme: theme.id, scheme, pair, ratio: null, reason: '키 없음' });
        continue;
      }
      const ratio = contrast(fg, bg);
      checked += 1;
      if (ratio === null) {
        failures.push({ theme: theme.id, scheme, pair, ratio: null, reason: `파싱 실패 (${fg} / ${bg})` });
        continue;
      }
      if (ratio + 1e-9 >= pair.min) continue;

      const waiverKey = `${theme.id}/${scheme}/${pair.fg}|${pair.bg}`;
      const note = KNOWN_ISSUES && KNOWN_ISSUES[waiverKey];
      if (note) waived.push({ key: waiverKey, pair, ratio, note });
      else failures.push({ theme: theme.id, scheme, pair, ratio, fg, bg });
    }
  }
}

if (waived.length) {
  console.log(`\n! 유예 ${waived.length}건 — v1.0.8 팔레트의 기존 부채 (P5에서 정리)\n`);
  for (const w of waived) {
    console.log(`  ${w.key}  ${w.ratio.toFixed(2)} : 1  (필요 ${w.pair.min})`);
    console.log(`      ${w.note}`);
  }
}

if (failures.length) {
  console.log(`\n✗ ${failures.length}건 미달 (검사 ${checked}건)\n`);
  for (const f of failures) {
    const got = f.ratio === null ? f.reason : `${f.ratio.toFixed(2)} : 1  (필요 ${f.pair.min})`;
    console.log(`  [${f.theme}/${f.scheme}] ${f.pair.label}`);
    console.log(`      ${f.pair.fg} (${f.fg ?? '?'})  on  ${f.pair.bg} (${f.bg ?? '?'})`);
    console.log(`      → ${got}\n`);
  }
  process.exit(1);
}

const suffix = waived.length ? ` · 유예 ${waived.length}건` : '';
console.log(`\n✓ 전체 통과: ${checked}건 (테마 ${THEME_LIST.length}종)${suffix}\n`);
