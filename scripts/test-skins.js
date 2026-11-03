/* eslint-disable no-console */
/**
 * 막대병 도감 검증 — 보유·장착 상태, 리그 포즈, 보상형 전면광고 흐름.
 *
 *   node scripts/test-skins.js
 *
 * 지키는 것:
 *  - 해금하지 않은 모습은 장착할 수 없다 · 손상값/모르는 id 는 정리된다
 *  - 백업 복원은 해금을 합친다 (광고로 얻은 것을 잃지 않는다)
 *  - 카탈로그와 리그 id 가 1:1 · 모든 포즈가 모든 위상에서 유한한 숫자
 *  - 포즈 함수에 'worklet' 이 빠지지 않았다 (빠지면 홈 진입 즉시 크래시 — v1.4.1 전례)
 *  - 보상형: 도감 밖에서는 로드하지 않는다 · EARNED_REWARD 없이 닫으면 보상 없음 ·
 *    전면광고가 떠 있으면 거부 · 55분 지나면 폐기
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
const babel = require(path.join(ROOT, 'node_modules', '@babel', 'core'));

global.__DEV__ = false;

/* ─── 시계 고정 ─────────────────────────────────────────────────────── */
const RealDate = Date;
let NOW = new RealDate(2026, 10, 3, 10, 0, 0);
global.Date = class extends RealDate {
  constructor(...a) { if (a.length === 0) super(NOW.getTime()); else super(...a); }
  static now() { return NOW.getTime(); }
};
const MIN = 60 * 1000;
const advance = (ms) => { NOW = new RealDate(NOW.getTime() + ms); };

