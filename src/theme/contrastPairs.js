/**
 * 대비 검증 페어 표 — `scripts/check-contrast.js` 가 읽는다.
 *
 * ⚠️ 이 파일도 팔레트와 동급으로 import 0 개다 (맨 Node 에서 실행됨).
 *
 * 경로 표기: 팔레트 키의 점 경로. 그라데이션 끝 색은 `@last` 로 가리킨다.
 *   예) 'phase.d7.gradient.@last'
 *
 * 최소 비 기준
 *  4.5 — 정보를 담은 글자. ty.button(16/700)·ty.micro(11) 같은 작은 글자가
 *        얹히므로 large-text 완화(3.0)를 쓰지 않는다.
 *  7.0 — 본문 (AAA)
 *  3.0 — 장식·비활성·아이콘. 정보를 담지 않는 것만.
 */

/** 모든 테마 × scheme 에 적용되는 페어 */
export const CONTRAST_PAIRS = [
  // 버튼 — 이 둘이 깨지면 버튼 글자가 안 보인다
  { fg: 'onPrimary', bg: 'primary', min: 4.5, label: 'Button primary' },
  { fg: 'onGold', bg: 'goldFrom', min: 4.5, label: 'Button accent (그라데이션 시작)' },
  { fg: 'onGold', bg: 'goldTo', min: 4.5, label: 'Button accent (그라데이션 끝)' },

  // 본문
  { fg: 'text', bg: 'background', min: 7.0, label: '본문 / 화면 배경' },
  { fg: 'text', bg: 'card', min: 7.0, label: '본문 / 카드' },
  { fg: 'textSecondary', bg: 'card', min: 4.5, label: '보조 텍스트' },
  { fg: 'textLight', bg: 'card', min: 3.0, label: '흐린 텍스트(장식)' },

  // 히어로 표면
  { fg: 'heroText', bg: 'heroFrom', min: 4.5, label: '히어로 텍스트 (상단)' },
  { fg: 'heroText', bg: 'heroTo', min: 4.5, label: '히어로 텍스트 (하단)' },
  { fg: 'heroTextMuted', bg: 'heroTo', min: 3.0, label: '히어로 보조 텍스트' },

  // 탭바 — ty.micro 11px 라 3.0 으로는 부족하다
  { fg: 'tabActive', bg: 'card', min: 4.5, label: '활성 탭 라벨' },
  { fg: 'tabInactive', bg: 'card', min: 3.0, label: '비활성 탭 라벨' },

  // Chip — 톤 색은 card 가 아니라 각자의 *Soft 위에 얹힌다 (ui/Chip.js TONE_BG)
  { fg: 'accentText', bg: 'accentSoft', min: 4.5, label: 'Chip accent' },
  { fg: 'primary', bg: 'primarySoft', min: 4.5, label: 'Chip primary' },
  { fg: 'success', bg: 'successSoft', min: 4.5, label: 'Chip success' },
  { fg: 'danger', bg: 'dangerSoft', min: 4.5, label: 'Chip danger' },
  { fg: 'warning', bg: 'warningSoft', min: 4.5, label: 'warning 텍스트' },
  { fg: 'textSecondary', bg: 'surfaceSunken', min: 4.5, label: 'Chip neutral / 가라앉은 표면' },

  // StatTile·ListRow 의 accent 톤. 여기 없던 탓에 tc.accent(#D99A2B) 를 쓴
  // 라이트 테마 타일이 2.18:1 로 나가면서도 검사를 통과했다.
  { fg: 'accentText', bg: 'surfaceSunken', min: 4.5, label: 'StatTile accent 값' },
  { fg: 'primary', bg: 'surfaceSunken', min: 4.5, label: 'StatTile primary 값' },
  { fg: 'success', bg: 'surfaceSunken', min: 4.5, label: 'StatTile success 값' },
  { fg: 'danger', bg: 'surfaceSunken', min: 4.5, label: 'StatTile danger 값' },

  // 솔리드 위 글자
  { fg: 'onDanger', bg: 'danger', min: 4.5, label: 'Button danger' },
  { fg: 'primary', bg: 'card', min: 3.0, label: 'primary 아이콘' },
];

/**
 * 단계별 페어 — 각 stage 에 대해 전개된다.
 * 히어로 D-Day 숫자가 phase.accent 색이고 배경은 그라데이션 끝 색이다.
 */
export const PHASE_STAGES = ['normal', 'd100', 'd30', 'd7', 'd3', 'done'];

export const PHASE_PAIRS = [
  { fg: 'accent', bg: 'gradient.@last', min: 4.5, label: 'D-Day 숫자' },
  { fg: 'accent', bg: 'gradient.0', min: 4.5, label: 'D-Day 숫자 (그라데이션 시작)' },
];

/**
 * 유예 목록 — 비어 있어야 정상이다.
 *
 * v1.0.8 팔레트가 갖고 있던 대비 부채 10건은 멀티 테마 작업(P5)에서 상태색과
 * *Soft 표면을 재조율하며 전부 없앴다. Button danger 의 흰 글자 하드코딩도
 * `onDanger` 팔레트 키로 바뀌었다.
 *
 * 새 테마는 예외 없이 전 페어를 통과해야 한다. 여기에 항목을 추가하려면
 * 반드시 사유와 정리 시점을 함께 적는다.
 *
 * 키 형식: `${themeId}/${scheme}/${fg}|${bg}`
 */
export const KNOWN_ISSUES = {};
