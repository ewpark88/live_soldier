/**
 * 전역 로드맵 — 입대부터 전역까지 주요 마일스톤 자동 계산
 * 홈 화면 타임라인에 사용. 모든 계산은 클라이언트(저장된 입대정보)만으로 수행.
 */
import { calcDaysLeft, formatDate, parseDate } from './dateUtils';
import { isOfficer } from '../constants/serviceTerms';

function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
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
  const officer = isOfficer(info.personnelType);
  const list = [];

  /* emoji 는 위젯·공유 텍스트용으로 남겨두고, 화면은 icon(Ionicons) 을 쓴다. */
  list.push({ key: 'enlist', label: '입대', emoji: '🪖', icon: 'flag', date: parseDate(info.enlistDate) });
  list.push({ key: 'd100in', label: '입대 100일', emoji: '💯', icon: 'calendar-number', date: addDays(info.enlistDate, 99) });

  if (!officer && promotions) {
    if (promotions.일병) list.push({ key: 'r1', label: '일병 진급', emoji: '🎖️', icon: 'chevron-up-circle', date: parseDate(promotions.일병) });
    if (promotions.상병) list.push({ key: 'r2', label: '상병 진급', emoji: '🎖️', icon: 'chevron-up-circle', date: parseDate(promotions.상병) });
    if (promotions.병장) list.push({ key: 'r3', label: '병장 진급', emoji: '👑', icon: 'star', date: parseDate(promotions.병장) });
  }

  list.push({ key: 'half', label: '반환점 (복무 절반)', emoji: '⚖️', icon: 'hourglass', date: midpoint(info.enlistDate, info.dischargeDate) });
  list.push({ key: 'd100out', label: '전역 100일 전', emoji: '🔥', icon: 'flame', date: addDays(info.dischargeDate, -100) });
  list.push({ key: 'discharge', label: '전역', emoji: '🎉', icon: 'trophy', date: parseDate(info.dischargeDate) });

  return list
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
