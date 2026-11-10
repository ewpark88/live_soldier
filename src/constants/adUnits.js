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
const TEST_REWARDED_INTERSTITIAL =
  (TestIds && TestIds.REWARDED_INTERSTITIAL) || 'ca-app-pub-3940256099942544/5354046379';

/*
 * 배정 원칙 (v1.5.1): 새 광고 단위는 만들지 않고 이미 발급된 것만 쓴다.
 * 발급만 되고 안 쓰이던 단위(전역 중간·휴가 중간·일정 중간·일정 하단)를 노출이 많은
 * 화면(설정·가족 공유·도감·적금)에 옮겨 붙였다. realId 는 AdMob 콘솔의 단위 그대로라
 * 콘솔의 단위 이름은 옛 이름일 수 있다 — 리포트를 볼 땐 아래 '콘솔 이름'을 참고.
 * 참고 화면(월급표·간부 봉급·혜택·테마·알림 설정)은 SALARY_MIDDLE 하나를 같이 쓴다.
 */
export const AD_UNITS = {
  // ── 배너 광고 (Banner) — 화면당 하나, <Screen ad> 푸터에만 ──────────
  HOME_BOTTOM: {
    id: 'home_bottom_banner',
    label: '홈 · 하단',
    realId: 'ca-app-pub-8353634332299342/9197314884',
  },
  SETTINGS_BOTTOM: {
    id: 'settings_bottom_banner',
    label: '내 정보(설정) · 하단',      // 콘솔 이름: 전역 · 입력폼/결과 사이
    realId: 'ca-app-pub-8353634332299342/8323825721',
  },
  ROADMAP_BOTTOM: {
    id: 'roadmap_bottom_banner',
    label: '전역로드맵 · 하단',          // 콘솔 이름: 홈 · 메인카드 하단
    realId: 'ca-app-pub-8353634332299342/1949989068',
  },
  SHARE_BOTTOM: {
    id: 'share_bottom_banner',
    label: '가족 공유 · 하단',           // 콘솔 이름: 휴가 · 리스트 중간
    realId: 'ca-app-pub-8353634332299342/4935245050',
  },
  DEX_BOTTOM: {
    id: 'dex_bottom_banner',
    label: '막대병 도감 · 하단',         // 콘솔 이름: 일정 · 그룹 사이
    realId: 'ca-app-pub-8353634332299342/8378011059',
  },
  SAVINGS_BOTTOM: {
    id: 'savings_bottom_banner',
    label: '장병내일적금 · 하단',        // 콘솔 이름: 일정 · 하단
    realId: 'ca-app-pub-8353634332299342/7884233215',
  },
  DISCHARGE_BOTTOM: {
    id: 'discharge_bottom_banner',
    label: '전역 정보 · 하단',
    realId: 'ca-app-pub-8353634332299342/5921023668',
  },
  CALENDAR_BOTTOM: {
    id: 'calendar_bottom_banner',
    label: '캘린더 탭 · 하단 (달력·휴가·일정 공용)',   // 콘솔 이름: 휴가 · 하단
    realId: 'ca-app-pub-8353634332299342/3622163389',
  },
  SALARY_BOTTOM: {
    id: 'salary_bottom_banner',
    label: '급여 탭 · 하단',
    realId: 'ca-app-pub-8353634332299342/3318911055',
  },
  REFERENCE_BOTTOM: {
    id: 'reference_bottom_banner',
    label: '참고 화면 공용 · 하단 (월급표·간부 봉급·혜택·테마·알림 설정)',  // 콘솔 이름: 급여 · 월급표 하단
    realId: 'ca-app-pub-8353634332299342/7010744050',
  },

  // ── 전면 광고 (Interstitial) ────────────────────────────────────
  // '주요 저장' 직후에만 뜬다 (전역 정보·휴가·할 일·급여). 탭 전환·앱 실행에서는 절대 안 띄운다.
  INTERSTITIAL_SAVE: {
    id: 'interstitial_after_save',
    label: '전면 · 주요 저장 직후',     // 콘솔 이름: 전면 · 탭 전환 (이름만 옛것)
    realId: 'ca-app-pub-8353634332299342/1046315947',
  },

  // ── 보상형 전면 광고 (Rewarded Interstitial) ───────────────────
  // 막대병 도감에서 사용자가 [광고 보고 받기]를 눌렀을 때만 뜬다 (utils/rewardedManager.js)
  REWARDED_SKIN: {
    id: 'rewarded_skin_unlock',
    label: '보상형 전면 · 막대병 해금',
    realId: 'ca-app-pub-8353634332299342/1414955683',
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
  if (kind === 'interstitial') return TEST_INTERSTITIAL;
  if (kind === 'rewardedInterstitial') return TEST_REWARDED_INTERSTITIAL;
  return TEST_BANNER;
}
