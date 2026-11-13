/**
 * 전역 로드맵 — 입대부터 전역까지 주요 마일스톤 자동 계산
 * 홈 화면 타임라인에 사용. 모든 계산은 클라이언트(저장된 입대정보)만으로 수행.
 */
// 한 줄로 둔다 — scripts/test-calc.js 는 import 를 줄 단위로 지워서 여러 줄 import 를 못 읽는다
import { calcDaysLeft, calcRankByEnlistDate, calcRankFromPromotions, formatDate, parseDate } from './dateUtils';
import { hasSoldierRanks, isOfficer, isAlternative, personnelLabel, serviceLabel, termsFor } from '../constants/serviceTerms';

/**
 * 지금 계급 라벨 — 홈·설정·급여·월급표·축하·위젯이 모두 이것을 쓴다.
 * 간부: 직접 고른 계급(없으면 '장교'/'부사관'). 병사: 진급일 기록 → 없으면 입대일 기준.
 * 예전엔 화면마다 복사돼 있었고, 월급표만 입대일 폴백이 빠져 진급일을 안 고친
 * 사용자에겐 현재 계급 강조가 사라졌다.
 */
export function currentRankLabel(info, promotions) {
  if (!info) return null;
  // 간부: 진급 이력(v1.6)에서 오늘까지 도달한 마지막 계급 → 없으면 직접 고른 계급
  if (isOfficer(info.personnelType)) return cadreCurrentRank(info) ?? info.officerRank ?? personnelLabel(info.personnelType);
  // 대체복무는 계급이 없다 — 신분(세부 유형) 이름을 계급 자리에 쓴다
  if (isAlternative(info.personnelType)) return serviceLabel(info);
  return calcRankFromPromotions(promotions) ?? calcRankByEnlistDate(info.enlistDate);
}

/* ─── 간부 진급 이력 · 복무연장 (v1.6) ──────────────────────────────────
 * 둘 다 militaryInfo 안에 산다 (officerPromotions / extensions). 구버전 앱은 모르는
 * 필드를 무시하고, mi.months 는 늘 '연장을 합친 총 개월'이라 전역일·공유 코드가
 * 구버전과 똑같이 계산된다.
 */

/** 유효한 간부 진급 기록만, 날짜 오름차순. allowedRanks 를 주면 그 계급만 남긴다. */
export function validOfficerPromotions(info, allowedRanks) {
  const list = Array.isArray(info?.officerPromotions) ? info.officerPromotions : [];
  return list
    .filter((p) => p && typeof p.rank === 'string' && p.rank && parseDate(p.date))
    .filter((p) => !allowedRanks || allowedRanks.includes(p.rank))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** 간부의 지금 계급 — 오늘까지 도달한 마지막 진급 기록 (없으면 null) */
export function cadreCurrentRank(info) {
  if (!info || !isOfficer(info.personnelType)) return null;
  const reached = validOfficerPromotions(info).filter((p) => calcDaysLeft(p.date) <= 0);
  return reached.length ? reached[reached.length - 1].rank : null;
}

/** 아직 오지 않은 가장 가까운 간부 진급 기록 (없으면 null) */
export function nextCadrePromotion(info) {
  if (!info || !isOfficer(info.personnelType)) return null;
  const next = validOfficerPromotions(info).find((p) => calcDaysLeft(p.date) > 0);
  return next ? { rank: next.rank, date: next.date, daysLeft: calcDaysLeft(next.date) } : null;
}

/** 유효한 복무연장 기록만 (1~120개월 정수), 결정일 오름차순 */
export function validExtensions(info) {
  const list = Array.isArray(info?.extensions) ? info.extensions : [];
  return list
    .filter((e) => e && Number.isInteger(e.months) && e.months >= 1 && e.months <= 120)
    .slice()
    .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')));
}

/** 연장으로 늘어난 개월 합 */
export function extensionMonths(info) {
  return validExtensions(info).reduce((n, e) => n + e.months, 0);
}

/** 연장 전 원래 복무개월 (mi.months 는 총합이다). 최소 1. */
export function baseServiceMonths(info) {
  const total = Number(info?.months);
  if (!Number.isFinite(total)) return null;
  return Math.max(1, total - extensionMonths(info));
}

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
  const ranks = hasSoldierRanks(info.personnelType);
  const t = termsFor(info.personnelType);
  const list = [];

  /* emoji 는 위젯·공유 텍스트용으로 남겨두고, 화면은 icon(Ionicons) 을 쓴다. */
  // 복무기간이 100일보다 짧으면 '입대 100일'과 '전역 100일 전'은 구간 밖으로
  // 벗어난다(전자는 전역 뒤, 후자는 입대 전). 정렬하면 타임라인이
  // 전역100일전 → 입대 → 전역 → 입대100일 순으로 뒤엉키므로 아예 넣지 않는다.
  // DischargeScreen 은 간부 복무개월을 1~240 으로 받으므로 실제로 가능한 입력이다.
  const totalDays = daySpan(info.enlistDate, info.dischargeDate);
  const showD100 = totalDays >= 100;

  list.push({ key: 'enlist', label: t.start, emoji: t.emoji, icon: 'flag', date: parseDate(info.enlistDate) });
  if (showD100) list.push({ key: 'd100in', label: `${t.start} 100일`, emoji: '💯', icon: 'calendar-number', date: addDays(info.enlistDate, 99) });

  if (ranks && promotions) {
    if (promotions.일병) list.push({ key: 'r1', label: '일병 진급', emoji: '🎖️', icon: 'chevron-up-circle', date: parseDate(promotions.일병) });
    if (promotions.상병) list.push({ key: 'r2', label: '상병 진급', emoji: '🎖️', icon: 'chevron-up-circle', date: parseDate(promotions.상병) });
    if (promotions.병장) list.push({ key: 'r3', label: '병장 진급', emoji: '👑', icon: 'star', date: parseDate(promotions.병장) });
  }

  // 간부 진급 기록 (v1.6) — 복무 구간 안의 것만. key 는 축하 이력에 남으니 계급명으로 고정.
  if (isOfficer(info.personnelType)) {
    const s0 = parseDate(info.enlistDate);
    const e0 = parseDate(info.dischargeDate);
    for (const p of validOfficerPromotions(info)) {
      const d = parseDate(p.date);
      if (d < s0 || d > e0) continue;
      list.push({ key: `op:${p.rank}`, label: `${p.rank} 진급`, emoji: '🎖️', icon: 'chevron-up-circle', date: d });
    }
  }

  list.push({ key: 'half', label: '반환점 (복무 절반)', emoji: '⚖️', icon: 'hourglass', date: midpoint(info.enlistDate, info.dischargeDate) });
  if (showD100) list.push({ key: 'd100out', label: `${t.end} 100일 전`, emoji: '🔥', icon: 'flame', date: addDays(info.dischargeDate, -100) });
  list.push({ key: 'discharge', label: t.end, emoji: '🎉', icon: 'trophy', date: parseDate(info.dischargeDate) });

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
