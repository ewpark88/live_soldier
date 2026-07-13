/**
 * 디자인 토큰 — 간격 / 반경 / 타이포 / 모션 / 그림자.
 *
 * 이 파일은 의존성이 없는 순수 데이터로 유지한다.
 * src/widget/* 은 react-native-android-widget 런타임에서 도는데,
 * 거기로 Reanimated 같은 게 딸려 들어가면 위젯이 죽는다.
 */

/** 4pt 그리드 */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

/** 화면 좌우 여백 */
export const gutter = space.lg;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20, // Card 기본값
  xl: 28,
  pill: 999,
};

/**
 * 타이포 — 역할별 스케일.
 *
 * 모든 역할에 lineHeight 를 명시한다. 안드로이드는 lineHeight 가
 * fontSize * 1.3 보다 작으면 한글 받침을 잘라먹고, includeFontPadding 이
 * 위아래로 유령 여백을 넣어 큰 숫자가 시각적으로 어긋나 보인다.
 */
export const type = {
  display: { fontSize: 52, lineHeight: 58, fontWeight: '800', letterSpacing: -1.2, includeFontPadding: false },
  hero: { fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -0.8, includeFontPadding: false },
  title: { fontSize: 26, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 20, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  section: { fontSize: 17, lineHeight: 24, fontWeight: '800', letterSpacing: -0.2 },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '500' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 0.1 },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  micro: { fontSize: 11, lineHeight: 15, fontWeight: '600', letterSpacing: 0.2 },
  statValue: { fontSize: 24, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4, includeFontPadding: false },
  statLabel: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: -0.1 },
  buttonSm: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
};

/** 카운트업 등 숫자가 변하는 텍스트엔 반드시 붙인다 (안 그러면 폭이 떨린다) */
export const tabular = { fontVariant: ['tabular-nums'] };

export const motion = {
  duration: {
    instant: 120,
    fast: 180,
    base: 260,
    slow: 420,
    hero: 520,
    fill: 900,
    count: 1200,
  },
  /** 리스트 진입 지연 스텝. 6개를 넘겨 쌓지 않는다 (그 이상은 느리게 느껴진다) */
  stagger: 60,
  staggerMax: 6,
  bezier: {
    standard: [0.22, 1, 0.36, 1], // 진입 기본
    emphasis: [0.16, 1, 0.3, 1], // 히어로 / 큰 숫자 / 바
    exit: [0.4, 0, 1, 1], // 퇴장 전용
  },
  spring: {
    press: { damping: 18, stiffness: 320, mass: 0.6 }, // 튐 없음
    pop: { damping: 12, stiffness: 260, mass: 0.8 }, // 살짝 오버슛
    celebrate: { damping: 8, stiffness: 180, mass: 0.9 }, // 일회성만, 루프 금지
    layout: { damping: 20, stiffness: 200 },
  },
  press: { scale: 0.97 },
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
};

/** 그림자는 색이 테마에 의존하므로 팩토리로 만든다 */
export const elev = (tc) => ({
  none: {},
  sm: {
    shadowColor: tc.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: tc.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  lg: {
    shadowColor: tc.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
  hero: {
    shadowColor: tc.shadowStrong,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 12,
  },
});
