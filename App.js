import React, { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { useDoubleBackExit } from './src/navigation/useDoubleBackExit';
import ShareImportSheet from './src/components/share/ShareImportSheet';
import { requestShareImport } from './src/state/appEvents';
import { findShareCode } from './src/utils/shareCode';
import { initStorage } from './src/utils/storage';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { PrefsProvider } from './src/theme/PrefsContext';
import { StreakProvider } from './src/state/StreakContext';
import { CelebrationProvider } from './src/state/CelebrationContext';
import { configureNotificationHandler, refreshScheduledNotifications } from './src/utils/notifications';
import { markAdsReady } from './src/utils/adManager';

// Expo Go 호환 처리
let requestTrackingPermissionsAsync = null;
let MobileAds = null;

try {
  requestTrackingPermissionsAsync =
    require('expo-tracking-transparency').requestTrackingPermissionsAsync;
} catch (e) {}

try {
  MobileAds = require('react-native-google-mobile-ads').default;
} catch (e) {}

/** 테마가 적용되는 내부 루트 (ThemeProvider 하위에서 useTheme 사용 가능) */
function ThemedApp() {
  const { scheme, colors } = useTheme();
  useDoubleBackExit();

  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={navTheme} ref={navigationRef}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
      {/* 공유 코드 가져오기 — 딥링크·QR·프로필 바가 모두 이 시트 하나를 연다 */}
      <ShareImportSheet />
    </NavigationContainer>
  );
}

export default function App() {
  // 공유 코드 딥링크 (jeonryeokkami://add?c=JY1-…) — QR 을 폰 카메라로 찍으면 들어온다.
  // NavigationContainer 의 linking 은 쓰지 않는다: 이동할 화면이 아니라 시트를 여는
  // 것이라, 라우트 설정을 늘리면 '라우트 이름은 트리 전체에서 유일' 규칙만 무거워진다.
  useEffect(() => {
    // 바깥에서 들어오는 문자열이다 — 무엇이 와도 앱을 죽이지 않는다
    const handle = (url) => {
      try {
        const code = findShareCode(url || '');
        if (code) requestShareImport(code);
      } catch (e) { /* 무시 */ }
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    initAds();
    // 저장소 초기화 + 레거시(단일 프로필) → 멀티 프로필 자동 마이그레이션
    initStorage()
      .then(() => {
        // 알림이 켜져 있으면 최신 데이터로 리마인더 재예약
        configureNotificationHandler();
        return refreshScheduledNotifications();
      })
      .catch(() => {});
  }, []);

  const initAds = async () => {
    try {
      // iOS 14+ ATT 광고 추적 동의 요청
      if (Platform.OS === 'ios' && requestTrackingPermissionsAsync) {
        const { status } = await requestTrackingPermissionsAsync();
        console.log('[ATT] 추적 권한 상태:', status);
      }

      // AdMob SDK 초기화 — 끝나야 배너가 요청을 시작한다 (adManager.markAdsReady).
      // 초기화가 멈춰도 광고가 영영 안 뜨지 않게 3초 뒤엔 그냥 연다.
      if (MobileAds) {
        const fallback = setTimeout(markAdsReady, 3000);
        await MobileAds().initialize();
        clearTimeout(fallback);
        console.log('[AdMob] SDK 초기화 완료');
      }
    } catch (e) {
      console.log('[AdMob] Expo Go 환경 - 광고 초기화 스킵');
    } finally {
      markAdsReady();
    }
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PrefsProvider>
          {/* 스트릭 체크인은 하루 1회 실제로 값이 움직였을 때만 알림을 다시 잡는다.
              예전처럼 홈 포커스마다 재예약하지 않는다. */}
          <StreakProvider onCheckIn={() => refreshScheduledNotifications()}>
            <CelebrationProvider>
              <ThemedApp />
            </CelebrationProvider>
          </StreakProvider>
        </PrefsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
