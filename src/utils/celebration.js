/**
 * 마일스톤 축하 판정.
 *
 * 이 파일의 존재 이유는 오탐 방지다. 두 겹으로 막는다.
 *
 *  1) celebrated == null (최초 실행 / 신규 프로필)
 *     → 이미 지난 마일스톤을 전부 "조용히" 마킹만 하고 아무것도 띄우지 않는다.
 *       이게 없으면 8개월 전에 일병 단 기존 사용자가 업데이트 직후 축하 팝업을
 *       맞는다.
 *
 *  2) dday 창 [-2, 0]
 *     → 방금 도달한 것만 축하한다. 입대일을 수정해서 날짜가 뒤로 밀리는 경우
 *       (DischargeScreen 저장)에도 재축하가 구조적으로 불가능해진다.
 *
 * 여러 개가 한꺼번에 신선해도 하나만 보여준다 — 팝업을 연달아 띄우는 건
 * 축하가 아니라 방해다.
 */

export const CELEBRATE_WINDOW = -2;

/**
 * @param {Array}  roadmap     buildRoadmap 결과
 * @param {Array|null} celebrated  저장된 축하 이력 (null = 미시딩)
 * @returns {{ seed: string[], show: object|null }}
 *   seed: 즉시 마킹해야 할 key 목록 (보여주든 안 보여주든)
 *   show: 실제로 띄울 마일스톤 (없으면 null)
 */
export function dueMilestone(roadmap, celebrated) {
  if (!Array.isArray(roadmap) || !roadmap.length) return { seed: [], show: null };

  const done = roadmap.filter((m) => m.done);

  // 최초 실행 / 신규 프로필 — 과거를 통째로 흡수하고 조용히 넘어간다
  if (celebrated == null) {
    return { seed: done.map((m) => m.key), show: null };
  }

  const fresh = done.filter((m) => !celebrated.includes(m.key));
  if (!fresh.length) return { seed: [], show: null };

  const show = fresh.filter((m) => m.dday >= CELEBRATE_WINDOW && m.dday <= 0).pop() ?? null;
  return { seed: fresh.map((m) => m.key), show };
}

/** 이 마일스톤으로 열리는 테마 (없으면 null) */
export function unlockedBy(milestoneKey, themes) {
  if (!milestoneKey || !themes) return null;
  return themes.find(
    (t) => t.lock && (t.lock.key === milestoneKey || t.lock.altKey === milestoneKey)
  ) ?? null;
}
