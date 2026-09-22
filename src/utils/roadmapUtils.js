/**
 * 전역 로드맵 — 입대부터 전역까지 주요 마일스톤 자동 계산
 * 홈 화면 타임라인에 사용. 모든 계산은 클라이언트(저장된 입대정보)만으로 수행.
 */
import { calcDaysLeft, formatDate, parseDate } from './dateUtils';
import { isOfficer } from '../constants/serviceTerms';

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  if (!d) return null;
  d.setDate(d.getDate() + n);
  return d;
}

/** 두 날짜 사이 일수 (양끝 포함하지 않는 단순 차이) */
function daySpan(startStr, endStr) {
  const s = parseDate(startStr);
  const e = parseDate(endStr);
  if (!s || !e) return 0;
  return Math.round((e - s) / 86400000);
}

/**
 * 복무 반환점.
 *
 * 예전엔 두 시각의 ms 중점(`s + (e - s) / 2`)이었다. DST 가 낀 구간에서는 총
 * 길이가 ±1시간이라 중점이 자정에서 23:00 으로 밀리고, `calcDaysLeft` 가
 * 반올림하면서 반환점이 통째로 하루 당겨졌다 (Australia/Sydney 에서 재현).
 * 이 파일의 다른 마일스톤과 똑같이 **달력 일수**로 센다.
 */
function midpoint(startStr, endStr) {
  const total = daySpan(startStr, endStr);
  if (!parseDate(startStr) || !parseDate(endStr)) return null;
  return addDays(startStr, Math.round(total / 2));
}

/**
 * 마일스톤 목록 생성
 * @param {object} info        militaryInfo (enlistDate, dischargeDate, personnelType)
 * @param {object} promotions  { 일병, 상병, 병장 } (병사만)
 * @returns {Array<{ key, label, emoji, date(Date), dday(number), done(boolean) }>}
 *          날짜 오름차순 정렬. dday>0 이면 미래, <=0 이면 지남(done).
 */
export function buildRoadmap(info, promotions) {
  if (!info?.enlistDate || !info?.dischargeDate) return [];
  // 날짜가 깨져 있으면 조각난 타임라인을 그리느니 비운다 (화면은 빈 상태를 처리한다)
  if (!parseDate(info.enlistDate) || !parseDate(info.dischargeDate)) return [];
  const officer = isOfficer(info.personnelType);
  const list = [];

  /* emoji 는 위젯·공유 텍스트용으로 남겨두고, 화면은 icon(Ionicons) 을 쓴다. */
  // 복무기간이 100일보다 짧으면 '입대 100일'과 '전역 100일 전'은 구간 밖으로
  // 벗어난다(전자는 전역 뒤, 후자는 입대 전). 정렬하면 타임라인이
  // 전역100일전 → 입대 → 전역 → 입대100일 순으로 뒤엉키므로 아예 넣지 않는다.
  // DischargeScreen 은 간부 복무개월을 1~240 으로 받으므로 실제로 가능한 입력이다.
  const totalDays = daySpan(info.enlistDate, info.dischargeDate);
  const showD100 = totalDays >= 100;

  list.push({ key: 'enlist', label: '입대', emoji: '🪖', icon: 'flag', date: parseDate(info.enlistDate) });
  if (showD100) list.push({ key: 'd100in', label: '입대 100일', emoji: '💯', icon: 'calendar-number', date: addDays(info.enlistDate, 99) });

  if (!officer && promotions) {
    if (promotions.일병) list.push({ key: 'r1', label: '일병 진급', emoji: '🎖️', icon: 'chevron-up-circle', date: parseDate(promotions.일병) });
    if (promotions.상병) list.push({ key: 'r2', label: '상병 진급', emoji: '🎖️', icon: 'chevron-up-circle', date: parseDate(promotions.상병) });
    if (promotions.병장) list.push({ key: 'r3', label: '병장 진급', emoji: '👑', icon: 'star', date: parseDate(promotions.병장) });
  }

  list.push({ key: 'half', label: '반환점 (복무 절반)', emoji: '⚖️', icon: 'hourglass', date: midpoint(info.enlistDate, info.dischargeDate) });
  if (showD100) list.push({ key: 'd100out', label: '전역 100일 전', emoji: '🔥', icon: 'flame', date: addDays(info.dischargeDate, -100) });
  list.push({ key: 'discharge', label: '전역', emoji: '🎉', icon: 'trophy', date: parseDate(info.dischargeDate) });

  return list
    .filter((m) => m.date instanceof Date && !isNaN(m.date.getTime()))  // 날짜 파싱 실패분 제외
    .map((m) => {
      const dday = calcDaysLeft(m.date);
      return { ...m, dateStr: formatDate(m.date), dday: dday, done: dday <= 0 };
    })
    .sort((a, b) => a.date - b.date);
}

/** 아직 지나지 않은 다음 마일스톤의 key (없으면 null) */
export function nextMilestoneKey(roadmap) {
  const next = roadmap.find((m) => !m.done);
  return next ? next.key : null;
}

/**
 * **다음 마일스톤까지의 구간** 진행률 (0..1)
 *
 * 직전 마일스톤 → 그 다음 마일스톤 사이에서 오늘이 어디쯤인지를 잰다.
 *
 * 예전에 홈의 '다음 마일스톤' 카드는 `servedDays / (servedDays + daysLeft)`,
 * 즉 **전체 복무 진행률**을 그리고 있었다. 그래서 일병을 달아 다음 목표가
 * 상병으로 바뀌어도 바가 리셋되지 않고 계속 차기만 했다 — 카드의 제목과
 * 그래프가 서로 다른 얘기를 하고 있었던 셈이다.
 *
 * @param roadmap buildRoadmap 결과 (날짜 오름차순)
 * @param key     다음 마일스톤의 key
 */
export function milestoneProgress(roadmap, key) {
  if (!Array.isArray(roadmap) || roadmap.length === 0 || !key) return 0;
  const idx = roadmap.findIndex((m) => m.key === key);
  if (idx < 0) return 0;

  const next = roadmap[idx];
  if (next.done) return 1;

  // 첫 항목(입대)이 아직 안 지났다면 채울 구간 자체가 없다
  const prev = idx > 0 ? roadmap[idx - 1] : null;
  if (!prev) return 0;

  const span = Math.round((next.date - prev.date) / 86400000);
  if (span <= 0) return 1;   // 같은 날짜의 마일스톤이 겹친 경우

  const left = Math.max(0, Math.min(span, next.dday));
  return (span - left) / span;
}
