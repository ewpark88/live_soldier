/**
 * 막대병 도감 카탈로그 — 순수 데이터 (런타임 라이브러리 import 금지).
 *
 * 홈 링 안에서 달리는 캐릭터의 모습들이다. '졸라맨'은 상표 문제가 있을 수 있어
 * 앱 안에서는 **막대병**(막대 + 병사)이라 부른다.
 *
 * 동작·장비는 `components/motion/soldierRig.js` 의 RIGS 가 같은 id 로 갖는다.
 * id 는 저장소(@soldier_skins_v1)·백업에 남으므로 **바꾸거나 지우지 않는다** —
 * 순서만 바꿀 수 있다. 새 모습은 끝에 추가한다.
 *
 * free  — 광고 없이 처음부터 열려 있다.
 */
export const SOLDIER_SKINS = [
  { id: 'run',    name: '전력질주 막대병', emoji: '🏃', free: true, desc: '전역을 향해 쉬지 않고 달린다. 모든 막대병의 시작.' },
  { id: 'march',  name: '완전군장 행군',   emoji: '🎒', desc: '헬멧 쓰고 군장 메고 한 걸음씩. 오늘도 행군은 계속된다.' },
  { id: 'mess',   name: '배식 가는 길',    emoji: '🍱', desc: '전투모 눌러쓰고 식판 들고 식당으로. 군생활의 낙.' },
  { id: 'shoot',  name: '사격 훈련',       emoji: '🎯', desc: '서서쏴 자세로 탕! 영점은 이미 잡았다.' },
  { id: 'salute', name: '충성! 경례',      emoji: '🫡', desc: '각 잡힌 거수경례. 지나가던 간부도 흐뭇하다.' },
  { id: 'dig',    name: '삽질 작업',       emoji: '⛏️', desc: '파고 덮고 또 판다. 작업은 끝나지 않는다.' },
  { id: 'pushup', name: '팔굽혀펴기',      emoji: '💪', desc: '하나에 하나, 둘에 둘. 체력검정 특급을 향해.' },
  { id: 'sweep',  name: '청소 시간',       emoji: '🧹', desc: '생활관은 내가 지킨다. 먼지 한 톨 없이.' },
  { id: 'flag',   name: '깃발 구보',       emoji: '🚩', desc: '부대기를 높이 들고 선두에서 달린다.' },
  { id: 'leave',  name: '휴가 출발!',      emoji: '🧳', desc: '더플백 들고 위병소를 지나 집으로. 제일 신나는 순간.' },
];

export const DEFAULT_SKIN = 'run';
export const SKIN_IDS = SOLDIER_SKINS.map((s) => s.id);
export const FREE_SKINS = SOLDIER_SKINS.filter((s) => s.free).map((s) => s.id);

export function skinById(id) {
  return SOLDIER_SKINS.find((s) => s.id === id) || SOLDIER_SKINS[0];
}
