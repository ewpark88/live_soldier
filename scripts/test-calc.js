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

const api = loadModule('dateUtils.js', 'officerUtils.js');

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
