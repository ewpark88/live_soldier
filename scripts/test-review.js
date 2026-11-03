/* eslint-disable no-console */
/**
 * reviewPrompt.js 검증 — expo-store-review 와 AsyncStorage 를 목으로 갈아끼우고
 * 실제 소스의 리뷰 요청 조건을 돌린다.
 *
 *   node scripts/test-review.js
 *
 * 지키는 것 (Google Play In-App Review 가이드):
 *  - 충분히 써보기 전(설치 3일·실행한 날 3일·저장 3회)에는 요청하지 않는다
 *  - 전면광고가 뜬 저장에는 요청하지 않는다 (광고 위에 팝업을 쌓지 않음)
 *  - 90일 간격, 누적 3회 한도
 *  - 리뷰를 쓸 수 없는 기기 / API 예외에서도 throw 하지 않는다
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
const babel = require(path.join(ROOT, 'node_modules', '@babel', 'core'));

global.__DEV__ = false;

/* ─── 시계 고정 ─────────────────────────────────────────────────────── */
const RealDate = Date;
let NOW = new RealDate(2026, 8, 20, 10, 0, 0);
global.Date = class extends RealDate {
  constructor(...a) { if (a.length === 0) super(NOW.getTime()); else super(...a); }
  static now() { return NOW.getTime(); }
};
const DAY = 24 * 60 * 60 * 1000;
const advance = (ms) => { NOW = new RealDate(NOW.getTime() + ms); };

/* ─── 목 ────────────────────────────────────────────────────────────── */
let requests = 0;
let available = true;
let throwOnRequest = false;
const StoreReviewMock = {
  isAvailableAsync: async () => available,
  requestReview: async () => { if (throwOnRequest) throw new Error('boom'); requests++; },
};
let store = {};
let throwOnStorage = false;
const AsyncStorageMock = {
  getItem: async (k) => {
    if (throwOnStorage) throw new Error('disk');
    return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
  },
  setItem: async (k, v) => { if (throwOnStorage) throw new Error('disk'); store[k] = String(v); },
  removeItem: async (k) => { delete store[k]; },
};

function loadModule(rel) {
  const abs = path.join(ROOT, rel);
  const out = babel.transformSync(fs.readFileSync(abs, 'utf8'), {
    filename: abs,
    presets: [[path.join(ROOT, 'node_modules', 'babel-preset-expo'), { jsxRuntime: 'classic' }]],
    babelrc: false, configFile: false,
  }).code;
  const m = new Module(rel, null);
  m.filename = abs;
  m.paths = Module._nodeModulePaths(path.dirname(abs));
  const realRequire = m.require.bind(m);
  m.require = (id) => {
    if (id.includes('async-storage')) return { __esModule: true, default: AsyncStorageMock };
    if (id === 'expo-store-review') return StoreReviewMock;
    return realRequire(id);
  };
  m._compile(out, abs);
  return m.exports;
}

/* ─── 어서션 ────────────────────────────────────────────────────────── */
let pass = 0, fail = 0;
const fails = [];
function eq(a, e, label) {
  if (JSON.stringify(a) === JSON.stringify(e)) pass++;
  else { fail++; fails.push(`✗ ${label}\n    기대: ${JSON.stringify(e)}\n    실제: ${JSON.stringify(a)}`); }
}
const state = () => JSON.parse(store['@review_v1'] || 'null');
const save = (R, adShown = false) => R.noteMajorSave({ adShown, delayMs: 0 });

