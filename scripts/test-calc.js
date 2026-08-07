/* eslint-disable no-console */
/**
 * 계산 로직 검증용 경량 테스트 러너 (의존성 없음).
 *
 *   node scripts/test-calc.js
 *
 * dateUtils.js / officerUtils.js 는 순수 JS(React Native 비의존)이므로,
 * ESM 키워드(import/export)만 제거해 Node 컨텍스트에서 그대로 실행해
 * "실제 소스 코드"의 함수 본문을 테스트한다. (jest/babel 미설치 환경 대응)
 *
 * '오늘'에 의존하는 함수(calcDaysLeft, calcServedDays 등)는 현재 시각을
 * 기준으로 상대 날짜를 만들어 검증하므로 실행 시점과 무관하게 결정적이다.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src', 'utils');

function loadModule(...files) {
  const code = files
    .map((f) => fs.readFileSync(path.join(SRC, f), 'utf8'))
    .join('\n')
    .replace(/^\s*import[^\n]*\n/gm, '')   // 모듈 간 import 제거 (한 스코프로 합침)
    .replace(/^export\s+/gm, '');           // export 키워드 제거
  const sandbox = { module: {}, exports: {}, console, Date, Math, isNaN, parseInt, String, Number, Array };
  vm.createContext(sandbox);
  vm.runInContext(code + '\nthis.__api = { ' + collectNames(code).join(', ') + ' };', sandbox);
  return sandbox.__api;
}

/* 최상위 function/const 선언 이름 수집 → 한 객체로 노출 */
function collectNames(code) {
  const names = new Set();
  const reFn = /^function\s+([A-Za-z0-9_$]+)/gm;
  const reConst = /^const\s+([A-Za-z0-9_$]+)\s*=/gm;
  let m;
  while ((m = reFn.exec(code)))    names.add(m[1]);
  while ((m = reConst.exec(code))) names.add(m[1]);
  return [...names];
}

// daily.js 를 먼저 합친다 — dateUtils 의 getMessageForPhase 가 pickDaily/todayStr 을 쓴다
const api = loadModule('daily.js', 'dateUtils.js', 'officerUtils.js', 'streak.js', 'celebration.js');

/* ─── 미니 어서션 프레임워크 ─────────────────────────────────────────── */
let pass = 0, fail = 0;
const fails = [];
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; fails.push(`✗ ${label}\n    기대: ${e}\n    실제: ${a}`); }
}
function ok(cond, label) { eq(!!cond, true, label); }

