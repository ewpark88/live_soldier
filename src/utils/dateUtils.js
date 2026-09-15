import { pickDaily, todayStr } from './daily';

/* ─── 월 단위 날짜 계산 (민법 제160조) ──────────────────────────────────
 * ② 최종 월에서 기산일에 해당한 날의 전일로 기간이 만료한다.
 * ③ 최종 월에 해당일이 없는 때에는 그 월의 말일로 기간이 만료한다.
 *
 * setMonth() 를 그대로 쓰면 존재하지 않는 날짜(2026-02-31)가 다음 달로
 * 굴러가( 2026-03-03 ) 월말 입대자의 전역일·진급일이 며칠씩 어긋난다.
 * 아래 헬퍼가 두 계산의 단일 기준이다.
 */

/** 'YYYY-MM-DD' → { y, m, d } · 형식이 틀리면 null (로컬 기준, UTC 파싱 회피) */
function _allDigits(s) {
  if (!s.length) return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 48 || c > 57) return false;
  }
  return true;
}

function _ymdParts(dateStr) {
  if (typeof dateStr !== 'string' || dateStr.length !== 10) return null;
  if (dateStr[4] !== '-' || dateStr[7] !== '-') return null;
  const ys = dateStr.slice(0, 4), ms = dateStr.slice(5, 7), ds = dateStr.slice(8, 10);
  if (!_allDigits(ys) || !_allDigits(ms) || !_allDigits(ds)) return null;
  const y = Number(ys), mo = Number(ms), d = Number(ds);
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > daysInMonth(y, mo - 1)) return null;
  return { y, m: mo, d };
}

/**
 * 'YYYY-MM-DD' → 로컬 자정 Date. 형식이 틀리거나 없는 날짜면 null.
 *
 * new Date('2024-06-10') 은 UTC 자정으로 파싱되는데 읽을 때는 로컬 게터를
 * 쓰므로, UTC 오프셋이 음수인 기기(미주 등)에서는 하루 앞선 날짜가 나온다.
 * 문자열 → Date 변환은 전부 이 함수를 거친다.
 */
