/* eslint-disable no-console */
/**
 * storage.js 검증 — AsyncStorage 를 메모리 목으로 갈아끼우고 실제 소스를 돌린다.
 *
 *   node scripts/test-storage.js
 *
 * test-calc.js 의 vm 하네스는 import 를 지우고 한 스코프로 합치는 방식이라
 * AsyncStorage 에 의존하는 storage.js 를 다룰 수 없다. 여기서는 babel 로
 * 변환한 뒤 require 를 가로채 목을 주입한다.
 *
 * 이 파일이 지키는 것: 손상 데이터에도 프로필이 날아가지 않을 것,
 * 파생값(전역일)이 읽을 때마다 보정될 것, 기본값이 군종을 따를 것.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
const babel = require(path.join(ROOT, 'node_modules', '@babel', 'core'));

global.__DEV__ = false;   // 릴리즈 빌드처럼 (경고 출력 억제)

/* ─── AsyncStorage 메모리 목 ─────────────────────────────────────────── */
let store = {};
let failReads = false;

const AsyncStorageMock = {
  getItem: async (k) => {
    if (failReads) throw new Error('storage unavailable');
    return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
  },
  setItem: async (k, v) => { store[k] = String(v); },
  removeItem: async (k) => { delete store[k]; },
  multiRemove: async (ks) => { ks.forEach((k) => delete store[k]); },
};

const cache = new Map();
function loadModule(relPath) {
  if (cache.has(relPath)) return cache.get(relPath);
  const abs = path.join(ROOT, relPath);
  const code = fs.readFileSync(abs, 'utf8');
  const out = babel.transformSync(code, {
    filename: abs,
    presets: [[path.join(ROOT, 'node_modules', 'babel-preset-expo'), { jsxRuntime: 'classic' }]],
    babelrc: false,
    configFile: false,
  }).code;

  const m = new Module(relPath, null);
  m.filename = abs;
  m.paths = Module._nodeModulePaths(path.dirname(abs));
  const realRequire = m.require.bind(m);
  m.require = (id) => {
    if (id.includes('async-storage')) return { __esModule: true, default: AsyncStorageMock };
    if (id.startsWith('.')) {
      const next = path.posix.join(path.posix.dirname(relPath.split(path.sep).join('/')), id) + '.js';
      return loadModule(next);
    }
    return realRequire(id);
  };
  m._compile(out, abs);
  cache.set(relPath, m.exports);
  return m.exports;
}

const S = loadModule('src/utils/storage.js');

/* ─── 어서션 ─────────────────────────────────────────────────────────── */
let pass = 0, fail = 0;
const fails = [];
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) pass++;
  else { fail++; fails.push(`✗ ${label}\n    기대: ${e}\n    실제: ${a}`); }
}
function ok(cond, label) { eq(!!cond, true, label); }
function reset() { store = {}; failReads = false; }

