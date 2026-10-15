/* eslint-disable no-console */
/**
 * notifications.js 검증 — expo-notifications 와 AsyncStorage 를 목으로 갈아끼우고
 * 실제 소스의 예약 로직을 돌린다.
 *
 *   node scripts/test-notifications.js
 *
 * 이 파일이 지키는 것:
 *  - scheduleAt 의 boolean 반환 계약 (호출부가 중복 제거 판단에 쓴다)
 *  - 전역 전날에 알림이 정확히 1건 (09시 D-1 또는 21시 전야) 가는 것
 *  - 진급·입대100일의 전야+당일 한 쌍이 살아 있는 것
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

/* ─── 목 ────────────────────────────────────────────────────────────── */
let scheduled = [];
let cancels = 0;
const NotifMock = {
  getAllScheduledNotificationsAsync: async () => scheduled.slice(),
  cancelAllScheduledNotificationsAsync: async () => { scheduled = []; cancels += 1; },
  scheduleNotificationAsync: async (o) => { scheduled.push({ title: o.content.title, trigger: o.trigger }); },
  setNotificationHandler: () => {},
  setNotificationChannelAsync: async () => {},
  getPermissionsAsync: async () => ({ status: 'granted' }),
  requestPermissionsAsync: async () => ({ status: 'granted' }),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
};
let store = {};
const AsyncStorageMock = {
  getItem: async (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: async (k, v) => { store[k] = String(v); },
  removeItem: async (k) => { delete store[k]; },
  multiRemove: async (ks) => { ks.forEach((k) => delete store[k]); },
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
    if (id === 'expo-notifications') return NotifMock;
    if (id === 'react-native') return { Platform: { OS: 'android' } };
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

const S = loadModule('src/utils/storage.js');
const N = loadModule('src/utils/notifications.js');

/* ─── 어서션 ────────────────────────────────────────────────────────── */
let pass = 0, fail = 0;
const fails = [];
function eq(a, e, label) {
  if (JSON.stringify(a) === JSON.stringify(e)) pass++;
  else { fail++; fails.push(`✗ ${label}\n    기대: ${JSON.stringify(e)}\n    실제: ${JSON.stringify(a)}`); }
}
function ok(c, label) { eq(!!c, true, label); }

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const onDate = (s) => scheduled.filter((x) => x.trigger.date && ymd(x.trigger.date) === s);

async function setup(prefs) {
  store = {};
  scheduled = [];
  await S.saveMilitaryInfo({ enlistDate: '2025-04-01', branch: 'army', months: 18, personnelType: 'soldier' });
  await N.saveNotifPrefs({ master: true, discharge: true, milestone: true, streak: false, daily: false, ...prefs });
  await N.refreshScheduledNotifications({ force: true });
  return (await S.loadMilitaryInfo()).dischargeDate;
}

(async () => {
  /* 평소: 전역 전날엔 09시 D-1 하나만 (21시 전야는 중복이라 억제) */
  NOW = new RealDate(2026, 8, 20, 10, 0, 0);
  const disc = await setup();
  eq(disc, '2026-09-30', '전역일 계산');
  const eve = '2026-09-29';
  eq(onDate(eve).length, 1, '전역 전날: 알림 정확히 1건 (중복 제거)');
  eq(onDate(eve)[0].trigger.date.getHours(), 9, '전역 전날: 09시 D-1');

  /* 전역 전날 09시가 지난 뒤 앱을 연 경우 — D-1 은 과거라 건너뛰므로
     21시 전야가 살아 있어야 한다. 예전엔 둘 다 없어서 알림이 0건이었다. */
  NOW = new RealDate(2026, 8, 29, 15, 0, 0);
  await setup();
  eq(onDate(eve).length, 1, '전역 전날 오후 진입: 알림 1건 (사라지지 않음)');
  eq(onDate(eve)[0].trigger.date.getHours(), 21, '전역 전날 오후 진입: 21시 전야로 대체');

  /* 진급·입대100일은 전야(하루 전 21시)와 당일(09시)이 서로 다른 날이라
     둘 다 가야 한다 — 한때 이걸 중복으로 오인해 전야를 통째로 막았다. */
  NOW = new RealDate(2025, 4, 1, 10, 0, 0);   // 2025-05-01
  await setup();
  const promo = await S.loadRankPromotions('2025-04-01');
  // 일병 진급일(2025-06-01)은 180일 창 안이라 전야·당일이 모두 잡혀야 한다.
  // (상병 이후는 dday > 180 이라 의도적으로 제외된다 — 60건 캡 보호)
  const pd = promo.일병.split('-').map(Number);
  const evePromo = ymd(new RealDate(pd[0], pd[1] - 1, pd[2] - 1));
  eq(onDate(promo.일병).length, 1, '일병 진급: 당일 09시 알림');
  eq(onDate(promo.일병)[0].trigger.date.getHours(), 9, '일병 진급: 당일은 09시');
  eq(onDate(evePromo).length, 1, '일병 진급: 전야 알림도 있음 (다른 날이라 중복 아님)');
  eq(onDate(evePromo)[0].trigger.date.getHours(), 21, '일병 진급: 전야는 21시');

  /* prefs.discharge 를 끄면 전역 관련 당일 알림은 없지만 전야는 남아야 한다 */
  NOW = new RealDate(2026, 8, 20, 10, 0, 0);
  await setup({ discharge: false });
  eq(onDate(eve).length, 1, 'discharge 끔: 전야 알림은 유지');
  eq(onDate(eve)[0].trigger.date.getHours(), 21, 'discharge 끔: 21시 전야');

  /* v1.3: 입대정보가 없는 프로필로 바꾸면 이전 프로필의 예약을 지운다 */
  NOW = new RealDate(2026, 8, 20, 10, 0, 0);
  await setup();
  ok(scheduled.length > 0, '빈 프로필 전환: 전환 전엔 예약이 있다');
  await S.addProfile('새 프로필');   // 추가 후 자동 전환 — 입대정보 없음
  await N.refreshScheduledNotifications();
  eq(scheduled.length, 0, '빈 프로필 전환: 이전 프로필 알림 전부 취소');
  await setup();
  await S.clearAllData();
  await N.refreshScheduledNotifications();
  eq(scheduled.length, 0, '전체 삭제: 예약도 비워진다');

  /* v1.3: 스트릭 알림을 꺼 둬도 하루가 지나면 다시 계산한다 —
     예전엔 서명이 같아 180일 밖 마일스톤 전야가 끝내 예약되지 않았다 */
  NOW = new RealDate(2025, 4, 1, 10, 0, 0);
  await setup({ streak: false });
  const c0 = cancels;
  await N.refreshScheduledNotifications();
  eq(cancels, c0, '서명 게이트: 같은 날 다시 열면 재예약 안 함');
  NOW = new RealDate(2025, 4, 2, 10, 0, 0);
  await N.refreshScheduledNotifications();
  eq(cancels, c0 + 1, '서명 게이트: 다음 날엔 스트릭 꺼져 있어도 재예약');

  /* v1.3: 휴가 전날 저녁 */
  NOW = new RealDate(2026, 8, 20, 10, 0, 0);
  await setup();
  await S.addLeaveRecord({ date: '2026-09-25', days: 3, memo: '' });
  await N.refreshScheduledNotifications();
  {
    const l = onDate('2026-09-24').filter((x) => x.title.includes('휴가'));
    eq(l.length, 1, '휴가 전날: 알림 1건');
    eq(l[0] && l[0].trigger.date.getHours(), 21, '휴가 전날: 21시');
  }
  await N.saveNotifPrefs({ leave: false });
  await N.refreshScheduledNotifications({ force: true });
  eq(onDate('2026-09-24').filter((x) => x.title.includes('휴가')).length, 0, '휴가 알림 끔: 예약 안 함');

  /* v1.3: 전역한 뒤에는 매일 '전역까지 한 걸음' 넛지를 보내지 않는다 */
  NOW = new RealDate(2026, 9, 5, 10, 0, 0);   // 전역일(2026-09-30) 이후
  await setup({ daily: true });
  eq(scheduled.filter((x) => !x.trigger.date).length, 0, '전역 후: 매일 넛지 없음');
  NOW = new RealDate(2026, 8, 20, 10, 0, 0);
  await setup({ daily: true });
  ok(scheduled.some((x) => !x.trigger.date), '전역 전: 매일 넛지 있음 (대조군)');

  console.log('\n──────────── 알림 예약 테스트 ────────────');
  if (fail === 0) { console.log(`✓ 전체 통과: ${pass}건`); process.exit(0); }
  console.log(`통과 ${pass} / 실패 ${fail}\n`);
  fails.forEach((f) => console.log(f + '\n'));
  process.exit(1);
})().catch((e) => { console.error('\n테스트 실행 중 예외:', e); process.exit(1); });