/* 오늘 기준 상대 날짜 헬퍼 */
function ymd(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayPlus(days) {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

/* ─── 1. 전역일 계산 ─────────────────────────────────────────────────── */
eq(ymd(api.calcDischargeDate('2024-01-02', 18)), '2025-07-01', 'calcDischargeDate: 2024-01-02 +18개월 → 2025-07-01');
eq(ymd(api.calcDischargeDate('2023-03-15', 21)), '2024-12-14', 'calcDischargeDate: 공군 21개월');
eq(ymd(api.calcDischargeDate('2024-06-01', 20)), '2026-01-31', 'calcDischargeDate: 해군 20개월');

/* ─── 2. D-Day / 복무일수 (오늘 기준 상대) ───────────────────────────── */
eq(api.calcDaysLeft(todayPlus(0)), 0,   'calcDaysLeft: 오늘 = D-0');
eq(api.calcDaysLeft(todayPlus(1)), 1,   'calcDaysLeft: 내일 = D-1');
eq(api.calcDaysLeft(todayPlus(100)), 100, 'calcDaysLeft: 100일 후');
eq(api.calcDaysLeft(todayPlus(-5)), -5,  'calcDaysLeft: 지난 날짜는 음수');

eq(api.calcServedDays(todayPlus(0)), 0,    'calcServedDays: 오늘 입대 = 0일');
eq(api.calcServedDays(todayPlus(-100)), 100, 'calcServedDays: 100일 전 입대 = 100일');
eq(api.calcServedDays(todayPlus(5)), 0,    'calcServedDays: 미래 입대는 0(음수 방지)');

/* ─── 3. 진행률 ──────────────────────────────────────────────────────── */
eq(api.calcProgress(todayPlus(-50), todayPlus(50)), 50, 'calcProgress: 절반 복무 = 50%');
eq(api.calcProgress(todayPlus(10), todayPlus(100)), 0,  'calcProgress: 입대 전 = 0%');
eq(api.calcProgress(todayPlus(-100), todayPlus(-1)), 100, 'calcProgress: 전역 후 = 100%');

/* ─── 4. 계급 (복무일수 기준) ────────────────────────────────────────── */
eq(api.calcRank(0),   '이병', 'calcRank: 0일 = 이병');
eq(api.calcRank(30),  '이병', 'calcRank: ~2개월 미만 = 이병');
eq(api.calcRank(70),  '일병', 'calcRank: 2~8개월 = 일병');
eq(api.calcRank(300), '상병', 'calcRank: 8~14개월 = 상병');
eq(api.calcRank(500), '병장', 'calcRank: 14개월~ = 병장');

/* ─── 5. 진급일 기준 계급/다음 진급 ──────────────────────────────────── */
const promo = { 일병: todayPlus(-200), 상병: todayPlus(-50), 병장: todayPlus(30) };
eq(api.calcRankFromPromotions(promo), '상병', 'calcRankFromPromotions: 상병 도래·병장 미도래 → 상병');
eq(api.calcRankFromPromotions({ 일병: todayPlus(5), 상병: todayPlus(60), 병장: todayPlus(120) }), '이병', 'calcRankFromPromotions: 전부 미래 → 이병');
const np = api.nextPromotion(promo);
ok(np && np.rank === '병장' && np.daysLeft === 30, 'nextPromotion: 다음은 병장 D-30');
eq(api.nextPromotion({ 일병: todayPlus(-300), 상병: todayPlus(-200), 병장: todayPlus(-100) }), null, 'nextPromotion: 병장까지 완료 → null');

/* ─── 6. 날짜 포맷/검증 ──────────────────────────────────────────────── */
eq(api.formatDate('2024-01-05'), '2024-01-05', 'formatDate');
eq(api.formatDateKo('2024-01-05'), '2024년 1월 5일', 'formatDateKo');
ok(api.isValidDateString('2024-12-31'), 'isValidDateString: 정상');
ok(!api.isValidDateString('2024-13-40'), 'isValidDateString: 잘못된 월/일');
ok(!api.isValidDateString('2024-1-5'), 'isValidDateString: 자리수 불충분');

/* ─── 7. 휴가/일정 기간(span) 계산 — 핵심 점검 대상 ──────────────────── */
eq(api.spanDates('2024-03-10', 1), ['2024-03-10'], 'spanDates: 1일');
eq(api.spanDates('2024-03-10', 3), ['2024-03-10', '2024-03-11', '2024-03-12'], 'spanDates: 3일(시작일 포함)');
eq(api.spanDates('2024-02-28', 3), ['2024-02-28', '2024-02-29', '2024-03-01'], 'spanDates: 윤년 월말 넘김');
eq(api.spanDates('bad-date', 3), [], 'spanDates: 잘못된 날짜 → 빈 배열');

eq(api.endDateFromSpan('2024-03-10', 1), '2024-03-10', 'endDateFromSpan: 1일 = 시작일');
eq(api.endDateFromSpan('2024-03-10', 7), '2024-03-16', 'endDateFromSpan: 7일 → +6일');
eq(api.endDateFromSpan('2024-12-30', 5), '2025-01-03', 'endDateFromSpan: 연말 넘김');

eq(api.daysBetweenInclusive('2024-03-10', '2024-03-10'), 1, 'daysBetweenInclusive: 같은 날 = 1일');
eq(api.daysBetweenInclusive('2024-03-10', '2024-03-12'), 3, 'daysBetweenInclusive: 3일');
eq(api.daysBetweenInclusive('2024-03-12', '2024-03-10'), 0, 'daysBetweenInclusive: 종료<시작 = 0');
eq(api.daysBetweenInclusive('2024-02-28', '2024-03-01'), 3, 'daysBetweenInclusive: 윤년 2월 넘김');

/* span 함수 간 일관성: endDateFromSpan ↔ daysBetweenInclusive 왕복 */
for (const days of [1, 2, 5, 7, 30]) {
  const end = api.endDateFromSpan('2024-05-01', days);
  eq(api.daysBetweenInclusive('2024-05-01', end), days, `왕복 일관성: ${days}일 span ↔ inclusive`);
}

/* ─── 8. 휴가 잔여 계산(화면 로직 재현) ──────────────────────────────── */
function leaveLeft(base, bonusRecords, useRecords) {
  const bonusDays = bonusRecords.reduce((s, r) => s + (r.days || 0), 0);
  const usedDays  = useRecords.reduce((s, r) => s + (r.days || 0), 0);
  return (base + bonusDays) - usedDays;
}
eq(leaveLeft(21, [], []), 21, '휴가: 기본 21, 사용/포상 없음 → 21');
eq(leaveLeft(21, [{ days: 4 }, { days: 2 }], [{ days: 3 }]), 24, '휴가: 21+6포상-3사용 = 24');
eq(leaveLeft(21, [], [{ days: 10 }, { days: 15 }]), -4, '휴가: 초과 사용 시 음수 허용(경고 표시용)');

/* ─── 9. 간부 호봉 ───────────────────────────────────────────────────── */
eq(api.calcHobong(todayPlus(0)), 1,   'calcHobong: 임관 당일 = 1호봉');
eq(api.calcHobong(todayPlus(-400)), 2, 'calcHobong: 1년 경과 = 2호봉');
eq(api.calcHobong(todayPlus(-800)), 3, 'calcHobong: 2년 경과 = 3호봉');
const hb = api.nextHobongInfo(todayPlus(-400));
ok(hb && hb.current === 2 && hb.next === 3, 'nextHobongInfo: 현재 2 → 다음 3호봉');

/* ─── 10. 날짜 결정적 선택 (daily.js) ────────────────────────────────── */
const pool = ['a', 'b', 'c', 'd', 'e'];
eq(api.pickDaily(pool, '2026-08-07', 'x'), api.pickDaily(pool, '2026-08-07', 'x'),
   'pickDaily: 같은 날 같은 salt → 항상 같은 값');
ok(api.pickDaily(pool, '2026-08-07', 'x') !== api.pickDaily(pool, '2026-08-08', 'x'),
   'pickDaily: 연속 이틀은 절대 같지 않다 (회전이라 구조적으로 불가능)');
eq(api.dayIndex('2026-08-08') - api.dayIndex('2026-08-07'), 1, 'dayIndex: 하루 = 1');
eq(api.dayIndex('2027-01-01') - api.dayIndex('2026-12-31'), 1, 'dayIndex: 해를 넘겨도 1');
eq(api.pickDaily([], '2026-08-07', 'x'), null, 'pickDaily: 빈 풀 → null');

/* ─── 11. 출석 스트릭 (streak.js) ────────────────────────────────────── */
const D = (str, h) => { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d, h || 12); };

let st = api.checkIn(api.EMPTY_STREAK, D('2026-08-01')).next;
eq(st.current, 1, '스트릭: 첫 체크인 → 1일');

// 같은 날 재진입은 멱등
const same = api.checkIn(st, D('2026-08-01', 20));
eq(same.changed, false, '스트릭: 같은 날 재진입은 변화 없음 (멱등)');
eq(same.next.current, 1, '스트릭: 같은 날 재진입해도 1일 유지');

st = api.checkIn(st, D('2026-08-02')).next;
st = api.checkIn(st, D('2026-08-03')).next;
eq(st.current, 3, '스트릭: 연속 3일');
eq(st.best, 3, '스트릭: 최고 기록 갱신');

// 하루 빠짐 → 유예로 이어짐
const frozen = api.checkIn(st, D('2026-08-05'));
eq(frozen.event, 'freeze', '스트릭: 하루 놓치면 보호가 발동한다');
eq(frozen.next.current, 4, '스트릭: 보호 사용 시 연속이 이어진다');
eq(frozen.next.freezeUsed, '2026-08-04', '스트릭: 놓친 날짜가 기록된다');

// 유예 재충전 전에 또 빠지면 리셋
const broken = api.checkIn(frozen.next, D('2026-08-07'));
eq(broken.event, 'reset', '스트릭: 2주 안에 또 놓치면 리셋 (보호는 14일에 1회)');
eq(broken.next.current, 1, '스트릭: 리셋 후 1일부터');
eq(broken.next.best, 4, '스트릭: 최고 기록은 리셋되지 않는다');

// 이틀 넘게 빠지면 보호와 무관하게 리셋
const gap = api.checkIn(st, D('2026-08-08'));
eq(gap.event, 'reset', '스트릭: 이틀 이상 공백은 보호로도 못 잇는다');

// 시계 되감기 방어
const back = api.checkIn(st, D('2026-07-20'));
eq(back.changed, false, '스트릭: 날짜를 과거로 돌리면 아무 일도 없다');
eq(back.next.current, 3, '스트릭: 과거로 돌려도 연속이 깨지지 않는다');

// days 배열 상한
let long = api.EMPTY_STREAK;
for (let i = 0; i < 80; i += 1) {
  const d = new Date(2026, 0, 1 + i, 12);
  long = api.checkIn(long, d).next;
}
eq(long.current, 80, '스트릭: 80일 연속');
ok(long.days.length <= api.DAYS_WINDOW, `스트릭: days 배열이 ${api.DAYS_WINDOW}개로 제한된다 (무한 증가 방지)`);

eq(api.tierOf(0).key, 'none', '티어: 0일');
eq(api.tierOf(7).key, 'spark', '티어: 7일 = 불씨');
eq(api.tierOf(30).key, 'fire', '티어: 30일 = 불꽃');
eq(api.tierOf(100).key, 'blaze', '티어: 100일 = 화염');
eq(api.tierOf(365).key, 'beacon', '티어: 365일 = 봉화');

/* ─── 12. 마일스톤 축하 판정 (celebration.js) ────────────────────────── */
const ms = (key, dday) => ({ key, label: key, dday, done: dday <= 0 });
const rm = [ms('enlist', -400), ms('r1', -340), ms('r2', -1), ms('discharge', 120)];

// 최초 실행 / 신규 프로필 — 지난 것 전부 마킹, 아무것도 안 띄운다.
// 이게 없으면 기존 사용자가 업데이트 직후 옛 마일스톤 팝업을 맞는다.
const seedRun = api.dueMilestone(rm, null);
eq(seedRun.show, null, '축하: 최초 실행엔 아무것도 띄우지 않는다');
eq(seedRun.seed, ['enlist', 'r1', 'r2'], '축하: 지난 마일스톤을 전부 조용히 마킹한다');

// 방금 도달한 것만 축하
const fresh = api.dueMilestone(rm, ['enlist', 'r1']);
ok(fresh.show && fresh.show.key === 'r2', '축하: 방금 지난 마일스톤을 띄운다');

// 이미 축하한 건 다시 안 띄움
eq(api.dueMilestone(rm, ['enlist', 'r1', 'r2']).show, null, '축하: 이미 축하한 건 재발화하지 않는다');

// 창(-2..0) 밖의 오래된 항목은 마킹만 하고 안 띄움
const stale = api.dueMilestone([ms('r1', -340)], []);
eq(stale.show, null, '축하: 한참 지난 마일스톤은 띄우지 않는다 (입대일 수정 대비)');
eq(stale.seed, ['r1'], '축하: 그래도 마킹은 한다');

// 여러 개가 동시에 신선해도 하나만
const multi = api.dueMilestone([ms('a', -2), ms('b', -1), ms('c', 0)], []);
eq(multi.seed.length, 3, '축하: 신선한 항목은 전부 마킹');
ok(multi.show && multi.show.key === 'c', '축하: 여러 개여도 가장 최근 하나만 띄운다');

eq(api.dueMilestone([], null).show, null, '축하: 빈 로드맵 안전');

const themes = [{ id: 'steel', lock: { key: 'r2', altKey: 'half' } }, { id: 'x', lock: null }];
eq(api.unlockedBy('r2', themes).id, 'steel', '해금: key 로 매칭');
eq(api.unlockedBy('half', themes).id, 'steel', '해금: altKey(간부 대체 조건)로도 매칭');
eq(api.unlockedBy('enlist', themes), null, '해금: 해당 없음 → null');

/* ─── 결과 출력 ──────────────────────────────────────────────────────── */
console.log('\n──────────── 계산 로직 테스트 ────────────');
if (fail === 0) {
  console.log(`✓ 전체 통과: ${pass}건`);
  process.exit(0);
} else {
  console.log(`통과 ${pass} / 실패 ${fail}\n`);
  fails.forEach((f) => console.log(f + '\n'));
  process.exit(1);
}