export function parseDate(value) {
  if (value instanceof Date) {
    return isNaN(value.getTime())
      ? null
      : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const p = _ymdParts(value);
  return p ? new Date(p.y, p.m - 1, p.d) : null;
}

/** 오늘 로컬 자정 */
export function startOfToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/** 해당 연·월(0-based)의 일수 */
function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * 기산일 + N개월의 '해당일'. 해당일이 없으면 그 달의 말일로 클램프.
 * @returns {{ date: Date, clamped: boolean } | null}
 */
function _shiftMonths(dateStr, months) {
  const p = _ymdParts(dateStr);
  if (!p || !Number.isFinite(months)) return null;
  const total = (p.m - 1) + months;
  const ty = p.y + Math.floor(total / 12);
  const tm = ((total % 12) + 12) % 12;
  const last = daysInMonth(ty, tm);
  const clamped = p.d > last;
  return { date: new Date(ty, tm, clamped ? last : p.d), clamped };
}

/**
 * 입대일 + 복무개월 → 전역일(복무기간 만료일)
 * 해당일이 있으면 그 전일, 없으면 그 달의 말일 (민법 160조 ②③).
 * 예) 2024-01-02 +18개월 → 2025-07-01
 *     2024-08-31 +18개월 → 2026-02-28  (2026-02-31 은 없으므로 말일)
 */
export function calcDischargeDate(enlistDate, months) {
  const r = _shiftMonths(enlistDate, months);
  if (!r) return null;
  if (r.clamped) return r.date;          // 말일이 곧 만료일 — 하루를 더 빼지 않는다
  r.date.setDate(r.date.getDate() - 1);  // 해당일의 전일
  return r.date;
}

/**
 * 입대일 + N개월 → 진급일 'YYYY-MM-DD'
 * 진급일은 발효일(해당일)이라 전역일과 달리 -1일을 적용하지 않는다.
 * 해당일이 없으면 그 달의 말일.
 */
export function calcPromotionDate(enlistDate, months) {
  const r = _shiftMonths(enlistDate, months);
  return r ? formatDate(r.date) : null;
}

/**
 * 두 날짜 사이 남은 일수 (D-Day)
 */
export function calcDaysLeft(targetDate) {
  const target = parseDate(targetDate);
  if (!target) return 0;
  return Math.round((target - startOfToday()) / 86400000);
}

/**
 * 총 복무 일수 대비 오늘까지 복무한 진행률 (0~100)
 */
export function calcProgress(enlistDate, dischargeDate) {
  const start = parseDate(enlistDate);
  const end = parseDate(dischargeDate);
  if (!start || !end) return 0;

  // 밀리초로 나누면 DST 전환(±1시간)이 낀 구간에서 비율이 1% 어긋난다.
  // 달력 일수로 환산해서 계산한다.
  const totalDays = Math.round((end - start) / 86400000);
  if (totalDays <= 0) return 100;
  const elapsedDays = Math.round((startOfToday() - start) / 86400000);

  if (elapsedDays <= 0) return 0;
  if (elapsedDays >= totalDays) return 100;
  return Math.floor((elapsedDays / totalDays) * 100);
}

/**
 * 복무한 날수
 */
export function calcServedDays(enlistDate) {
  const start = parseDate(enlistDate);
  if (!start) return 0;
  const diff = startOfToday() - start;
  if (diff < 0) return 0;
  return Math.round(diff / 86400000);
}

/** 'YYYY-MM-DD' 가 오늘(로컬)보다 미래인가 */
export function isFutureDate(dateStr) {
  if (!_ymdParts(dateStr)) return false;
  return dateStr > todayStr();   // ISO 날짜는 사전식 비교 = 시간순 비교
}

/**
 * Date | 'YYYY-MM-DD' → 'YYYY-MM-DD' · 값이 없거나 잘못되면 ''
 */
export function formatDate(date) {
  const d = parseDate(date);
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Date → 'YYYY년 MM월 DD일'
 */
export function formatDateKo(date) {
  const d = parseDate(date);
  if (!d) return '';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/* ─── 휴가/일정 기간(span) 계산 ─────────────────────────────────────────
 * 모두 "시작일·종료일을 포함"하는 폐구간 기준이다.
 * 예) 1/2 ~ 1/4 = 3일 (1/2, 1/3, 1/4 포함)
 * EventCalendar·TodoScreen·RangeCalendar가 공유한다. */

/** 시작일에서 days일 만큼(시작일 포함)의 'YYYY-MM-DD' 배열 */
export function spanDates(startStr, days) {
  const out = [];
  const d = parseDate(startStr);
  if (!d) return out;
  const n = Math.max(1, Math.floor(days) || 1);
  for (let i = 0; i < n; i++) {
    out.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** 시작일 + days(시작일 포함) → 종료일 'YYYY-MM-DD' (days=1이면 시작일과 동일) */
export function endDateFromSpan(startStr, days) {
  const d = parseDate(startStr);
  if (!d) return startStr;
  const n = Math.max(1, Math.floor(days) || 1);
  d.setDate(d.getDate() + n - 1);
  return formatDate(d);
}

/** 시작~종료(양끝 포함) 일수. 잘못된 입력이거나 종료<시작이면 0 */
export function daysBetweenInclusive(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const s = parseDate(startStr);
  const e = parseDate(endStr);
  if (!s || !e) return 0;
  const diff = e - s;
  if (diff < 0) return 0;
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * 'YYYY-MM-DD' 형식 유효성 검사
 */
export function isValidDateString(str) {
  return _ymdParts(str) !== null;
}

/**
 * 현재 복무 중인 계급 계산 (병사 기준)
 * 전군 동일: 이병 0~2개월, 일병 2~8개월, 상병 8~14개월, 병장 14개월~
 * (출처: 병역법 시행령 / SBS뉴스 2019)
 * 해군·공군은 총 복무 기간이 길어 병장 기간이 더 길 뿐, 진급 기준은 동일
 */
export function calcRank(servedDays) {
  // 30.44 = 평균 월일수 (365.25 / 12)
  const months = servedDays / 30.44;
  if (months < 2)  return '이병';
  if (months < 8)  return '일병';
  if (months < 14) return '상병';
  return '병장';
}

/**
 * 진급일 기록을 기준으로 현재 계급 계산
 * promotionDates: { 일병: 'YYYY-MM-DD', 상병: 'YYYY-MM-DD', 병장: 'YYYY-MM-DD' }
 */
export function calcRankFromPromotions(promotionDates) {
  if (!promotionDates) return null;
  const now = startOfToday();
  const reached = (s) => { const d = parseDate(s); return d !== null && now >= d; };
  if (reached(promotionDates.병장)) return '병장';
  if (reached(promotionDates.상병)) return '상병';
  if (reached(promotionDates.일병)) return '일병';
  return '이병';
}

/**
 * 다음 진급(계급) 정보 계산
 * 아직 도래하지 않은 가장 빠른 진급일을 반환. 병장까지 모두 진급했으면 null.
 * @returns {{ rank: string, date: string, daysLeft: number } | null}
 */
export function nextPromotion(promotionDates) {
  if (!promotionDates) return null;
  const now = startOfToday();
  const order = [
    { rank: '일병', date: promotionDates.일병 },
    { rank: '상병', date: promotionDates.상병 },
    { rank: '병장', date: promotionDates.병장 },
  ];
  for (const p of order) {
    if (!p.date) continue;
    const d = parseDate(p.date);
    if (d && d > now) return { rank: p.rank, date: p.date, daysLeft: calcDaysLeft(p.date) };
  }
  return null; // 병장 진급 완료 (더 이상 진급 없음)
}

/**
 * 복무 단계(phase)별 응원 메시지
 * phase 값은 전역까지 남은 일수 기준: done / d3 / d7 / d30 / d100 / normal
 * 남은 일수별 군인 심리를 고려해 메시지를 다르게 제공.
 */
export const PHASE_MESSAGES = {
  done: [
    '🎉 전역을 진심으로 축하합니다! 정말 고생 많았어!',
    '드디어 자유다! 그동안 정말 수고 많았어 🫡',
    '국방의 의무를 마친 당신, 자랑스럽습니다!',
    '이제 진짜 시작이다. 새로운 출발을 응원해!',
  ],
  d3: [
    '전역이 코앞! 마지막까지 안전하게 마무리하자 🎖️',
    '딱 3일! 짐 정리하며 설레는 중이지? 😆',
    '거의 다 왔어. 마지막 밤들만 잘 보내면 끝!',
    '곧 민간인! 마지막까지 무사고로 가자!',
  ],
  d7: [
    '전역까지 일주일! 손에 잡힐 듯 가깝다 🏆',
    '카운트다운 일주일. 이젠 정말 실감 나지?',
    '7일이면 끝! 끝까지 컨디션 관리하자.',
    '한 주만 더! 전역 후 계획은 다 세웠어?',
  ],
  d30: [
    '전역 한 달 전! 가장 설레는 시기야 🔥',
    '말출 곧이다! 한 달만 더 버티면 끝.',
    '30일 남았어. 마지막 한 달, 후회 없이!',
    '한 달이면 사회인이다. 조금만 더 힘내!',
  ],
  d100: [
    '전역 100일 전! 이제 보인다 💪',
    '세 자리 수 진입! 여기서부터는 금방 가.',
    '백일 남았어. 곰신·가족도 함께 기다리는 중!',
    '100일의 기적, 이제 시작이다!',
  ],
  normal: [
    '오늘도 수고했어! 조금만 더 버텨봐 💪',
    '전역은 반드시 온다. 믿어!',
    '하루하루가 전역에 가까워지고 있어!',
    '포기하지 마. 넌 할 수 있어!',
    '국가의 부름에 응한 용사, 자랑스러워!',
    '훈련은 힘들지만 추억이 될 거야!',
    '오늘 하루도 무사히! 건강이 최우선이야.',
    '힘내! 전역 후의 자유가 기다리고 있어!',
    '군 생활, 나중에 웃으며 얘기할 수 있을 거야.',
    '오늘의 고생이 내일의 추억이 된다!',
    '카운트다운 시작! 넌 잘 하고 있어.',
    '부모님도 응원하고 있어. 파이팅!',
    '전역 후 먹을 치킨 생각하며 버텨!',
    '한 걸음씩, 천천히. 넌 잘 해낼 거야.',
    '오늘도 무결점 복무! 최고야!',
  ],
};

/**
 * 복무 단계에 맞는 응원 메시지 1개.
 *
 * 예전엔 Math.random() 이라 렌더할 때마다 바뀌었다 — 탭을 왔다갔다하면 문구가
 * 춤췄다. 이제 날짜에 고정된다: 같은 날엔 몇 번을 불러도 같고, 자정에 정확히
 * 한 칸 넘어간다. 인자를 안 넘기면 오늘 기준이라 기존 호출부는 그대로 둬도 된다.
 */
export function getMessageForPhase(phase, dateStr = todayStr()) {
  const pool = PHASE_MESSAGES[phase] ?? PHASE_MESSAGES.normal;
  return pickDaily(pool, dateStr, `msg:${phase}`) ?? pool[0];
}

/** 단계 무관 응원 메시지 (fallback) */
export function getRandomMessage(dateStr = todayStr()) {
  return getMessageForPhase('normal', dateStr);
}

/**
 * 복무 개월 수 계산
 */
export function calcServedMonths(enlistDate) {
  const start = parseDate(enlistDate);
  if (!start) return 0;
  const now = startOfToday();
  let months = (now.getFullYear() - start.getFullYear()) * 12;
  months += now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months--;
  return Math.max(0, months);
}
