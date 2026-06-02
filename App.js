import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigator from './src/navigation/TabNavigator';
import { initStorage } from './src/utils/storage';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

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
    <NavigationContainer theme={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <TabNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    initAds();
    // 저장소 초기화 + 레거시(단일 프로필) → 멀티 프로필 자동 마이그레이션
    initStorage().catch(() => {});
  }, []);

  const initAds = async () => {
    try {
      // iOS 14+ ATT 광고 추적 동의 요청
      if (Platform.OS === 'ios' && requestTrackingPermissionsAsync) {
        const { status } = await requestTrackingPermissionsAsync();
        console.log('[ATT] 추적 권한 상태:', status);
      }

      // AdMob SDK 초기화
      if (MobileAds) {
        await MobileAds().initialize();
        console.log('[AdMob] SDK 초기화 완료');
      }
    } catch (e) {
      console.log('[AdMob] Expo Go 환경 - 광고 초기화 스킵');
    }
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
