/* eslint-disable no-console */
/**
 * adManager.js 검증 — react-native-google-mobile-ads 와 AsyncStorage 를 목으로
 * 갈아끼우고 실제 소스의 전면광고 로직을 돌린다.
 *
 *   node scripts/test-ads.js
 *
 * 이 파일이 지키는 것 (전부 '일치했지만 노출 안 됨' = 노출률 하락의 원인이었다):
 *  - 모듈 로드/초기화만으로는 load() 가 나가지 않는다 (예전: 앱 실행마다 로드)
 *  - CLOSED 후 자동 재로드하지 않는다
 *  - 빈도 제한(하루 2회·30분)에 걸리면 로드 자체를 하지 않는다
 *  - 55분 넘은 광고는 show() 하지 않고 폐기한다 (1시간 만료)
 *  - SDK 초기화 신호(markAdsReady/onAdsReady)
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
const MIN = 60 * 1000;
const advance = (ms) => { NOW = new RealDate(NOW.getTime() + ms); };

/* ─── 목 ────────────────────────────────────────────────────────────── */
let loads = 0;
let shows = 0;
const handlers = {};
const AdEventType = { LOADED: 'loaded', OPENED: 'opened', CLOSED: 'closed', ERROR: 'error' };
const fire = (ev, arg) => (handlers[ev] || []).forEach((h) => h(arg));
const AdsMock = {
  TestIds: { BANNER: 'test-banner', INTERSTITIAL: 'test-interstitial' },
  AdEventType,
  InterstitialAd: {
    createForAdRequest: () => ({
      addAdEventListener: (ev, h) => { (handlers[ev] = handlers[ev] || []).push(h); },
      load: () => { loads++; },
      show: () => { shows++; },
    }),
  },
};
let store = {};
const AsyncStorageMock = {
  getItem: async (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: async (k, v) => { store[k] = String(v); },
  removeItem: async (k) => { delete store[k]; },
};

const cache = new Map();
function loadModule(rel) {
  if (cache.has(rel)) return cache.get(rel);
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
    if (id === 'react-native-google-mobile-ads') return AdsMock;
    if (id.startsWith('.')) {
      const next = path.posix.join(path.posix.dirname(rel.split(path.sep).join('/')), id) + '.js';
      return loadModule(next);
    }
    return realRequire(id);
  };
  m._compile(out, abs);
  cache.set(rel, m.exports);
  return m.exports;
}

/* ─── 어서션 ────────────────────────────────────────────────────────── */
let pass = 0, fail = 0;
const fails = [];
function eq(a, e, label) {
  if (JSON.stringify(a) === JSON.stringify(e)) pass++;
  else { fail++; fails.push(`✗ ${label}\n    기대: ${JSON.stringify(e)}\n    실제: ${JSON.stringify(a)}`); }
}
const flush = () => new Promise((r) => setImmediate(r));

(async () => {
  const A = loadModule('src/utils/adManager.js');

  /* 로드만으로는 요청하지 않는다 */
  eq(loads, 0, '모듈 로드: load() 없음');

  /* 저장 흐름 진입 → 로드 1회, 중복 호출은 무시 */
  await A.preloadInterstitial();
  eq(loads, 1, '프리로드: load() 1회');
  await A.preloadInterstitial();
  eq(loads, 1, '로딩 중 재호출: 추가 load() 없음');
  fire(AdEventType.LOADED);
  await A.preloadInterstitial();
  eq(loads, 1, '로드 완료 후 재호출: 추가 load() 없음');
  eq(A.isInterstitialReady(), true, '로드 완료: ready');

  /* 표시 → 노출 기록 → 닫힘 후 자동 재로드 없음 */
  eq(await A.showInterstitial(), true, '1회차 표시');
  eq(shows, 1, 'show() 호출됨');
  fire(AdEventType.OPENED);
  await flush(); await flush();
  eq(store['@ad_count_today'], '1', '노출 기록: 오늘 1회');
  fire(AdEventType.CLOSED);
  eq(loads, 1, 'CLOSED 후 자동 재로드 없음');

  /* 30분 간격 안에서는 로드하지 않는다 */
  advance(10 * MIN);
  await A.preloadInterstitial();
  eq(loads, 1, '30분 미만: 로드 생략');

  /* 간격이 지나면 로드 */
  advance(21 * MIN);
  await A.preloadInterstitial();
  eq(loads, 2, '30분 경과: 로드');
  fire(AdEventType.LOADED);

  /* 55분 넘게 묵은 광고는 보여주지 않고 폐기 → 재로드 */
  advance(56 * MIN);
  eq(A.isInterstitialReady(), false, '만료: ready 아님');
  eq(await A.showInterstitial(), false, '만료 광고: 표시하지 않음');
  eq(shows, 1, '만료 광고: show() 호출 없음');
  await flush(); await flush();
  eq(loads, 3, '만료 광고: 폐기 후 재로드');
  fire(AdEventType.LOADED);

  /* 2회차 표시 → 하루 한도 도달 */
  eq(await A.showInterstitial(), true, '2회차 표시');
  fire(AdEventType.OPENED);
  await flush(); await flush();
  fire(AdEventType.CLOSED);
  eq(store['@ad_count_today'], '2', '노출 기록: 오늘 2회');

  /* 한도를 다 쓴 날엔 로드 자체를 하지 않는다 */
  advance(40 * MIN);
  await A.preloadInterstitial();
  eq(loads, 3, '하루 한도 소진: 로드 생략');
  eq(await A.showInterstitial(), false, '하루 한도 소진: 표시 안 함');
  await flush(); await flush();
  eq(loads, 3, '하루 한도 소진: show 시도가 로드를 부르지 않음');

  /* 다음 날엔 다시 로드 */
  NOW = new RealDate(2026, 8, 21, 10, 0, 0);
  await A.preloadInterstitial();
  eq(loads, 4, '다음 날: 로드 재개');

  /* SDK 초기화 신호 */
  eq(A.isAdsReady(), false, '초기화 전: ready 아님');
  let called = 0;
  A.onAdsReady(() => { called++; });
  A.markAdsReady();
  A.markAdsReady();
  eq(called, 1, 'markAdsReady: 대기 콜백 1회만');
  eq(A.isAdsReady(), true, '초기화 후: ready');
  A.onAdsReady(() => { called++; });
  eq(called, 2, '초기화 후 onAdsReady: 즉시 호출');

  console.log('\n──────────── 광고(전면) 테스트 ────────────');
  if (fail === 0) { console.log(`✓ 전체 통과: ${pass}건`); process.exit(0); }
  console.log(`통과 ${pass} / 실패 ${fail}\n`);
  fails.forEach((f) => console.log(f + '\n'));
  process.exit(1);
})().catch((e) => { console.error('\n테스트 실행 중 예외:', e); process.exit(1); });
