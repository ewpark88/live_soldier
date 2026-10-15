/* eslint-disable no-console */
/**
 * 시계 고정 테스트 — '오늘'에 의존하는 로직을 특정 날짜로 못 박아 검증한다.
 *
 *   node scripts/test-clock.js
 *
 * test-calc.js 는 대부분 '오늘 기준 상대 날짜'로 검증한다. 그래서 결정적이긴
 * 하지만, 특정 달력 위치에서만 드러나는 버그는 구조적으로 못 잡는다.
 * 변이 테스트로 확인된 사각지대 둘을 여기서 막는다:
 *
 *  1) 윤일 임관자의 호봉 — 평년 2월에 평가할 때만 클램프가 동작한다.
 *     (9월에 돌리는 test-calc.js 는 이 분기를 절대 밟지 않는다)
 *  2) calcProgress 의 DST 오차 — 오늘 ±50일 창에 DST 전환이 들어와야 드러난다.
 *     1년 중 절반은 조용히 통과한다.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/* ─── 시계를 고정한 채 모듈을 적재 ──────────────────────────────────── */
function loadAt(isoLocal, files) {
  const code = files
    .map((f) => fs.readFileSync(f.includes('/') ? path.join(SRC, f) : path.join(SRC, 'utils', f), 'utf8'))
    .join('\n')
    .replace(/^\s*import[^\n]*\n/gm, '')
    .replace(/^export\s+/gm, '');

  const [y, mo, d, h] = isoLocal;
  const RealDate = Date;
  class FrozenDate extends RealDate {
    constructor(...a) { if (a.length === 0) super(y, mo - 1, d, h || 12); else super(...a); }
    static now() { return new RealDate(y, mo - 1, d, h || 12).getTime(); }
  }
  const names = new Set();
  const reFn = /^function\s+([A-Za-z0-9_$]+)/gm;
  const reConst = /^const\s+([A-Za-z0-9_$]+)\s*=/gm;
  let m;
  while ((m = reFn.exec(code))) names.add(m[1]);
  while ((m = reConst.exec(code))) names.add(m[1]);

  const sandbox = { module: {}, exports: {}, console, Date: FrozenDate, Math, isNaN, parseInt, String, Number, Array };
  vm.createContext(sandbox);
  vm.runInContext(code + '\nthis.__api = { ' + [...names].join(', ') + ' };', sandbox);
  return sandbox.__api;
}

let pass = 0, fail = 0;
const fails = [];
function eq(a, e, label) {
  if (JSON.stringify(a) === JSON.stringify(e)) pass++;
  else { fail++; fails.push(`✗ ${label}\n    기대: ${JSON.stringify(e)}\n    실제: ${JSON.stringify(a)}`); }
}
function ok(c, label) { eq(!!c, true, label); }

const DATE_FILES = ['daily.js', 'dateUtils.js', 'officerUtils.js'];

/* ── 1. 윤일 임관자 호봉 — 평년 2월 말일에 평가 ── */
for (const [year, expectHobong] of [[2025, 2], [2026, 3], [2027, 4]]) {
  const api = loadAt([year, 2, 28], DATE_FILES);
  const commission = '2024-02-29';
  const cur = api.calcHobong(commission);
  const info = api.nextHobongInfo(commission);
  eq(cur, expectHobong, `윤일 임관 ${year}-02-28: ${expectHobong}호봉`);
  eq(info.current, cur, `윤일 임관 ${year}-02-28: 두 함수의 현재 호봉 일치`);
  ok(info.daysLeft > 0, `윤일 임관 ${year}-02-28: 다음 승급이 미래 (D-0 모순 없음)`);
}
/* 윤년 2월 29일 당일 */
{
  const api = loadAt([2028, 2, 29], DATE_FILES);
  eq(api.calcHobong('2024-02-29'), 5, '윤일 임관 2028-02-29(윤년 당일): 5호봉');
  ok(api.nextHobongInfo('2024-02-29').daysLeft > 0, '윤일 임관 2028-02-29: D-0 모순 없음');
}
/* 클램프가 없으면 3월 1일에야 오른다 — 하루 늦음을 잡는 대조군 */
{
  const api = loadAt([2027, 3, 1], DATE_FILES);
  eq(api.calcHobong('2024-02-29'), 4, '윤일 임관 2027-03-01: 이미 4호봉');
}