/* ─── 광고 목 ───────────────────────────────────────────────────────── */
let loads = 0;
let shows = 0;
let showThrows = false;
const handlers = {};
const AdEventType = { LOADED: 'loaded', OPENED: 'opened', CLOSED: 'closed', ERROR: 'error' };
const RewardedAdEventType = { LOADED: 'rewarded_loaded', EARNED_REWARD: 'rewarded_earned_reward' };
const fire = (ev, arg) => (handlers[ev] || []).forEach((h) => h(arg));
const AdsMock = {
  TestIds: { BANNER: 'tb', INTERSTITIAL: 'ti', REWARDED_INTERSTITIAL: 'tri' },
  AdEventType,
  RewardedAdEventType,
  RewardedInterstitialAd: {
    createForAdRequest: () => ({
      addAdEventListener: (ev, h) => { (handlers[ev] = handlers[ev] || []).push(h); },
      load: () => { loads++; },
      show: async () => { if (showThrows) throw new Error('show'); shows++; },
    }),
  },
};
let interstitialShowing = false;
const AdManagerStub = { isInterstitialShowing: () => interstitialShowing };

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
    if (id === 'react-native-google-mobile-ads') return AdsMock;
    if (id === './adManager') return AdManagerStub;
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
  const C = loadModule('src/constants/soldierSkins.js');
  const K = loadModule('src/utils/skins.js');
  const R = loadModule('src/components/motion/soldierRig.js');

  /* ── 카탈로그 ── */
  eq(C.SKIN_IDS.length >= 10, true, '카탈로그: 10종 이상');
  eq(new Set(C.SKIN_IDS).size, C.SKIN_IDS.length, '카탈로그: id 중복 없음');
  eq(C.FREE_SKINS, ['run'], '카탈로그: 무료는 기본 달리기 하나');
  eq(C.DEFAULT_SKIN, 'run', '카탈로그: 기본값');
  eq(C.SOLDIER_SKINS.every((k) => k.name && k.desc && k.emoji), true, '카탈로그: 이름·설명·이모지');
  eq(C.SOLDIER_SKINS.some((k) => /졸라맨/.test(k.name + k.desc)), false, "카탈로그: '졸라맨' 표기 없음 (상표)");
  eq(C.skinById('nope').id, 'run', 'skinById: 모르는 id → 기본');

  /* ── 리그 ── */
  eq(Object.keys(R.RIGS).sort(), [...C.SKIN_IDS].sort(), '리그: 카탈로그와 id 1:1');
  const KEYS = ['lean', 'bodyY', 'thighA', 'shinA', 'thighB', 'shinB', 'armA', 'forearmA', 'armB', 'forearmB', 'flash'];
  for (const id of C.SKIN_IDS) {
    const rig = R.RIGS[id];
    let finite = true;
    for (let i = 0; i <= 64; i++) {
      const p = rig.pose((i / 64) * Math.PI * 2);
      if (!KEYS.every((k) => Number.isFinite(p[k]))) finite = false;
      if (p.flash < 0 || p.flash > 1) finite = false;
    }
    eq(finite, true, `리그 ${id}: 모든 위상에서 유한한 값`);
    eq(rig.cycle > 0 && rig.rest >= 0 && rig.rest <= 1, true, `리그 ${id}: 주기·정지 위치`);
    // 연속성: 주기 끝과 처음이 이어진다 (루프가 튀지 않는다)
    const a = rig.pose(0), b = rig.pose(Math.PI * 2 - 1e-9);
    if (!rig.impulse) eq(KEYS.every((k) => Math.abs(a[k] - b[k]) < 1e-3), true, `리그 ${id}: 주기 끝이 처음과 이어진다`);
  }
  eq(KEYS.every((k) => Number.isFinite(R.cheerPose()[k])), true, '리그: 만세 포즈');
  {
    // 'worklet' 정적 검사 — 포즈 함수 본문 첫 줄
    const src = fs.readFileSync(path.join(ROOT, 'src/components/motion/soldierRig.js'), 'utf8');
    const fns = [...src.matchAll(/function (\w+)\([^)]*\)\s*\{\s*\n\s*([^\n]*)/g)]
      .filter(([, name]) => name !== 'dims' && name !== 'rigFor');
    const missing = fns.filter(([, , first]) => !/^'worklet';/.test(first)).map(([, n]) => n);
    eq(missing, [], "리그: 모든 포즈 함수에 'worklet'");
    eq(fns.length >= 12, true, '리그: 포즈 함수를 찾았다');
    const comp = fs.readFileSync(path.join(ROOT, 'src/components/motion/StickSoldier.js'), 'utf8');
    eq(/function rot\(deg\) \{\s*\n\s*'worklet';/.test(comp), true, "StickSoldier: rot 에 'worklet'");
  }

  /* ── 보유·장착 상태 ── */
  eq(K.normalizeSkins(null), { selected: 'run', unlocked: ['run'], dexSeen: false }, '상태: null → 기본');
  eq(K.normalizeSkins('x'), { selected: 'run', unlocked: ['run'], dexSeen: false }, '상태: 문자열 → 기본');
  eq(K.normalizeSkins({ selected: 'shoot', unlocked: ['shoot'] }).selected, 'shoot', '상태: 해금된 장착 유지');
  eq(K.normalizeSkins({ selected: 'shoot', unlocked: [] }).selected, 'run', '상태: 미해금 장착 → 기본');
  eq(K.normalizeSkins({ unlocked: ['zzz', 7, 'dig', 'dig'] }).unlocked, ['run', 'dig'], '상태: 모르는 id·중복 정리, 카탈로그 순서');
  {
    let s = K.normalizeSkins(null);
    eq(K.withSelected(s, 'march').selected, 'run', '장착: 미해금은 거부');
    s = K.withUnlocked(s, 'march');
    eq(s.unlocked, ['run', 'march'], '해금: 추가');
    eq(K.withUnlocked(s, 'march'), s, '해금: 중복 없음');
    eq(K.withUnlocked(s, 'nope').unlocked, ['run', 'march'], '해금: 모르는 id 무시');
    s = K.withSelected(s, 'march');
    eq(s.selected, 'march', '장착: 해금 후 가능');
    eq(K.isUnlocked(s, 'march'), true, 'isUnlocked');
    const m = K.mergeSkins({ selected: 'march', unlocked: ['march'] }, { selected: 'dig', unlocked: ['dig'], dexSeen: true });
    eq(m, { selected: 'dig', unlocked: ['run', 'march', 'dig'], dexSeen: true }, '병합: 합집합 · 백업 장착');
    eq(K.mergeSkins({ selected: 'march', unlocked: ['march'] }, { selected: 'pushup' }).selected, 'run',
      '병합: 백업 장착이 어디에도 해금 안 됐으면 기본');
  }

  /* ── 보상형 전면광고 ── */
  const W = loadModule('src/utils/rewardedManager.js');
  eq(W.getRewardedStatus(), 'idle', '보상형: 시작 상태');
  W.preloadRewarded();
  eq(loads, 0, '보상형: 도감 밖(무장 전)에는 로드 안 함');
  eq((await W.showRewarded()).reason, 'not_ready', '보상형: 로드 전 표시 거부');
  eq(loads, 0, '보상형: 무장 전 show 도 로드를 유발하지 않음');

  W.setRewardedArmed(true);
  W.preloadRewarded();
  eq(loads, 1, '보상형: 무장 후 로드 1회');
  W.preloadRewarded();
  eq(loads, 1, '보상형: 로딩 중 중복 로드 없음');
  eq(W.getRewardedStatus(), 'loading', '보상형: loading');
  fire(RewardedAdEventType.LOADED);
  eq(W.getRewardedStatus(), 'ready', '보상형: ready');

  /* 끝까지 보지 않고 닫음 → 보상 없음 */
  {
    const p = W.showRewarded();
    await flush();
    eq(W.getRewardedStatus(), 'showing', '보상형: showing');
    fire(AdEventType.CLOSED);
    eq(await p, { earned: false }, '보상형: 중도 종료 → earned false');
    eq(loads, 2, '보상형: 도감에 있으면 닫힌 뒤 다음 광고를 받아 둔다');
  }
  /* 끝까지 봄 → 보상 */
  fire(RewardedAdEventType.LOADED);
  {
    const p = W.showRewarded();
    await flush();
    fire(RewardedAdEventType.EARNED_REWARD);
    fire(AdEventType.CLOSED);
    eq(await p, { earned: true }, '보상형: 보상 획득 → earned true');
  }
  /* 다음 표시에서 이전 보상이 새지 않는다 */
  fire(RewardedAdEventType.LOADED);
  {
    const p = W.showRewarded();
    await flush();
    fire(AdEventType.CLOSED);
    eq((await p).earned, false, '보상형: 이전 보상 플래그가 남지 않음');
  }
  /* 전면광고가 떠 있으면 거부 */
  fire(RewardedAdEventType.LOADED);
  interstitialShowing = true;
  eq((await W.showRewarded()).reason, 'busy', '보상형: 전면광고 표시 중 거부');
  interstitialShowing = false;
  /* show() 예외 */
  showThrows = true;
  eq(await W.showRewarded(), { earned: false, reason: 'error' }, '보상형: show 예외 → earned false');
  showThrows = false;
  /* 55분 만료 */
  W.preloadRewarded();
  fire(RewardedAdEventType.LOADED);
  const before = shows;
  advance(56 * MIN);
  eq((await W.showRewarded()).reason, 'not_ready', '보상형: 55분 지난 광고는 보여주지 않는다');
  eq(shows, before, '보상형: 만료 광고 show() 호출 없음');
  /* 로드 실패 → 재시도 소진 → failed → 사용자 재시도 */
  fire(AdEventType.ERROR, new Error('no fill'));
  fire(AdEventType.ERROR, new Error('no fill'));
  fire(AdEventType.ERROR, new Error('no fill'));
  eq(W.getRewardedStatus(), 'failed', '보상형: 재시도 소진 → failed');
  const l0 = loads;
  W.retryRewarded();
  eq(loads, l0 + 1, '보상형: 사용자 재시도 → 로드');
  /* 도감을 떠나면 닫힌 뒤 재로드 안 함 */
  fire(RewardedAdEventType.LOADED);
  W.setRewardedArmed(false);
  {
    const p = W.showRewarded();
    await flush();
    const l1 = loads;
    fire(AdEventType.CLOSED);
    await p;
    eq(loads, l1, '보상형: 도감 밖이면 닫힌 뒤 재로드 없음');
  }

  console.log('\n──────────── 막대병 도감 테스트 ────────────');
  if (fail === 0) { console.log(`✓ 전체 통과: ${pass}건`); process.exit(0); }
  console.log(`통과 ${pass} / 실패 ${fail}\n`);
  fails.forEach((f) => console.log(f + '\n'));
  process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
