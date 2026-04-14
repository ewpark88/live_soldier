import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import MobileAds from 'react-native-google-mobile-ads';
import TabNavigator from './src/navigation/TabNavigator';

export default function App() {
  useEffect(() => {
    initAds();
  }, []);

  const initAds = async () => {
    // iOS 14+ ATT 광고 추적 동의 요청
    if (Platform.OS === 'ios') {
      const { status } = await requestTrackingPermissionsAsync();
      console.log('[ATT] 추적 권한 상태:', status);
    }

    // AdMob SDK 초기화
    await MobileAds().initialize();
    console.log('[AdMob] SDK 초기화 완료');
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