/* ── 2. calcProgress DST — 전환을 창 안에 품는 날짜로 고정 ── */
/* 미국 DST: 2024-03-10 시작, 2024-11-03 종료 */
for (const [label, today, enlist, discharge, expected] of [
  ['봄 전환 직후', [2024, 3, 25], '2024-02-09', '2024-05-09', 50],
  ['가을 전환 직후', [2024, 11, 18], '2024-10-03', '2024-12-03', 75],
  ['봄 전환 포함 반환점', [2024, 3, 10], '2024-01-25', '2024-04-24', 50],
  ['가을 전환 포함 반환점', [2024, 11, 3], '2024-09-19', '2024-12-18', 50],
]) {
  const api = loadAt(today, DATE_FILES);
  eq(api.calcProgress(enlist, discharge), expected, `DST ${label}: 진행률 ${expected}%`);
}
/* D-day 도 전환 구간에서 정확해야 한다 */
{
  const api = loadAt([2024, 3, 9], DATE_FILES);
  eq(api.calcDaysLeft('2024-03-11'), 2, 'DST 봄 전환을 넘는 D-day');
  eq(api.calcServedDays('2024-03-07'), 2, 'DST 봄 전환 직전 복무일수');
}
{
  const api = loadAt([2024, 11, 2], DATE_FILES);
  eq(api.calcDaysLeft('2024-11-04'), 2, 'DST 가을 전환을 넘는 D-day');
  eq(api.calcServedDays('2024-10-31'), 2, 'DST 가을 전환 직전 복무일수');
}
/* calcServedDays 는 '전환을 사이에 둔' 구간이라야 반올림이 의미를 갖는다.
   가을 전환(시계를 되돌림)은 하루가 25시간이 되어 floor 면 1일 모자라고,
   봄 전환(23시간)은 ceil 이면 1일 넘친다. 전환 이후 날짜에서 되돌아본다. */
{
  const api = loadAt([2024, 11, 10], DATE_FILES);
  eq(api.calcServedDays('2024-11-01'), 9, 'DST: 가을 전환을 품은 복무일수 (25시간짜리 하루)');
  eq(api.calcDaysLeft('2024-11-20'), 10, 'DST: 가을 전환 이후 D-day');
}
{
  const api = loadAt([2024, 3, 20], DATE_FILES);
  eq(api.calcServedDays('2024-03-01'), 19, 'DST: 봄 전환을 품은 복무일수 (23시간짜리 하루)');
  eq(api.calcDaysLeft('2024-03-31'), 11, 'DST: 봄 전환 이후 D-day');
}
{
  const api = loadAt([2024, 12, 1], DATE_FILES);
  eq(api.calcServedDays('2024-01-01'), 335, 'DST: 양쪽 전환을 모두 품은 장기 복무일수');
}

/* ── 3. 연말·연초 경계 ── */
{
  const api = loadAt([2025, 12, 31], DATE_FILES);
  eq(api.calcDaysLeft('2026-01-01'), 1, '연말: 내일이 새해');
  eq(api.formatDate(api.startOfToday()), '2025-12-31', '연말: 오늘 날짜');
}
{
  const api = loadAt([2024, 2, 29], DATE_FILES);
  eq(api.formatDate(api.startOfToday()), '2024-02-29', '윤일: 오늘 날짜');
  eq(api.calcDaysLeft('2024-03-01'), 1, '윤일: 내일이 3월 1일');
}

/* ── 4. 월말 입대자의 복무 개월 — 진급일 클램프와 같은 규칙 (v1.3) ──
 * 1-31 입대자는 2월 말일에 1개월을 채운다 (calcPromotionDate 가 2/28 로 클램프).
 * 예전 calcServedMonths 는 28 < 31 이라 한 달을 깎아 급여·계급이 늦게 올랐다. */
{
  const api = loadAt([2026, 2, 28], DATE_FILES);
  eq(api.calcPromotionDate('2026-01-31', 1), '2026-02-28', '월말 입대: 진급일은 2/28 로 클램프');
  eq(api.calcServedMonths('2026-01-31'), 1, '월말 입대: 2/28 에 복무 1개월');
  // 12-31 입대의 2개월 해당일은 2/31 → 말일 2/28 (진급일과 같은 날 일병 = 2개월)
  eq(api.calcPromotionDate('2025-12-31', 2), '2026-02-28', '12-31 입대: 2개월 진급일 2/28');
  eq(api.calcServedMonths('2025-12-31'), 2, '12-31 입대: 2/28 에 복무 2개월 (진급일과 일치)');
}
{
  const api = loadAt([2026, 2, 27], DATE_FILES);
  eq(api.calcServedMonths('2026-01-31'), 0, '월말 입대: 2/27 은 아직 0개월');
}
{
  const api = loadAt([2026, 3, 30], DATE_FILES);
  eq(api.calcServedMonths('2025-12-31'), 2, '12-31 입대: 3/30 은 2개월 (3개월은 3/31)');
  eq(api.calcServedMonths('2026-01-30'), 2, '일반 입대: 해당일 당일에 개월 증가');
}

