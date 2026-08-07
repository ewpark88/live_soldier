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
 *   - gradient / accent / glow : 히어로 표면. 브랜드 표면이라 light·dark 공통.
 *   - bg : 히어로 뒤 화면 배경의 미세 틴트 (scheme 별).
 * 아이콘·문구·불티 밀도는 색이 아니므로 `src/constants/phases.js` 가 갖는다.
 */

/** light·dark 공통 히어로 단계 색 (포레스트) */
const forestStages = {
  normal: { gradient: ['#2A5C50', '#1A3E36'], accent: '#F0C45E', glow: false },
  d100: { gradient: ['#2A5C50', '#183A32'], accent: '#F0C45E', glow: false },
  d30: { gradient: ['#27584C', '#16362F'], accent: '#F4C04A', glow: false },
  d7: { gradient: ['#245043', '#12302A'], accent: '#F7C53C', glow: true },
  d3: { gradient: ['#204A3F', '#0F2B25'], accent: '#FFCF45', glow: true },
  done: { gradient: ['#1E4A3F', '#0D2721'], accent: '#FFD24A', glow: true },
};

/** 단계별 화면 배경 틴트를 공통 stage 색에 합쳐 phase 맵을 만든다 */
function withBg(bgs) {
  const out = {};
  for (const key of Object.keys(forestStages)) {
    out[key] = { ...forestStages[key], bg: bgs[key] };
  }
  return out;
}

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

  // ── 히어로 (브랜드 표면) ──────────────────────────────────────
  // 라이트/다크 양쪽 모두 딥그린이다. 브랜드 표면이라 테마 분기가 없다.
  heroFrom: '#2E6455',
  heroTo: '#173B33',
  heroText: '#F2F7F5',
  heroTextMuted: 'rgba(242,247,245,0.72)',
  heroBorder: 'rgba(255,255,255,0.10)',
  heroSheen: 'rgba(255,255,255,0.12)',
  heroTrack: 'rgba(255,255,255,0.16)',

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

  phase: withBg({
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

  phase: withBg({
    normal: '#0D1412',
    d100: '#111512',
    d30: '#151510',
    d7: '#1A1410',
    d3: '#1E1610',
    done: '#221A12',
  }),
};
