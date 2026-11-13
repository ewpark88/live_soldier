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
let channels = {};
const NotifMock = {
  getAllScheduledNotificationsAsync: async () => scheduled.slice(),
  cancelAllScheduledNotificationsAsync: async () => { scheduled = []; cancels += 1; },
  scheduleNotificationAsync: async (o) => { scheduled.push({ title: o.content.title, body: o.content.body, trigger: o.trigger, data: o.content.data }); },
  setNotificationHandler: () => {},
  setNotificationChannelAsync: async (id, o) => { channels[id] = o; },
  deleteNotificationChannelAsync: async (id) => { delete channels[id]; },
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

async function setup(prefs, mi = {}) {
  store = {};
  scheduled = [];
  await S.saveMilitaryInfo({ enlistDate: '2025-04-01', branch: 'army', months: 18, personnelType: 'soldier', ...mi });
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

  /* ─── v1.4: 이벤트별 알림 ──────────────────────────────────────────── */

  /* 설정 승격: v1.3 의 '전역·진급' 스위치 값이 새 진급일 스위치로 넘어간다 */
  eq(N.normalizeNotifPrefs({ master: true, discharge: false }).promotion, false, '승격: discharge 꺼져 있던 사람은 진급일도 꺼진 채로');
  eq(N.normalizeNotifPrefs({ master: true, discharge: true }).promotion, true, '승격: discharge 켜져 있던 사람은 진급일 켜짐');
  eq(N.normalizeNotifPrefs({ master: true }).todo, true, '승격: 일정 알림은 켜진 채로 시작 (예전엔 끌 수 없었다)');
  eq(N.normalizeNotifPrefs({ todoTiming: 'xx' }).todoTiming, 'morning', '승격: 이상한 일정 시각 값은 기본값으로');
  eq(N.normalizeNotifPrefs({ dailyHour: 99 }).dailyHour, 9, '승격: 범위 밖 시각은 기본값으로');
  eq(N.normalizeNotifPrefs({ promotion: true, discharge: false }).promotion, true, '승격: 이미 저장된 진급일 값은 존중');

  /* 진급일은 전역 D-day 와 따로 끄고 켠다 */
  NOW = new RealDate(2025, 4, 1, 10, 0, 0);
  await setup({ discharge: false, milestone: false, promotion: true });
  ok(scheduled.some((x) => x.title.includes('일병 진급')), '진급일만 켬: 진급 알림 있음');
  ok(!scheduled.some((x) => x.title.startsWith('전역')), '진급일만 켬: 전역 D-day 없음');
  await setup({ discharge: true, milestone: false, promotion: false });
  ok(!scheduled.some((x) => x.title.includes('진급')), '진급일 끔: 진급 알림 없음');
  ok(scheduled.some((x) => x.title.startsWith('전역 D-100')), '진급일 끔: 전역 D-day 는 그대로');

  /* 입대 100일 당일은 마일스톤 스위치 소관 */
  await setup({ discharge: true, milestone: false });
  ok(!scheduled.some((x) => x.title.startsWith('입대 100일')), '마일스톤 끔: 입대 100일 당일 없음');
  await setup({ discharge: false, milestone: true });
  ok(scheduled.some((x) => x.title.startsWith('입대 100일')), '마일스톤 켬: 입대 100일 당일 있음');

  /* 일정: 끌 수 있고, 시각을 고를 수 있고, 가까운 것부터 잡는다 */
  NOW = new RealDate(2026, 8, 20, 10, 0, 0);
  await setup({ discharge: false, milestone: false, payday: false });
  await S.addTodo({ title: '먼 일정', date: '2026-09-28' });
  await S.addTodo({ title: '가까운 일정', date: '2026-09-22' });
  await S.addTodo({ title: '지난 일정', date: '2026-09-01' });
  await N.refreshScheduledNotifications({ force: true });
  {
    const t = scheduled.filter((x) => x.data && x.data.event === 'todo');
    eq(t.length, 2, '일정(당일 아침): 지난 일정 빼고 2건');
    eq(t.map((x) => ymd(x.trigger.date)), ['2026-09-22', '2026-09-28'], '일정: 가까운 날짜부터 예약');
    eq(t[0] && t[0].trigger.date.getHours(), 9, '일정(당일 아침): 09시');
    eq(t[0] && t[0].data.route, 'calendar', '일정: 누르면 캘린더로');
  }
  {
    // 알림 탭 → 캘린더의 해당 세그먼트 (이미 예약된 알림도 event 로 찾는다)
    let listener = null;
    NotifMock.addNotificationResponseReceivedListener = (fn) => { listener = fn; return { remove() {} }; };
    const got = [];
    const off = N.subscribeNotificationTaps((route, params) => got.push([route, params && params.section]));
    const tap = (data) => listener({ notification: { request: { content: { data } } } });
    tap({ event: 'todo', route: 'calendar' });
    tap({ event: 'leave', route: 'calendar' });
    tap({ event: 'payday', route: 'salary' });
    off();
    delete NotifMock.addNotificationResponseReceivedListener;
    eq(got, [['calendar', 'todo'], ['calendar', 'leave'], ['salary', undefined]], '알림 탭: 캘린더 세그먼트 전달');
  }
  await N.saveNotifPrefs({ todoTiming: 'eve' });
  await N.refreshScheduledNotifications({ force: true });
  {
    const t = scheduled.filter((x) => x.data && x.data.event === 'todo');
    eq(t.map((x) => `${ymd(x.trigger.date)} ${x.trigger.date.getHours()}`), ['2026-09-21 21', '2026-09-27 21'], '일정(전날 저녁): 하루 전 21시');
  }
  await N.saveNotifPrefs({ todoTiming: 'both' });
  await N.refreshScheduledNotifications({ force: true });
  eq(scheduled.filter((x) => x.data && x.data.event === 'todo').length, 4, '일정(둘 다): 일정당 2건');
  await N.saveNotifPrefs({ todo: false });
  await N.refreshScheduledNotifications({ force: true });
  eq(scheduled.filter((x) => x.data && x.data.event === 'todo').length, 0, '일정 끔: 예약 안 함');

  /* 월급날: 다가오는 3회, 전역 뒤로는 안 잡는다, 주말이면 금요일 */
  NOW = new RealDate(2026, 0, 5, 10, 0, 0);   // 2026-01-05
  await setup({ discharge: false, milestone: false, payday: true });
  {
    const p = scheduled.filter((x) => x.data && x.data.event === 'payday').map((x) => ymd(x.trigger.date));
    // 2026-01-10 은 토요일 → 01-09(금). 02-10 화, 03-10 화
    eq(p, ['2026-01-09', '2026-02-10', '2026-03-10'], '월급날: 다가오는 3회 (주말이면 직전 금요일)');
  }
  NOW = new RealDate(2026, 1, 10, 10, 0, 0);   // 2026-02-10 월급날, 09시 지남
  await setup({ discharge: false, milestone: false, payday: true });
  {
    const p = scheduled.filter((x) => x.data && x.data.event === 'payday').map((x) => ymd(x.trigger.date));
    // 오늘 슬롯은 지나서 건너뛰고도 3회를 채운다. 05-10 은 일요일 → 05-08(금)
    eq(p, ['2026-03-10', '2026-04-10', '2026-05-08'], '월급날: 당일 9시 지나도 3회 채움');
  }
  NOW = new RealDate(2026, 8, 20, 10, 0, 0);  // 전역 2026-09-30 직전
  await setup({ discharge: false, milestone: false, payday: true });
  {
    const p = scheduled.filter((x) => x.data && x.data.event === 'payday').map((x) => ymd(x.trigger.date));
    eq(p, [], '월급날: 전역일 뒤 월급은 예약 안 함 (9/10 지남, 10/10 은 전역 후)');
  }
  await setup({ payday: false });
  eq(scheduled.filter((x) => x.data && x.data.event === 'payday').length, 0, '월급날 끔: 예약 안 함');

  /* 채널: 전역·생활은 HIGH(팝업), 옛 채널은 지운다 */
  channels = { 'discharge-reminders': {}, 'daily-nudge': {} };
  await setup();
  eq(channels['service-alerts'] && channels['service-alerts'].importance, 4, '채널: 전역·진급은 HIGH');
  eq(channels['life-alerts'] && channels['life-alerts'].importance, 4, '채널: 휴가·일정·월급은 HIGH');
  ok(!channels['discharge-reminders'] && !channels['daily-nudge'], '채널: 옛 채널 삭제');
  ok(scheduled.filter((x) => x.data && x.data.event === 'discharge').every((x) => x.trigger.channelId === 'service-alerts'), '채널: 전역 알림은 service-alerts 로');

  /* 예약 목록(설정 화면 '다음 알림')이 실제 예약과 같다 */
  {
    const plan = await N.loadNotifPlan();
    eq(plan.length, scheduled.length, '예약 목록: 실제 예약 건수와 같음');
    ok(plan.every((x, i) => i === 0 || (x.at ?? Infinity) >= (plan[i - 1].at ?? Infinity)), '예약 목록: 시각순');
  }
  await N.disableNotifications();
  eq((await N.loadNotifPlan()).length, 0, '알림 끔: 예약 목록도 비움');
  eq(scheduled.length, 0, '알림 끔: 예약 전부 취소');

  /* 대체복무 (v1.6) — 진급·10일 월급날이 없고, 문구에 '전역/입대'가 없어야 한다 */
  NOW = new RealDate(2025, 4, 1, 10, 0, 0);   // 2025-05-01
  for (const [type, end] of [['social', '소집해제'], ['research', '복무만료']]) {
    await setup({ promotion: true, payday: true, daily: true }, { personnelType: type, branch: null, months: 21 });
    eq(scheduled.filter((x) => /진급/.test(x.title)).length, 0, `${type}: 진급 알림 없음`);
    eq(scheduled.filter((x) => /월급/.test(x.title)).length, 0, `${type}: 월급날 알림 없음`);
    ok(scheduled.length > 0, `${type}: 다른 알림은 예약됨`);
    eq(scheduled.filter((x) => /전역|입대/.test(`${x.title} ${x.body}`)).length, 0, `${type}: 제목·본문에 전역/입대 없음`);
    ok(scheduled.some((x) => x.title.includes(end)), `${type}: '${end}' 문구 사용`);
  }
  {
    const ev = N.notifEventsFor('social').map((e) => e.key);
    ok(!ev.includes('promotion') && !ev.includes('payday'), '설정 목록(사회복무요원): 진급·월급날 숨김');
    ok(N.notifEventsFor('nco').some((e) => e.key === 'payday'), '설정 목록(간부): 월급날 O');
    eq(N.notifEventsFor('nco').find((e) => e.key === 'promotion')?.desc, '기록한 진급일 당일 오전 9시', '설정 목록(간부): 진급 = 기록한 진급일 (v1.6)');
    eq(N.notifEventsFor('soldier').length, N.NOTIF_EVENTS.length, '설정 목록(병사): 전부');
    eq(N.notifEventsFor('social').find((e) => e.key === 'discharge').title, '소집해제 D-day', '설정 목록(사회복무요원): 제목');
  }
  /* 간부 — 진급(병 계급) 없음, 월급날(10일) 있음, '입대' 대신 '임관' */
  for (const type of ['nco', 'officer']) {
    await setup({ promotion: true, payday: true }, { personnelType: type, officerRank: type === 'nco' ? '하사' : '소위', months: 36 });
    eq(scheduled.filter((x) => /진급/.test(x.title)).length, 0, `${type}: 진급 알림 없음 (병 진급일을 만들지 않음)`);
    ok(scheduled.some((x) => /월급/.test(x.title)), `${type}: 월급날 알림 있음`);
    ok(scheduled.some((x) => x.title.startsWith('임관 100일')), `${type}: '임관 100일' 문구`);
    eq(scheduled.filter((x) => /입대/.test(`${x.title} ${x.body}`)).length, 0, `${type}: '입대' 문구 없음`);
  }
  eq(N.notifEventsFor('officer').find((e) => e.key === 'milestone').desc.startsWith('임관 100일'), true, '설정 목록(간부): 임관 100일');

  /* 간부 진급 이력 (v1.6) — 기록한 예정일에 당일 09시 알림, 지난 기록은 예약하지 않음 */
  await setup({ promotion: true }, {
    personnelType: 'officer', officerRank: '소위', months: 36,
    officerPromotions: [{ rank: '중위', date: '2025-06-15' }, { rank: '대위', date: '2025-04-20' }],
  });
  {
    const promo = scheduled.filter((x) => /진급 🎖️/.test(x.title));
    eq(promo.map((x) => x.title), ['중위 진급 🎖️'], '간부 진급 이력: 예정일만 예약 (지난 기록 제외)');
    eq(onDate('2025-06-15').filter((x) => /중위 진급/.test(x.title))[0]?.trigger.date.getHours(), 9, '간부 진급 이력: 당일 09시');
    ok(scheduled.some((x) => x.title === '내일은 중위 진급! 🎖️'), '간부 진급 이력: 전야 마일스톤');
  }
  await setup({ promotion: false }, {
    personnelType: 'officer', officerRank: '소위', months: 36, officerPromotions: [{ rank: '중위', date: '2025-06-15' }],
  });
  eq(scheduled.filter((x) => /진급 🎖️/.test(x.title) && !/^내일/.test(x.title)).length, 0, '간부 진급 이력: 진급 스위치 끄면 당일 알림 없음');

  /* 병사 회귀 — 진급·월급날은 그대로 */
  await setup({ promotion: true, payday: true });
  ok(scheduled.some((x) => /진급/.test(x.title)), '병사: 진급 알림 유지');
  ok(scheduled.some((x) => /월급/.test(x.title)), '병사: 월급날 알림 유지');

  /* 입대일 입력 후 알림 안내 — 한 번만, 켜져 있거나 OS 가 막았으면 묻지 않는다 */
  store = {};
  ok(await N.shouldOfferNotifPrompt(), '알림 안내: 처음엔 띄운다');
  await N.markNotifPromptDone();
  ok(!(await N.shouldOfferNotifPrompt()), '알림 안내: 한 번 본 뒤엔 다시 안 띄움');
  store = {};
  await N.saveNotifPrefs({ master: true });
  ok(!(await N.shouldOfferNotifPrompt()), '알림 안내: 이미 켜져 있으면 안 띄움');
  store = {};
  {
    const orig = NotifMock.getPermissionsAsync;
    NotifMock.getPermissionsAsync = async () => ({ status: 'denied', canAskAgain: false });
    ok(!(await N.shouldOfferNotifPrompt()), '알림 안내: OS 가 막아 둔 권한이면 안 띄움');
    NotifMock.getPermissionsAsync = async () => ({ status: 'denied', canAskAgain: true });
    ok(await N.shouldOfferNotifPrompt(), '알림 안내: 다시 물을 수 있으면 띄움');
    NotifMock.getPermissionsAsync = orig;
  }

  console.log('\n──────────── 알림 예약 테스트 ────────────');
  if (fail === 0) { console.log(`✓ 전체 통과: ${pass}건`); process.exit(0); }
  console.log(`통과 ${pass} / 실패 ${fail}\n`);
  fails.forEach((f) => console.log(f + '\n'));
  process.exit(1);
})().catch((e) => { console.error('\n테스트 실행 중 예외:', e); process.exit(1); });
