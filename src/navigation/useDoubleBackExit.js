import { useEffect, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { navigationRef } from './navigationRef';

const EXIT_WINDOW_MS = 2000;

/**
 * 안드로이드 하드웨어 백 — 더 되감을 곳이 없을 때(홈 탭, 스택 비어 있음)만 가로챈다.
 * 첫 번째는 토스트만 띄우고, 2초 안에 한 번 더 누르면 앱을 닫는다.
 *
 * 스택 pop·탭 → 홈 복귀는 React Navigation 이 그대로 처리하도록 canGoBack 이면 넘긴다.
 * 열린 BottomSheet 는 나중에 등록된 리스너라 먼저 불려서 시트를 닫고 끝난다.
 */
export function useDoubleBackExit() {
  const lastPress = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) return false;

      const now = Date.now();
      if (now - lastPress.current < EXIT_WINDOW_MS) {
        BackHandler.exitApp();
        return true;
      }
      lastPress.current = now;
      ToastAndroid.show("'뒤로' 버튼을 한 번 더 누르면 앱이 종료됩니다", ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, []);
}
