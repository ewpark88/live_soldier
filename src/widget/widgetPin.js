import { NativeModules, Platform } from 'react-native';

/**
 * 홈 화면 위젯 '원탭 추가' — android/.../WidgetPinModule.kt 의 얇은 래퍼.
 *
 * 네이티브 모듈이 없을 때(iOS · 모듈 추가 전 빌드 · Expo Go)도 예외 없이
 * '지원 안 함'으로 떨어진다 — 그러면 위젯 화면이 수동 추가 방법을 안내한다.
 */
const Native = Platform.OS === 'android' ? NativeModules.WidgetPin : null;

/** 런처가 앱 안에서의 위젯 고정 요청을 받는가 (Android 8.0+ · 런처 지원) */
export async function canPinWidget() {
  if (!Native?.isSupported) return false;
  try {
    return !!(await Native.isSupported());
  } catch {
    return false;
  }
}

/** 시스템 '홈 화면에 추가' 창을 띄운다. 창을 띄웠으면 true. */
export async function pinWidget(widgetName) {
  if (!Native?.requestPin) return false;
  try {
    return !!(await Native.requestPin(widgetName));
  } catch {
    return false;
  }
}

/** 홈 화면에 이미 놓인 이 위젯의 개수 (모르면 0) */
export async function countPinnedWidgets(widgetName) {
  if (!Native?.count) return 0;
  try {
    return Number(await Native.count(widgetName)) || 0;
  } catch {
    return 0;
  }
}
