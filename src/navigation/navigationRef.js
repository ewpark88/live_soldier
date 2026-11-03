import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * 네비게이터 바깥(루트에 떠 있는 시트, 딥링크 처리)에서 화면을 옮길 때 쓴다.
 * 화면 컴포넌트 안에서는 평소처럼 navigation prop 을 쓴다.
 */
export const navigationRef = createNavigationContainerRef();

export function navigateHome() {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('tabs', { screen: 'home' });
}

/* 알림을 눌러 앱이 켜지면 네비게이터가 아직 준비되지 않았을 수 있다 —
   그때 받은 라우트는 들고 있다가 NavigationContainer.onReady 에서 처리한다. */
const TAB_ROUTES = ['home', 'calendar', 'salary', 'settings'];
let _pendingRoute = null;

export function openNotificationRoute(route) {
  if (!navigationRef.isReady()) { _pendingRoute = route; return; }
  _pendingRoute = null;
  try {
    if (TAB_ROUTES.includes(route)) navigationRef.navigate('tabs', { screen: route });
    else navigationRef.navigate(route);
  } catch (e) { /* 모르는 라우트 — 앱은 그대로 연다 */ }
}

export function flushPendingRoute() {
  if (_pendingRoute) openNotificationRoute(_pendingRoute);
}
