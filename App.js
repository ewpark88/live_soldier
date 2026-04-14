import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigator from './src/navigation/TabNavigator';

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

export default function App() {
  useEffect(() => {
    initAds();
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
      <NavigationContainer>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
