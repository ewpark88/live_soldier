/**
 * 기본 팔레트 (포레스트) — 모든 테마의 구조 기준.
 *
 * 테마 파일은 이 위에 "부분 오버라이드"만 얹는다. 머지 결과는 항상 전 키가
 * 채워져 있으므로 undefined 색이 스타일에 흘러들 수 없다.
 *
 * ⚠️ 하드 룰: 이 디렉터리(`src/theme/palettes/*`)의 파일은 런타임 라이브러리를
 *    import 하지 않는다. `src/theme/tokens.js` 와 같은 등급의 규칙이고, 이유가
 *    둘이다.
 *      1) `src/widget/*` 가 이 레지스트리를 읽는다. react-native 심볼이 하나라도
 *         딸려 들어가면 위젯 헤드리스 런타임이 죽는다.
 *      2) `scripts/check-contrast.js` 가 맨 Node 에서 이 파일들을 실행한다.
 *    형제 팔레트 파일끼리의 import(= index.js 가 테마들을 모으는 것)만 허용.
 *
 * `phase` 는 카운트다운 단계별 히어로 색이다.
 *   - gradient / accent / glow : 히어로 표면. **scheme 별로 다르다** (아래 참고).
 *   - bg : 히어로 뒤 화면 배경의 미세 틴트 (scheme 별).
 * 아이콘·문구·불티 밀도는 색이 아니므로 `src/constants/phases.js` 가 갖는다.
 *
 * v1.1 까지는 히어로가 "브랜드 표면이라 scheme 분기가 없다"며 라이트에서도 딥그린
 * 이었다. 그런데 히어로는 홈 첫 화면의 62% 를 차지한다 — 라이트 모드로 바꿔도
 * 화면 대부분이 어두우니 라이트 모드가 사실상 없는 것과 같았다. v1.2 부터
 * 라이트 스킴의 히어로는 **밝은 표면 + 어두운 D-Day 숫자**로 뒤집는다.
 * 그래서 heroText / heroTextMuted / heroTrack / gaugeEdge 도 함께 뒤집힌다
 * (히어로 위 컴포넌트는 전부 이 토큰들만 쓰므로 자동으로 따라온다).
 */

/** 라이트 히어로 단계 색 — 밝은 그라데이션 위에 어두운 고채도 숫자 */
const forestStagesLight = {
  normal: { gradient: ['#96DCBC', '#CDEBA6'], accent: '#0C573D', glow: false },
  d100: { gradient: ['#9FE0BE', '#D6EFA8'], accent: '#0E5A38', glow: false },
  d30: { gradient: ['#B4E6B4', '#E4F0A0'], accent: '#345E0B', glow: false },
  d7: { gradient: ['#CFEBA6', '#F5E692'], accent: '#675700', glow: true },
  d3: { gradient: ['#E4EE9A', '#FFD98A'], accent: '#7D4B00', glow: true },
  done: { gradient: ['#FFE08A', '#FFBE7A'], accent: '#7D3400', glow: true },
};

/** 다크 히어로 단계 색 */
const forestStagesDark = {
  // accent 는 4.62~4.83 로 4.5 턱걸이였다 — 시간대 워시가 한 겹만 얹혀도 바로
  // 무너져서 여유를 두고 밝혔다 (검사는 워시 합성 후에도 통과해야 한다).
  normal: { gradient: ['#2A5C50', '#1A3E36'], accent: '#F5D68E', glow: false },
  d100: { gradient: ['#2A5C50', '#183A32'], accent: '#F5D68E', glow: false },
  d30: { gradient: ['#27584C', '#16362F'], accent: '#F6CE71', glow: false },
  d7: { gradient: ['#245043', '#12302A'], accent: '#F7C53C', glow: true },
  d3: { gradient: ['#204A3F', '#0F2B25'], accent: '#FFCF45', glow: true },
  done: { gradient: ['#1E4A3F', '#0D2721'], accent: '#FFD24A', glow: true },
};