(async () => {
  /* ── 전역일 자동 보정 (파생값 재계산) ── */
  reset();
  await S.saveMilitaryInfo({
    enlistDate: '2024-08-31', branch: 'army', months: 18,
    dischargeDate: '2026-03-02',   // 구버전이 저장한 틀린 값
  });
  let mi = await S.loadMilitaryInfo();
  eq(mi.dischargeDate, '2026-02-28', '전역일: 저장된 구버전 값을 읽을 때 보정');
  eq(mi.enlistDate, '2024-08-31', '전역일: 보정해도 입대일 보존');
  eq(mi.branch, 'army', '전역일: 보정해도 군종 보존');

  await S.saveMilitaryInfo(mi);
  await S.loadMilitaryInfo();
  mi = await S.loadMilitaryInfo();
  eq(mi.dischargeDate, '2026-02-28', '전역일: 반복해도 값이 흐르지 않음(멱등)');

  await S.saveMilitaryInfo({ enlistDate: 'bad', months: 18, dischargeDate: '2026-03-02' });
  eq((await S.loadMilitaryInfo()).dischargeDate, '2026-03-02', '전역일: 입대일이 깨졌으면 저장값 유지');
  await S.saveMilitaryInfo({ enlistDate: '2024-08-31', months: 0, dischargeDate: 'X' });
  eq((await S.loadMilitaryInfo()).dischargeDate, 'X', '전역일: months 가 0이면 저장값 유지');

  /* ── 손상 데이터: 프로필이 날아가면 안 된다 ── */
  reset();
  await S.saveMilitaryInfo({ enlistDate: '2025-01-02', branch: 'navy', months: 20 });
  await S.saveTodos([{ id: 't1', title: '유격', date: '2025-06-01', done: false }]);
  const intact = store['@profiles_v1'];
  store['@profiles_v1'] = intact.slice(0, Math.floor(intact.length / 2));  // 쓰기 중 중단된 JSON

  const after = await S.loadMilitaryInfo();
  eq(after, null, '손상: 읽기는 실패하되 크래시하지 않음');
  ok(store['@profiles_v1.bak'] !== undefined, '손상: 원본을 백업 키에 보존');
  eq(store['@profiles_v1.bak'], intact.slice(0, Math.floor(intact.length / 2)), '손상: 백업 내용이 손상된 원본 그대로');

  /* ── 저장소 자체를 못 읽을 때 ── */
  reset();
  await S.saveMilitaryInfo({ enlistDate: '2025-01-02', branch: 'army', months: 18 });
  const saved = store['@profiles_v1'];
  failReads = true;
  eq(await S.loadMilitaryInfo(), null, '읽기 실패: null 반환, 예외 전파 없음');
  eq(await S.loadTodos(), [], '읽기 실패: 배열 필드는 빈 배열');
  eq(store['@profiles_v1'], saved, '읽기 실패: 기존 데이터를 덮어쓰지 않음');
  failReads = false;
  eq((await S.loadMilitaryInfo()).enlistDate, '2025-01-02', '읽기 복구 후 원래 데이터 그대로');

  /* ── 형태가 다른 값 ── */
  reset();
  store['@profiles_v1'] = JSON.stringify({ activeId: 'x', profiles: [] });   // profiles 비어 있음
  eq(await S.loadMilitaryInfo(), null, '빈 profiles: 마이그레이션으로 복구');
  reset();
  store['@profiles_v1'] = JSON.stringify({ activeId: 'x', profiles: 'not-an-array' });
  eq(await S.loadTodos(), [], '잘못된 profiles 타입: 빈 배열로 폴백');

  /* ── 군종별 연가 기본값 ── */
  for (const [branch, days] of [['army', 24], ['navy', 27], ['airforce', 28], ['marines', 24]]) {
    reset();
    await S.saveMilitaryInfo({ enlistDate: '2025-01-02', branch, months: 18 });
    eq(await S.loadLeaveTotal(), days, `연가: ${branch} 기본 ${days}일`);
  }
  reset();
  eq(await S.loadLeaveTotal(), 24, '연가: 군 정보 없으면 육군 기준');
  await S.saveMilitaryInfo({ enlistDate: '2025-01-02', branch: 'airforce', months: 21 });
  await S.saveLeaveTotal(31);
  eq(await S.loadLeaveTotal(), 31, '연가: 사용자 설정값이 군종 기본값보다 우선');

  /* ── 진급일 ── */
  reset();
  await S.saveMilitaryInfo({ enlistDate: '2024-01-31', branch: 'army', months: 18 });
  eq(await S.loadRankPromotions('2024-01-31'),
    { 일병: '2024-03-31', 상병: '2024-09-30', 병장: '2025-03-31' },
    '진급일: 기본값은 읽을 때마다 계산 (월말 클램프 적용)');
  await S.saveRankPromotions({ 일병: '2024-04-01', 상병: '2024-10-01', 병장: '2025-04-01' });
  eq((await S.loadRankPromotions('2024-01-31')).일병, '2024-04-01', '진급일: 사용자 커스텀은 보존');
  await S.resetRankPromotions();
  eq((await S.loadRankPromotions('2024-01-31')).일병, '2024-03-31', '진급일: 초기화하면 기본값으로');
  eq(S.calcDefaultPromotions('bad'), null, '진급일: 잘못된 입대일 → null');

  /* ── 급여 ── */
  reset();
  await S.saveSalaryInfo({ monthlyAmount: 1500000, totalMonths: 18 });
  eq((await S.loadSalaryInfo()).monthlyAmount, 1500000, '급여: 저장/로드');

  /* ── 레코드 id 충돌 ── */
  reset();
  let todos = [];
  for (let i = 0; i < 40; i++) todos = await S.addTodo({ title: `t${i}`, date: '2025-06-01' });
  eq(todos.length, 40, '할일: 40건 저장');
  eq(new Set(todos.map((t) => t.id)).size, 40, '할일: 같은 밀리초에도 id 고유');

  console.log('\n──────────── 저장소 테스트 ────────────');
  if (fail === 0) {
    console.log(`✓ 전체 통과: ${pass}건`);
    process.exit(0);
  }
  console.log(`통과 ${pass} / 실패 ${fail}\n`);
  fails.forEach((f) => console.log(f + '\n'));
  process.exit(1);
})().catch((e) => {
  console.error('\n테스트 실행 중 예외:', e);
  process.exit(1);
});
