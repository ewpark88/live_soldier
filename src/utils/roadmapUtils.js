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

function midpoint(startStr, endStr) {
  const s = parseDate(startStr);
  const e = parseDate(endStr);
  if (!s || !e) return null;
  return new Date(s.getTime() + (e.getTime() - s.getTime()) / 2);
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