(async () => {
  const R = loadModule('src/utils/reviewPrompt.js');

  /* ── 순수 판단 ── */
  const base = { firstOpenAt: 0, openDays: ['a', 'b', 'c'], saves: 3, lastAskedAt: null, askCount: 0 };
  const T = 3 * DAY;
  eq(R.shouldAsk(base, T, false), true, 'shouldAsk: 조건 충족');
  eq(R.shouldAsk(base, T, true), false, 'shouldAsk: 광고 뜬 저장 제외');
  eq(R.shouldAsk(base, T - 1, false), false, 'shouldAsk: 설치 3일 미만');
  eq(R.shouldAsk({ ...base, openDays: ['a', 'b'] }, T, false), false, 'shouldAsk: 실행한 날 2일');
  eq(R.shouldAsk({ ...base, saves: 2 }, T, false), false, 'shouldAsk: 저장 2회');
  eq(R.shouldAsk({ ...base, askCount: 3 }, T, false), false, 'shouldAsk: 누적 3회 한도');
  eq(R.shouldAsk({ ...base, lastAskedAt: T - 89 * DAY }, T, false), false, 'shouldAsk: 90일 미만');
  eq(R.shouldAsk({ ...base, lastAskedAt: T - 90 * DAY }, T, false), true, 'shouldAsk: 90일 경과');
  eq(R.shouldAsk({ ...base, firstOpenAt: null }, T, false), false, 'shouldAsk: 실행 기록 없음');
  eq(R.shouldAsk(null, T, false), false, 'shouldAsk: null 상태');

  /* ── 첫날: 저장을 아무리 해도 요청 없음 ── */
  await R.recordAppOpen();
  await R.recordAppOpen();   // 같은 날 두 번 → 하루로 센다
  eq(state().openDays.length, 1, '같은 날 재실행: 1일');
  for (let i = 0; i < 5; i++) eq(await save(R), false, `첫날 저장 ${i + 1}: 요청 없음`);
  eq(state().saves, 5, '저장 횟수 누적');

  /* ── 3일째(실행한 날 3일)지만 설치 후 3일 미만이면 아직 ── */
  advance(1 * DAY); await R.recordAppOpen();
  advance(1 * DAY); await R.recordAppOpen();
  eq(state().openDays.length, 3, '실행한 날 3일');
  eq(await save(R), false, '설치 2일째: 요청 없음');

  /* ── 설치 3일 경과 — 광고가 뜬 저장에는 요청 안 함 ── */
  advance(1 * DAY); await R.recordAppOpen();
  eq(await save(R, true), false, '광고 뜬 저장: 요청 없음');
  eq(requests, 0, '아직 requestReview 0회');

  /* ── 광고가 안 뜬 저장 → 요청 ── */
  eq(await save(R), true, '조건 충족: 요청');
  eq(requests, 1, 'requestReview 1회');
  eq(state().askCount, 1, 'askCount 1');

  /* ── 쿨다운 ── */
  eq(await save(R), false, '직후 저장: 쿨다운');
  advance(89 * DAY);
  eq(await save(R), false, '89일 뒤: 쿨다운');
  advance(1 * DAY);
  eq(await save(R), true, '90일 뒤: 2회차 요청');
  advance(90 * DAY);
  eq(await save(R), true, '180일 뒤: 3회차 요청');
  advance(365 * DAY);
  eq(await save(R), false, '누적 3회 이후: 요청 없음');
  eq(requests, 3, 'requestReview 총 3회');

  /* ── 사용 불가 기기 / API 예외 / 저장소 예외 ── */
  store = {};
  NOW = new RealDate(2026, 0, 1, 10, 0, 0);
  for (let d = 0; d < 4; d++) { await R.recordAppOpen(); advance(DAY); }
  await save(R); await save(R);
  available = false;
  eq(await save(R), false, 'isAvailableAsync false: 요청 없음');
  eq(state().askCount, 0, '사용 불가: 횟수 소진 안 함');
  available = true;
  throwOnRequest = true;
  let threw = false;
  try { eq(await save(R), false, 'requestReview 예외: false'); } catch { threw = true; }
  eq(threw, false, 'requestReview 예외: throw 안 함');
  throwOnRequest = false;
  throwOnStorage = true;
  threw = false;
  try { await R.recordAppOpen(); await save(R); } catch { threw = true; }
  eq(threw, false, '저장소 예외: throw 안 함');
  throwOnStorage = false;

  /* ── 손상된 저장값 ── */
  store['@review_v1'] = '{not json';
  eq(await save(R), false, '손상된 값: 요청 없음, throw 없음');
  eq(state().saves, 1, '손상된 값: 새로 시작');

  /* ── 동시 호출은 하나만 ── */
  store = {};
  NOW = new RealDate(2026, 0, 1, 10, 0, 0);
  for (let d = 0; d < 4; d++) { await R.recordAppOpen(); advance(DAY); }
  await save(R); await save(R);
  const before = requests;
  const res = await Promise.all([save(R), save(R)]);
  eq(res.filter(Boolean).length, 1, '동시 호출: 요청 1번');
  eq(requests - before, 1, '동시 호출: requestReview 1회');

  /* ── 결과 ── */
  if (fails.length) console.log(fails.join('\n'));
  console.log(`\nreview: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
