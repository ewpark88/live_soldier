/**
 * AdMob 광고 단위 ID
 * App ID: ca-app-pub-8353634332299342~7516567553  (Android)
 *
 * ⚠️ 안드로이드 단독 출시다. 아래 realId 는 전부 Android 광고 단위이고,
 *    app.json 의 iOS googleMobileAdsAppId 에도 Android 앱 ID 가 들어가 있다.
 *    iOS 를 내려면 AdMob 콘솔에서 iOS 용을 따로 발급받아 Platform.select 로 나눠야 한다.
 *
 * 광고 ID 는 반드시 getAdUnitId() 를 거쳐 쓴다 — 개발 빌드에서 실제 광고를 띄우면
 * AdMob 이 무효 트래픽으로 보고 계정을 정지시킬 수 있다.
 */

// Expo Go 에는 네이티브 모듈이 없으므로 감싸서 가져온다
let TestIds = null;
try {
  TestIds = require('react-native-google-mobile-ads').TestIds;
} catch (e) {
  // Expo Go 환경
}

// SDK 를 못 불러와도 개발 중에는 절대 실제 ID 로 떨어지지 않게 상수로 대비
const TEST_BANNER       = (TestIds && TestIds.BANNER)       || 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL  = (TestIds && TestIds.INTERSTITIAL) || 'ca-app-pub-3940256099942544/1033173712';

export const AD_UNITS = {
  // ── 배너 광고 (Banner) ──────────────────────────────────────────
  HOME_TOP: {
    id: 'home_top_banner',
    label: '홈 · 메인카드 하단',
    realId: 'ca-app-pub-8353634332299342/1949989068',
  },
  HOME_BOTTOM: {
    id: 'home_bottom_banner',
    label: '홈 · 화면 하단',
    realId: 'ca-app-pub-8353634332299342/9197314884',
  },
  ROADMAP_BOTTOM: {
    id: 'roadmap_bottom_banner',
    label: '전역로드맵 · 하단',
    // 전용 광고 단위 발급 전까지 미사용 단위(홈 상단) 재활용
    realId: 'ca-app-pub-8353634332299342/1949989068',
  },
  DISCHARGE_MIDDLE: {
    id: 'discharge_middle_banner',
    label: '전역 · 입력폼/결과 사이',
    realId: 'ca-app-pub-8353634332299342/8323825721',
  },
  DISCHARGE_BOTTOM: {
    id: 'discharge_bottom_banner',
    label: '전역 · 통계 하단',
    realId: 'ca-app-pub-8353634332299342/5921023668',
  },
  LEAVE_MIDDLE: {
    id: 'leave_middle_banner',
    label: '휴가 · 리스트 중간',
    realId: 'ca-app-pub-8353634332299342/4935245050',
  },
  LEAVE_BOTTOM: {
    id: 'leave_bottom_banner',
    label: '휴가 · 하단',
    realId: 'ca-app-pub-8353634332299342/3622163389',
  },
  SALARY_MIDDLE: {
    id: 'salary_middle_banner',
    label: '급여 · 월급표 하단',
    realId: 'ca-app-pub-8353634332299342/7010744050',
  },
  SALARY_BOTTOM: {
    id: 'salary_bottom_banner',
    label: '급여 · 하단',
    realId: 'ca-app-pub-8353634332299342/3318911055',
  },
  TODO_MIDDLE: {
    id: 'todo_middle_banner',
    label: '일정 · 그룹 사이',
    realId: 'ca-app-pub-8353634332299342/8378011059',
  },
  TODO_BOTTOM: {
    id: 'todo_bottom_banner',
    label: '일정 · 하단',
    realId: 'ca-app-pub-8353634332299342/7884233215',
  },

  // ── 전면 광고 (Interstitial) ────────────────────────────────────
  INTERSTITIAL_TAB: {
    id: 'interstitial_tab_switch',
    label: '전면 · 탭 전환',
    realId: 'ca-app-pub-8353634332299342/1046315947',
  },
};

export const APP_ID = 'ca-app-pub-8353634332299342~7516567553';

/**
 * 실제 요청에 쓸 광고 단위 ID.
 * 개발 빌드(__DEV__)에서는 Google 공식 테스트 ID 를 돌려준다.
 * 광고 단위가 없으면 null — 호출부는 null 이면 렌더링하지 않는다.
 */
export function getAdUnitId(unit, kind = 'banner') {
  if (!unit || !unit.realId) return null;
  if (!__DEV__) return unit.realId;
  return kind === 'interstitial' ? TEST_INTERSTITIAL : TEST_BANNER;
}
