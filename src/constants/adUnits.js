/**
 * 광고 단위 정의
 * - 각 위치마다 독립된 Ad Unit ID 사용 (구글 정책 필수)
 * - 실제 배포 시 AdMob 콘솔에서 발급받은 ID로 교체
 *
 * AdMob 콘솔: https://admob.google.com
 * 테스트 ID (개발 중 사용):
 *   Banner     → ca-app-pub-3940256099942544/6300978111
 *   Interstitial → ca-app-pub-3940256099942544/1033173712
 */

const IS_ANDROID = true; // Platform.OS === 'android' 로 교체

export const AD_UNITS = {
  // ── 배너 광고 ─────────────────────────────────────────────────
  HOME_TOP: {
    id: 'home_top_banner',
    label: '홈 · 메인카드 하단',
    // realId: IS_ANDROID ? 'ca-app-pub-XXXX/YYYY_home_top' : 'ca-app-pub-XXXX/YYYY_ios_home_top',
    testId: 'ca-app-pub-3940256099942544/6300978111',
  },
  HOME_BOTTOM: {
    id: 'home_bottom_banner',
    label: '홈 · 화면 하단',
    // realId: IS_ANDROID ? 'ca-app-pub-XXXX/YYYY_home_bottom' : 'ca-app-pub-XXXX/YYYY_ios_home_bottom',
    testId: 'ca-app-pub-3940256099942544/6300978111',
  },
  DISCHARGE_MIDDLE: {
    id: 'discharge_middle_banner',
    label: '전역 · 입력폼/결과 사이',
    // realId: IS_ANDROID ? 'ca-app-pub-XXXX/YYYY_discharge_mid' : 'ca-app-pub-XXXX/YYYY_ios_discharge_mid',
    testId: 'ca-app-pub-3940256099942544/6300978111',
  },
  DISCHARGE_BOTTOM: {
    id: 'discharge_bottom_banner',
    label: '전역 · 통계 하단',
    // realId: IS_ANDROID ? 'ca-app-pub-XXXX/YYYY_discharge_bot' : 'ca-app-pub-XXXX/YYYY_ios_discharge_bot',
    testId: 'ca-app-pub-3940256099942544/6300978111',
  },
  LEAVE_MIDDLE: {
    id: 'leave_middle_banner',
    label: '휴가 · 리스트 중간',
    // realId: IS_ANDROID ? 'ca-app-pub-XXXX/YYYY_leave_mid' : 'ca-app-pub-XXXX/YYYY_ios_leave_mid',
    testId: 'ca-app-pub-3940256099942544/6300978111',
  },
  LEAVE_BOTTOM: {
    id: 'leave_bottom_banner',
    label: '휴가 · 하단',
    // realId: IS_ANDROID ? 'ca-app-pub-XXXX/YYYY_leave_bot' : 'ca-app-pub-XXXX/YYYY_ios_leave_bot',
    testId: 'ca-app-pub-3940256099942544/6300978111',
  },
  SALARY_MIDDLE: {
    id: 'salary_middle_banner',
    label: '급여 · 월급표 하단',
    // realId: IS_ANDROID ? 'ca-app-pub-XXXX/YYYY_salary_mid' : 'ca-app-pub-XXXX/YYYY_ios_salary_mid',
    testId: 'ca-app-pub-3940256099942544/6300978111',
  },
  SALARY_BOTTOM: {
    id: 'salary_bottom_banner',
    label: '급여 · 하단',
    // realId: IS_ANDROID ? 'ca-app-pub-XXXX/YYYY_salary_bot' : 'ca-app-pub-XXXX/YYYY_ios_salary_bot',
    testId: 'ca-app-pub-3940256099942544/6300978111',
  },
  TODO_MIDDLE: {
    id: 'todo_middle_banner',
    label: '일정 · 그룹 사이',
    // realId: IS_ANDROID ? 'ca-app-pub-XXXX/YYYY_todo_mid' : 'ca-app-pub-XXXX/YYYY_ios_todo_mid',
    testId: 'ca-app-pub-3940256099942544/6300978111',
  },
  TODO_BOTTOM: {
    id: 'todo_bottom_banner',
    label: '일정 · 하단',
    // realId: IS_ANDROID ? 'ca-app-pub-XXXX/YYYY_todo_bot' : 'ca-app-pub-XXXX/YYYY_ios_todo_bot',
    testId: 'ca-app-pub-3940256099942544/6300978111',
  },

  // ── 전면 광고 ─────────────────────────────────────────────────
  INTERSTITIAL_TAB: {
    id: 'interstitial_tab_switch',
    label: '전면 · 탭 전환',
    // realId: IS_ANDROID ? 'ca-app-pub-XXXX/YYYY_interstitial' : 'ca-app-pub-XXXX/YYYY_ios_interstitial',
    testId: 'ca-app-pub-3940256099942544/1033173712',
  },
};
