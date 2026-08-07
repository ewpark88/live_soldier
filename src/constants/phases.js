/**
 * 복무 단계 (countdown phase) — 색이 아닌 "의미"만 담는다.
 *
 * 색(gradient/accent/glow)은 테마 팔레트가 소유한다: `tc.phase[stage]`.
 * 여기엔 아이콘·문구·불티 밀도처럼 테마가 바뀌어도 그대로인 것만 둔다.
 *
 * 화면 밖으로 뺀 이유: 예전엔 HomeScreen 안에 getPhase 가 박혀 있어서
 * 로드맵·알림·위젯이 각자 다른 기준으로 단계를 판정할 수밖에 없었다.
 */

/** 남은 일수 → 단계 키 */
export function getPhase(daysLeft) {
  if (daysLeft <= 0) return 'done';
  if (daysLeft <= 3) return 'd3';
  if (daysLeft <= 7) return 'd7';
  if (daysLeft <= 30) return 'd30';
  if (daysLeft <= 100) return 'd100';
  return 'normal';
}

/** 진행 순서 (먼 쪽 → 가까운 쪽). 테마 팔레트 정의 순서와 맞춘다. */
export const PHASE_ORDER = ['normal', 'd100', 'd30', 'd7', 'd3', 'done'];

/**
 * 단계별 연출 메타.
 *  - icon/text: 히어로 상단 마일스톤 칩. 없으면 칩을 안 그린다.
 *  - embers: 불티 밀도. null | 'normal' | 'dense'
 */
export const PHASE_META = {
  done: { icon: 'trophy', text: '드디어 전역이다!!', embers: 'dense' },
  d3: { icon: 'ribbon', text: '전역 3일 전!! 거의 다 왔다!', embers: 'normal' },
  d7: { icon: 'trophy-outline', text: '전역까지 일주일!', embers: null },
  d30: { icon: 'flame', text: '전역 한 달 전! 조금만 더!', embers: null },
  d100: { icon: 'barbell', text: '전역 100일 전! 보인다!', embers: null },
  normal: { icon: null, text: null, embers: null },
};