/** 단계별 화면 배경 틴트를 stage 색에 합쳐 phase 맵을 만든다 */
function withBg(stages, bgs) {
  const out = {};
  for (const key of Object.keys(stages)) {
    out[key] = { ...stages[key], bg: bgs[key] };
  }
  return out;
}

/**
 * 시간대 광원 — 히어로 그라데이션 위에 얹는 알파 워시 한 겹.
 *
 * "살아있는 배경"의 색도 팔레트가 소유한다. 테마별 분기는 없고 scheme 별로만
 * 다르다 (라이트는 덧칠, 다크는 그을림). 여기 값을 바꾸면
 * `npm run theme:check` 가 **워시를 합성한 뒤의** 그라데이션 위에서 D-Day 숫자
 * 대비를 다시 검사한다 — 아무 색이나 넣을 수 없다.
 */
export const DAYPARTS = ['dawn', 'morning', 'noon', 'dusk', 'night'];

export const DAYPART_WASH = {
  light: {
    dawn: 'rgba(118,140,255,0.08)',
    morning: 'rgba(255,255,255,0.08)',
    noon: 'rgba(255,255,255,0.00)',
    dusk: 'rgba(255,168,88,0.09)',
    night: 'rgba(44,54,112,0.08)',
  },
  dark: {
    dawn: 'rgba(92,120,255,0.08)',
    morning: 'rgba(255,228,188,0.05)',
    noon: 'rgba(255,255,255,0.04)',
    dusk: 'rgba(255,140,70,0.08)',
    night: 'rgba(0,0,20,0.10)',
  },
};

export const baseLight = {
  primary: '#234E44',        // 깊고 차분한 포레스트 그린 (로고와 통일)
  primaryLight: '#3F8170',
  primaryDark: '#15352D',
  accent: '#D99A2B',         // 메탈릭 골드 (로고 별과 동일 계열)
  accentLight: '#F0C45E',
  background: '#F5F7F6',
  card: '#FFFFFF',
  text: '#15231E',
  textSecondary: '#5C726C',
  textLight: '#879792',
  border: '#E6ECEA',
  success: '#177D54',
  warning: '#996226',
  danger: '#B6453C',
  white: '#FFFFFF',
  adBackground: '#EEF2F1',
  adBorder: '#DCE5E2',
  tabActive: '#234E44',
  tabInactive: '#879792',
  progressBg: '#E6ECEA',
  progressFill: '#234E44',
  shadow: '#1B3F37',
  highlightBg: '#EAF3EF',
  overlay: 'rgba(12,22,18,0.5)',

  // ── 대비 보장 ────────────────────────────────────────────────
  // primary 위에 얹는 글자색. 다크에서 primary 는 밝은 민트라 흰 글자를 쓰면
  // 읽을 수 없다. 버튼은 반드시 이 값을 쓴다.
  onPrimary: '#FFFFFF',
  // Button danger 의 글자색. 예전엔 흰색 하드코딩이라 3.66:1 밖에 안 나왔다.
  onDanger: '#FFFFFF',

  // ── 히어로 (밝은 표면) ────────────────────────────────────────
  // 라이트에서는 히어로가 밝다. 그 위의 글자·트랙은 전부 어두워진다.
  heroFrom: '#8FD9B8',
  heroTo: '#C9E9A0',
  heroText: '#0C3A28',
  heroTextMuted: 'rgba(12,58,40,0.72)',
  heroBorder: 'rgba(0,0,0,0.08)',
  // 히어로 위의 칩·타일 배경이기도 하다. 밝은 표면 위라 흰색을 진하게 쓴다.
  heroSheen: 'rgba(255,255,255,0.55)',
  heroTrack: 'rgba(0,0,0,0.14)',
  // 게이지의 광택·선단 하이라이트. 밝은 표면 위에서는 흰 반사가 보이지 않으므로
  // 라이트에서는 반대로 '그림자'가 빛의 역할을 한다.
  gaugeShimmer: 'rgba(255,255,255,0.75)',
  gaugeEdge: 'rgba(12,58,40,0.55)',

  // ── 메탈릭 골드 ──────────────────────────────────────────────
  goldFrom: '#F0C45E',
  goldTo: '#C9861B',
  onGold: '#3A2705',

  // ── 소프트 표면 (하드코딩 색을 흡수한다) ──────────────────────
  primarySoft: '#E8F1EE',
  accentSoft: '#FDF3DF',
  accentText: '#7A4800',
  successSoft: '#E4F5EE',
  warningSoft: '#FDF0E1',
  dangerSoft: '#FCE9E7',
  surfaceSunken: '#EFF3F1',
  surfaceSunkenBorder: '#DFE7E4',
  cardElevated: '#FFFFFF',
  skeleton: '#E6ECEA',
  shadowStrong: '#0B211B',

  // 달력 주말
  sat: '#3B72C4',
  sun: '#D8483E',

  // 모달 딤 — 기존 overlay 와 같은 값. 신규 코드는 scrim 을 쓴다.
  scrim: 'rgba(12,22,18,0.5)',
  scrimStrong: 'rgba(12,22,18,0.7)',

  phase: withBg(forestStagesLight, {
    normal: '#F5F7F6',
    d100: '#F4F6EE',
    d30: '#FAF4E8',
    d7: '#FDF0E3',
    d3: '#FDECDC',
    done: '#FBEBD4',
  }),
};

