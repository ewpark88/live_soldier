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
let failWrites = false;   // 저장공간 부족 같은 '쓰기만 실패'

const AsyncStorageMock = {
  getItem: async (k) => {
    if (failReads) throw new Error('storage unavailable');
    return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
  },
  setItem: async (k, v) => {
    if (failWrites) throw new Error('disk full');
    store[k] = String(v);
  },
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
function reset() { store = {}; failReads = false; failWrites = false; }

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
  // 마지막 정상 스냅샷에서 되살아나야 한다 — 손상됐다고 프로필을 버리면 안 된다.
  ok(after !== null, '손상: 백업 스냅샷에서 복구');
  eq(after.branch, 'navy', '손상: 복구된 데이터가 원래 값');
  eq((await S.loadTodos()).length, 1, '손상: 할일도 함께 복구');
  ok(store['@profiles_v1'] !== undefined, '손상: 저장소가 정상 상태로 복원됨');
  eq(JSON.parse(store['@profiles_v1']).profiles.length, 1, '손상: 복원된 저장소가 파싱 가능');

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

  /* ── 대체복무 (v1.6) ── */
  reset();
  // 군별이 남아 있어도(현역 → 사회복무요원으로 바꾼 프로필) 군종 기본값을 쓰지 않는다
  await S.saveMilitaryInfo({ enlistDate: '2025-01-02', branch: 'airforce', months: 21, personnelType: 'social' });
  eq(await S.loadLeaveTotal(), 28, '연가: 사회복무요원 28일');
  reset();
  await S.saveMilitaryInfo({ enlistDate: '2025-01-02', branch: null, months: 36, personnelType: 'research' });
  eq(await S.loadLeaveTotal(), 0, '연가: 전문연구요원은 미설정(0) — 근무처 규정');
  await S.saveLeaveTotal(15);
  eq(await S.loadLeaveTotal(), 15, '연가: 대체복무도 직접 입력값 우선');
  reset();
  // 간부: 예전엔 공군 간부에게 병사용 28일이 '기본값'처럼 떴다 — 연가는 매년 부여라 미설정
  await S.saveMilitaryInfo({ enlistDate: '2023-03-01', branch: 'airforce', months: 48, personnelType: 'nco', officerRank: '중사' });
  eq(await S.loadLeaveTotal(), 0, '연가: 간부는 군종 기본값을 쓰지 않음 (미설정 0)');
  await S.saveLeaveTotal(84);
  eq(await S.loadLeaveTotal(), 84, '연가: 간부 직접 입력값 (100일 초과 허용 범위)');
  reset();
  await S.savePersonnelType('social');
  await S.saveMilitaryInfo({ enlistDate: '2025-01-02', branch: null, months: 21, personnelType: 'social' });
  eq(await S.loadRankPromotions('2025-01-02'), null, '진급일: 대체복무는 기본 진급일을 만들지 않음');
  reset();
  await S.savePersonnelType('officer');
  eq(await S.loadRankPromotions('2025-01-02'), null, '진급일: 간부도 null');
  reset();
  ok(await S.loadRankPromotions('2025-01-02'), '진급일: 신분 미설정은 병사로 보고 기본값');
  await S.savePersonnelType('hacker');
  eq(await S.loadPersonnelType(), null, '신분: 모르는 키는 저장하지 않음');
  reset();
  await S.savePersonnelType('professional');
  await S.saveMilitaryInfo({ enlistDate: '2025-06-02', branch: null, months: 36, personnelType: 'professional', subType: 'doctor' });
  eq(await S.findProfileByShare({ enlistDate: '2025-06-02', branch: null, personnelType: 'professional' }),
    (await S.listProfiles()).activeId, '공유: 대체복무(군별 null) 동일인 매칭');
  {
    const sid2 = await S.addSharedProfile({ name: '요원', militaryInfo: { enlistDate: '2025-07-01', branch: null, personnelType: 'industrial', officerRank: null, subType: 'reserve', months: 23 }, promotions: null });
    const mi3 = await S.loadMilitaryInfo();
    eq([mi3.personnelType, mi3.subType, mi3.branch, mi3.dischargeDate], ['industrial', 'reserve', null, '2027-05-31'], '공유: 대체복무 프로필 추가 (세부유형 보존·복무만료일 계산)');
    ok(sid2, '공유: 대체복무 프로필 id');
  }

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
  /* 읽기 실패 폴백은 영속화되면 안 된다 —
     안드로이드의 전형적 실패는 '읽기만 실패'(CursorWindow 초과)다.
     이때 만든 임시 빈 프로필이 저장되면 원본과 백업이 둘 다 날아간다. */
  reset();
  await S.saveMilitaryInfo({ enlistDate: '2025-01-02', branch: 'navy', months: 20 });
  const goodLive = store['@profiles_v1'];
  const goodBak = store['@profiles_v1.bak'];
  failReads = true;
  // 저장은 '조용히 무시'가 아니라 '실패를 알림'이어야 한다 —
  // 화면이 성공으로 넘어가면 사용자는 입력이 남은 줄 알고 앱을 닫는다.
  let threw = false;
  try {
    await S.saveMilitaryInfo({ enlistDate: '2026-06-06', branch: 'army', months: 18 });
  } catch (e) {
    threw = true;
  }
  ok(threw, '읽기 실패: 저장 시도는 예외로 실패를 알린다');
  failReads = false;
  eq(store['@profiles_v1'], goodLive, '읽기 실패: 임시 상태가 원본을 덮어쓰지 않음');
  eq(store['@profiles_v1.bak'], goodBak, '읽기 실패: 임시 상태가 백업을 덮어쓰지 않음');
  eq((await S.loadMilitaryInfo()).branch, 'navy', '읽기 복구 후 원래 데이터 유지');

  /* 전체 삭제는 백업도 지워야 한다 — 남겨두면 손상 복구가 지운 데이터를 되살린다 */
  reset();
  await S.saveMilitaryInfo({ enlistDate: '2025-01-02', branch: 'army', months: 18 });
  await S.saveTodos([{ id: 'x', title: '비밀', date: '2025-06-01', done: false }]);
  ok(store['@profiles_v1.bak'] !== undefined, '삭제 전: 백업 존재');
  await S.clearAllData();
  // 삭제 후 _saveStore(fresh) 가 백업을 다시 만든다 — 그건 정상이다.
  // 중요한 건 '지운 데이터'가 백업에 남아 있지 않다는 것.
  ok(!(store['@profiles_v1.bak'] || '').includes('비밀'), '전체 삭제: 백업에 지운 데이터가 남지 않음');
  eq(JSON.parse(store['@profiles_v1.bak']).profiles[0].data.todos, [], '전체 삭제: 백업도 빈 상태');
  eq(await S.loadMilitaryInfo(), null, '전체 삭제: 입대정보 없음');
  eq(await S.loadTodos(), [], '전체 삭제: 할일 없음');
  const afterClear = store['@profiles_v1'];
  store['@profiles_v1'] = afterClear.slice(0, 10);
  eq(await S.loadTodos(), [], '전체 삭제 후 손상: 지운 데이터가 부활하지 않음');

  /* 쓰기 실패는 던져야 한다 — 예전엔 _saveStore 가 삼켜서 guardSave 가 성공으로
     처리했고(시트 닫힘·광고), 다음 진입에서 기록이 사라져 있었다. */
  reset();
  await S.addLeaveRecord({ date: '2025-03-01', days: 2, memo: '' });
  const beforeFail = store['@profiles_v1'];
  failWrites = true;
  for (const [label, fn] of [
    ['휴가 추가', () => S.addLeaveRecord({ date: '2025-04-01', days: 1, memo: '' })],
    ['휴가 삭제', () => S.deleteLeaveRecord('nope')],
    ['포상 추가', () => S.addLeaveBonusRecord({ date: '2025-04-01', days: 3, memo: '' })],
    ['연가 일수', () => S.saveLeaveTotal(30)],
    ['급여 저장', () => S.saveSalaryInfo({ monthlyAmount: 1, totalMonths: 18 })],
    ['프로필 추가', () => S.addProfile('x')],
  ]) {
    let t = false;
    try { await fn(); } catch (e) { t = true; }
    ok(t, `쓰기 실패: ${label} 은 예외로 실패를 알린다`);
  }
  failWrites = false;
  eq(store['@profiles_v1'], beforeFail, '쓰기 실패: 저장소는 이전 상태 그대로');
  eq((await S.loadLeaveRecords()).length, 1, '쓰기 실패 후: 기록 수 그대로');
  // 실패 뒤에도 큐가 막히지 않는다
  eq((await S.addLeaveRecord({ date: '2025-05-01', days: 1, memo: '' })).length, 2, '쓰기 실패 후: 다음 저장은 정상');

  /* 읽기 경로의 되쓰기(마이그레이션)는 쓰기 실패여도 읽기를 깨지 않는다 */
  reset();
  failWrites = true;
  eq(await S.loadTodos(), [], '쓰기 실패 중 첫 실행: 읽기는 정상');
  failWrites = false;

  /* 동시 쓰기 — 저장 버튼 연타, 홈의 markCelebrated 와 휴가 저장이 겹치는 경우.
     읽고-고쳐-쓰기가 겹치면 늦게 끝난 쪽이 먼저 쓴 쪽을 지웠다. */
  reset();
  await S.saveMilitaryInfo({ enlistDate: '2025-01-02', branch: 'army', months: 18 });
  await Promise.all([
    S.addLeaveRecord({ date: '2025-06-01', days: 1, memo: 'a' }),
    S.addLeaveRecord({ date: '2025-06-10', days: 1, memo: 'b' }),
    S.addLeaveBonusRecord({ date: '2025-06-05', days: 2, memo: '' }),
    S.markCelebrated(['k1']),
    S.addTodo({ title: 't', date: '2025-06-01' }),
  ]);
  eq((await S.loadLeaveRecords()).length, 2, '동시 쓰기: 휴가 2건 모두 남음');
  eq((await S.loadLeaveBonusRecords()).length, 1, '동시 쓰기: 포상 남음');
  eq(await S.loadCelebrated(), ['k1'], '동시 쓰기: 축하 기록 남음');
  eq((await S.loadTodos()).length, 1, '동시 쓰기: 할일 남음');
  eq((await S.loadMilitaryInfo()).branch, 'army', '동시 쓰기: 입대정보 보존');


  /* ── v1.3: 테마 설정 동시 쓰기 — 늦게 끝난 쓰기가 앞의 변경을 지우면 안 된다 ── */
  reset();
  store['@theme_v2'] = JSON.stringify({ themeId: 'forest', mode: 'light', unlocked: [], introSeen: false });
  await Promise.all([
    S.saveThemeSettings({ introSeen: true }),
    S.unlockTheme('sunset'),
    S.unlockTheme('aurora'),
    S.saveThemeSettings({ themeId: 'sakura' }),
  ]);
  {
    const t = JSON.parse(store['@theme_v2']);
    eq(t.introSeen, true, '테마 동시 쓰기: introSeen 보존');
    eq([...t.unlocked].sort(), ['aurora', 'sunset'], '테마 동시 쓰기: 해금 둘 다 남음');
    eq(t.themeId, 'sakura', '테마 동시 쓰기: 마지막 테마 반영');
  }
  eq((await S.unlockTheme('sunset')).unlocked.length, 2, '테마: 이미 해금된 건 중복 추가 안 함');

  /* ── v1.3: 공유 코드로 받은 프로필 ── */
  reset();
  await S.saveMilitaryInfo({ enlistDate: '2025-03-10', branch: 'army', months: 18, personnelType: 'soldier' });
  const shared = {
    name: '민준',
    militaryInfo: { enlistDate: '2025-05-12', branch: 'navy', personnelType: 'soldier', officerRank: null, months: 20 },
    promotions: null,
  };
  eq(await S.findProfileByShare(shared.militaryInfo), null, '공유: 처음엔 같은 사람 없음');
  const sid = await S.addSharedProfile(shared);
  ok(sid, '공유: 프로필 추가됨');
  {
    const { activeId, profiles } = await S.listProfiles();
    eq(activeId, sid, '공유: 추가 후 자동 전환');
    eq(profiles.length, 2, '공유: 기존 프로필 유지');
    eq(profiles.find((p) => p.id === sid).name, '민준', '공유: 이름');
  }
  {
    const mi2 = await S.loadMilitaryInfo();
    eq([mi2.branch, mi2.dischargeDate], ['navy', '2027-01-11'], '공유: 전역일은 받는 쪽이 계산');
    eq(await S.loadPersonnelType(), 'soldier', '공유: 신분 저장 (온보딩 건너뜀)');
    eq(await S.loadCelebrated(), null, '공유: 축하 이력은 시딩 전 상태');
  }
  eq(await S.findProfileByShare(shared.militaryInfo), sid, '공유: 같은 코드 → 같은 프로필 찾음');
  await S.addLeaveRecord({ date: '2025-09-01', days: 3, memo: '' });
  const upd = await S.updateProfileFromShare(sid, {
    ...shared,
    name: '민준이',
    promotions: { 일병: '2025-07-12', 상병: '2026-01-12', 병장: '2026-07-12' },
  });
  eq(upd, sid, '공유 갱신: 같은 id');
  eq((await S.loadLeaveRecords()).length, 1, '공유 갱신: 받는 쪽이 적은 휴가는 보존');
  eq((await S.loadRankPromotions('2025-05-12')).일병, '2025-07-12', '공유 갱신: 진급일 반영');
  eq((await S.listProfiles()).profiles.find((p) => p.id === sid).name, '민준이', '공유 갱신: 이름 반영');
  {
    const src = await S.loadShareSource();
    eq([src.name, src.militaryInfo.branch, !!src.promotions], ['민준이', 'navy', true], '공유: 내보낼 재료');
  }

  /* ── v1.6: 간부 연 단위 연가 (leaveAnnual) — leaveTotal 은 건드리지 않는다 ── */
  reset();
  await S.savePersonnelType('officer');
  await S.saveMilitaryInfo({ enlistDate: '2024-03-01', branch: 'army', months: 36, personnelType: 'officer', officerRank: '중위' });
  eq(await S.loadLeaveAnnual(), null, '연가(간부): 기본은 미설정');
  await S.saveLeaveAnnual(21);
  eq(await S.loadLeaveAnnual(), 21, '연가(간부): 저장·로드');
  eq(await S.loadLeaveTotal(), 0, '연가(간부): leaveTotal 은 그대로 (구버전이 읽는 값)');
  await S.saveLeaveAnnual(0);
  eq(await S.loadLeaveAnnual(), null, '연가(간부): 0 은 미설정으로');
  await S.saveLeaveAnnual(25);
  {
    const bk = JSON.stringify(await S.exportAll());
    reset();
    await S.importAll(bk);
    eq(await S.loadLeaveAnnual(), 25, '연가(간부): 백업 왕복');
    await S.clearAllData();
    eq(await S.loadLeaveAnnual(), null, '연가(간부): 모든 데이터 삭제 시 초기화');
  }
  /* 구버전 백업(leaveAnnual 없음)·깨진 값도 안전 */
  reset();
  await S.saveMilitaryInfo({ enlistDate: '2024-03-01', branch: 'army', months: 36, personnelType: 'nco' });
  {
    const st = JSON.parse(store['@profiles_v1']);
    st.profiles[0].data.leaveAnnual = 'abc';
    store['@profiles_v1'] = JSON.stringify(st);
  }
  eq(await S.loadLeaveAnnual(), null, '연가(간부): 깨진 저장값은 미설정으로');

  /* ── v1.3: 백업 → 복원 ── */
  reset();
  await S.saveMilitaryInfo({ enlistDate: '2025-01-02', branch: 'airforce', months: 21 });
  await S.addTodo({ title: '유격', date: '2025-06-01' });
  await S.updateProfile((await S.listProfiles()).activeId, { photo: 'file:///cache/x.jpg' });
  store['@theme_v2'] = JSON.stringify({ themeId: 'sunset', mode: 'dark', unlocked: ['sunset'], introSeen: true });
  store['@streak_v1'] = JSON.stringify({ current: 9, best: 12, total: 40 });
  await S.saveSkins({ selected: 'march', unlocked: ['run', 'march'] });
  const backup = await S.exportAll();
  eq(backup.data.skins.unlocked, ['run', 'march'], '백업: 막대병 보유 목록');
  eq([backup.app, backup.schema], ['jeonryeokkami', 1], '백업: 헤더');
  eq(backup.data.profiles.profiles[0].photo, null, '백업: 사진 경로는 빼고 내보낸다');
  const json = JSON.stringify(backup);

  reset();   // 새 기기
  await S.saveMilitaryInfo({ enlistDate: '2026-01-01', branch: 'army', months: 18 });
  await S.saveSkins({ selected: 'shoot', unlocked: ['run', 'shoot'] });   // 새 기기에서 이미 얻은 것
  const summary = await S.importAll(json);
  {
    const sk = await S.loadSkins();
    eq(sk.unlocked, ['run', 'march', 'shoot'], '복원: 막대병은 합친다 (이 기기 것 유지)');
    eq(sk.selected, 'march', '복원: 막대병 장착은 백업 쪽');
  }
  eq(summary.count, 1, '복원: 프로필 수 요약');
  eq((await S.loadMilitaryInfo()).branch, 'airforce', '복원: 입대정보');
  eq((await S.loadTodos())[0].title, '유격', '복원: 할 일');
  eq(JSON.parse(store['@theme_v2']).themeId, 'sunset', '복원: 테마');
  eq(JSON.parse(store['@streak_v1']).best, 12, '복원: 스트릭');
  ok(store['@profiles_v1.preimport'] && JSON.parse(store['@profiles_v1.preimport']).profiles.length === 1,
    '복원: 덮어쓰기 전 상태를 남긴다');

  {
    let reason = null;
    try { await S.importAll('{"app":"other"}'); } catch (e) { reason = e.reason; }
    eq(reason, 'app', '복원: 다른 앱 파일은 거부');
    eq((await S.loadMilitaryInfo()).branch, 'airforce', '복원 거부: 기존 데이터 무사');
  }
  {
    failWrites = true;
    let threw = false;
    try { await S.importAll(json); } catch (e) { threw = true; }
    failWrites = false;
    ok(threw, '복원: 쓰기 실패는 던진다 (guardSave 가 알 수 있게)');
  }
  {
    // 부가 항목(테마) 쓰기만 실패 — 프로필은 이미 교체됐으니 성공으로 끝나야 한다
    const orig = AsyncStorageMock.setItem;
    AsyncStorageMock.setItem = async (k, v) => {
      if (k === '@theme_v2') throw new Error('disk full');
      return orig(k, v);
    };
    let threw = false;
    try { await S.importAll(json); } catch (e) { threw = true; }
    AsyncStorageMock.setItem = orig;
    ok(!threw, '복원: 테마 쓰기 실패는 복원 전체를 실패로 만들지 않는다');
    eq((await S.loadMilitaryInfo()).branch, 'airforce', '복원 부분 실패: 프로필은 복원됨');
  }
  ok(store['@profiles_v1.preimport'], '삭제 전: 복원 직전 사본 존재');
  await S.clearAllData();
  ok(store['@profiles_v1.preimport'] === undefined, '전체 삭제: 복원 직전 사본도 지운다');

  /* 메인·백업 모두 손상 — 빈 프로필로 덮기 전에 원문을 남긴다 */
  reset();
  store['@profiles_v1'] = '{broken-main';
  store['@profiles_v1.bak'] = '{broken-bak';
  eq(await S.loadMilitaryInfo(), null, '이중 손상: 빈 프로필로 시작');
  eq(store['@profiles_v1.corrupt'], '{broken-main', '이중 손상: 원문 보관');

  /* 신분이 data.personnelType 에만 있는 프로필도 공유 재가져오기에서 찾아야 한다 */
  reset();
  await S.savePersonnelType('soldier');
  await S.saveMilitaryInfo({ enlistDate: '2025-05-12', branch: 'navy', months: 20 });
  eq(await S.findProfileByShare({ enlistDate: '2025-05-12', branch: 'navy', personnelType: 'soldier' }),
    (await S.listProfiles()).activeId, '공유: data.personnelType 에만 있는 신분도 매칭');

  /* 공유 코드 재료도 data.personnelType 을 우선한다 — 안 그러면 간부가 'soldier' 코드로 나간다 */
  reset();
  await S.savePersonnelType('officer');
  await S.saveMilitaryInfo({ enlistDate: '2024-03-01', branch: 'army', months: 36, officerRank: '중위' });
  eq((await S.loadShareSource()).militaryInfo.personnelType, 'officer', '공유 재료: data.personnelType 병합 (간부)');

  /* 간부 복무연장·진급 이력 (v1.6) — militaryInfo 안의 새 필드. 백업 왕복, 전역일은 총 개월로 계산 */
  reset();
  await S.savePersonnelType('nco');
  await S.saveMilitaryInfo({
    enlistDate: '2022-03-01', branch: 'army', personnelType: 'nco', officerRank: '중사', months: 60,
    extensions: [{ id: 'e1', months: 12, date: '2025-01-10', memo: null }],
    officerPromotions: [{ rank: '중사', date: '2024-03-01' }],
  });
  {
    const mi = await S.loadMilitaryInfo();
    eq(mi.dischargeDate, '2027-02-28', '복무연장: 전역일 = 임관일 + 총 개월(연장 포함)');
    eq([mi.extensions.length, mi.officerPromotions[0].rank], [1, '중사'], '복무연장·진급 이력: 저장·로드');
    const bk = JSON.stringify(await S.exportAll());
    reset();
    await S.importAll(bk);
    const mi2 = await S.loadMilitaryInfo();
    eq([mi2.months, mi2.extensions[0].id, mi2.officerPromotions[0].date], [60, 'e1', '2024-03-01'], '복무연장·진급 이력: 백업 왕복');
    eq((await S.loadShareSource()).militaryInfo.months, 60, '공유 재료: 총 개월 (구버전·받는 쪽이 같은 전역일)');
  }
  /* 축하 이력 되돌리기 — 연장으로 다시 미래가 된 마일스톤용 */
  reset();
  await S.markCelebrated(['d100out', 'discharge', 'half']);
  await S.unmarkCelebrated(['d100out', 'discharge']);
  eq(await S.loadCelebrated(), ['half'], '축하 이력: 지정한 key 만 뺀다');
  reset();
  await S.unmarkCelebrated(['discharge']);
  eq(await S.loadCelebrated(), null, '축하 이력: 미시딩(null)은 건드리지 않는다');

  /* ── v1.5: 막대병 저장 ── */
  reset();
  eq(await S.loadSkins(), { selected: 'run', unlocked: ['run'], dexSeen: false }, '막대병: 기본값');
  store['@soldier_skins_v1'] = '{broken';
  eq((await S.loadSkins()).selected, 'run', '막대병: 손상값 → 기본값');
  await S.saveSkins({ selected: 'dig', unlocked: ['dig', 'nope'] });
  eq(await S.loadSkins(), { selected: 'dig', unlocked: ['run', 'dig'], dexSeen: false }, '막대병: 모르는 id 정리 · 무료 포함');
  await S.clearAllData();
  eq((await S.loadSkins()).unlocked, ['run', 'dig'], '막대병: 모든 데이터 삭제에도 유지');
  {
    failWrites = true;
    let threw = false;
    try { await S.saveSkins({ selected: 'run', unlocked: ['run'] }); } catch (e) { threw = true; }
    failWrites = false;
    ok(threw, '막대병: 쓰기 실패는 던진다');
  }

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
