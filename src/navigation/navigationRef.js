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