export const baseDark = {
  primary: '#5FB09B',
  primaryLight: '#74C2AE',
  primaryDark: '#3E7A6B',
  accent: '#E8B24A',
  accentLight: '#F2C46B',
  background: '#0D1412',
  card: '#171F1C',
  text: '#EAF1EF',
  textSecondary: '#9FB6AF',
  textLight: '#6A827B',
  border: '#28332F',
  success: '#2DB67D',
  warning: '#E8943A',
  danger: '#E6665D',
  white: '#FFFFFF',
  adBackground: '#171F1C',
  adBorder: '#28332F',
  tabActive: '#74C2AE',
  tabInactive: '#6A827B',
  progressBg: '#28332F',
  progressFill: '#5FB09B',
  shadow: '#000000',
  highlightBg: '#1B2723',
  overlay: 'rgba(0,0,0,0.6)',

  // 다크에서 primary 는 밝은 민트다. 그 위엔 어두운 글자를 얹어야 읽힌다.
  onPrimary: '#08120F',
  onDanger: '#242424',

  heroFrom: '#22564A',
  heroTo: '#12312A',
  heroText: '#EAF1EF',
  heroTextMuted: 'rgba(234,241,239,0.68)',
  heroBorder: 'rgba(255,255,255,0.08)',
  heroSheen: 'rgba(255,255,255,0.10)',
  heroTrack: 'rgba(255,255,255,0.16)',
  gaugeShimmer: 'rgba(255,255,255,0.50)',
  gaugeEdge: 'rgba(255,255,255,0.78)',

  goldFrom: '#F2C46B',
  goldTo: '#D08F22',
  onGold: '#2A1C03',

  primarySoft: '#17302A',
  accentSoft: '#2C2415',
  accentText: '#F0C45E',
  successSoft: '#12332A',
  warningSoft: '#33291A',
  dangerSoft: '#39211F',
  surfaceSunken: '#101917',
  surfaceSunkenBorder: '#28332F',
  cardElevated: '#1D2724',
  skeleton: '#222D29',
  shadowStrong: '#000000',

  sat: '#7FA8E8',
  sun: '#E8776D',

  scrim: 'rgba(0,0,0,0.6)',
  scrimStrong: 'rgba(0,0,0,0.78)',

  phase: withBg(forestStagesDark, {
    normal: '#0D1412',
    d100: '#111512',
    d30: '#151510',
    d7: '#1A1410',
    d3: '#1E1610',
    done: '#221A12',
  }),
};