/* ── 5. 전역 후 복무일수 상한 ── */
{
  const api = loadAt([2026, 6, 1], DATE_FILES);
  eq(api.calcServedDays('2024-01-01', '2025-06-30'), 546, '전역 후: 복무일수는 전역일에서 멈춘다');
  eq(api.calcServedDays('2026-01-01', '2027-06-30'), 151, '복무 중: 상한 없이 오늘까지');
  eq(api.calcServedDays('2026-01-01'), 151, '전역일 생략: 기존 동작');
}

/* ── 6. 다른 메시지 보기 — offset 은 다른 문구로 순환한다 ── */
{
  const api = loadAt([2026, 5, 5], DATE_FILES);
  const base = api.getMessageForPhase('normal', '2026-05-05');
  const next = api.getMessageForPhase('normal', '2026-05-05', 1);
  ok(base !== next, '응원 메시지: offset 1 은 오늘 문구와 다르다');
  eq(api.getMessageForPhase('normal', '2026-05-05', api.PHASE_MESSAGES.normal.length), base, '응원 메시지: 한 바퀴 돌면 원위치');
}

/* ── 7. 다가오는 일정 — 다음 휴가 · 월급날 · 적금 만기 (v1.3) ── */
{
  const api = loadAt([2026, 10, 14], [...DATE_FILES, 'savingsUtils.js', 'upcoming.js']);
  const T = '2026-10-14';
  eq(api.getNextLeave([], T), null, '다음 휴가: 기록 없음');
  eq(api.getNextLeave([{ date: '2026-09-01', days: 3 }], T), null, '다음 휴가: 지난 휴가만');
  const up = api.getNextLeave([
    { date: '2026-12-01', days: 5 },
    { date: '2026-11-02', days: 4, memo: '정기' },
    { date: '2026-09-01', days: 3 },
  ], T);
  eq([up.state, up.start, up.end, up.dday, up.memo], ['upcoming', '2026-11-02', '2026-11-05', 19, '정기'], '다음 휴가: 가장 가까운 미래');
  const on = api.getNextLeave([{ date: '2026-10-12', days: 5 }, { date: '2026-11-02', days: 4 }], T);
  eq([on.state, on.dayNo, on.returnDday, on.end], ['ongoing', 3, 2, '2026-10-16'], '다음 휴가: 진행 중이 우선');
  const last = api.getNextLeave([{ date: '2026-10-10', days: 5 }], T);
  eq([last.state, last.dayNo, last.returnDday], ['ongoing', 5, 0], '다음 휴가: 마지막 날은 복귀 D-0');
  const chain = api.getNextLeave([{ date: '2026-10-13', days: 2 }, { date: '2026-10-14', days: 4 }], T);
  eq(chain.end, '2026-10-17', '다음 휴가: 겹친 기록은 늦게 끝나는 쪽');
  eq(api.getNextLeave([{ date: 'bad', days: 3 }, null], T), null, '다음 휴가: 잘못된 기록 무시');
  eq(api.getNextLeave([{ date: '2026-10-15', days: 0 }], T).dday, 1, '다음 휴가: 0일은 1일로 (내일 D-1)');

  // 2026-10-10 은 토요일 → 10-09(금). 10-14 기준이면 이미 지났으므로 11-10(화)
  eq(api.paydayOf(2026, 9), '2026-10-09', '월급날: 토요일이면 금요일로');
  eq(api.paydayOf(2026, 4), '2026-05-08', '월급날: 일요일(5/10)이면 금요일로');
  eq(api.paydayOf(2026, 5), '2026-06-10', '월급날: 평일은 그대로');
  const pd = api.getNextPayday(T);
  eq([pd.date, pd.dday, pd.shifted], ['2026-11-10', 27, false], '월급날: 이번 달이 지났으면 다음 달');
  eq(api.getNextPayday('2026-10-09').dday, 0, '월급날: 당일은 D-0');
  eq(api.getNextPayday('2026-10-05').shifted, true, '월급날: 앞당겨진 표시');
  eq(api.getNextPayday('2026-12-20').date, '2027-01-08', '월급날: 연말 → 다음 해 1월(일요일 10일 → 8일)');

  eq(api.getSavingsMaturity(null, '2027-01-01', T), null, '적금 만기: 플랜 없음');
  eq(api.getSavingsMaturity({ monthly: 0, months: 18 }, '2027-01-01', T), null, '적금 만기: 0원 플랜은 숨김');
  const sv = api.getSavingsMaturity({ monthly: 400000, months: 18 }, '2027-04-14', T);
  eq([sv.principal, sv.dday], [7200000, 182], '적금 만기: 원금과 전역까지 D-day');
  ok(sv.total > sv.principal * 2, '적금 만기: 매칭 + 이자 포함');
}

console.log('\n──────────── 시계 고정 테스트 ────────────');
if (fail === 0) { console.log(`✓ 전체 통과: ${pass}건`); process.exit(0); }
console.log(`통과 ${pass} / 실패 ${fail}\n`);
fails.forEach((f) => console.log(f + '\n'));
process.exit(1);
