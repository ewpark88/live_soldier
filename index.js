import { registerRootComponent } from 'expo';
import App from './App';

// 앱 루트 등록 (기존 expo/AppEntry.js와 동일 역할)
registerRootComponent(App);

// 안드로이드 위젯 태스크 핸들러 등록.
// 네이티브 모듈이 없는 환경(리빌드 전/iOS)에서도 앱이 부팅되도록 방어적으로 처리.
try {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widget/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
} catch (e) {
  // 위젯 미지원 환경 — 무시
}
