import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/ThemeContext';
import { type } from '../theme/tokens';

import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import SalaryScreen from '../screens/SalaryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CelebrationOverlay from './CelebrationOverlay';

const Tab = createBottomTabNavigator();

function getTabIcon(routeName, focused) {
  const icons = {
    home: focused ? 'home' : 'home-outline',
    calendar: focused ? 'calendar' : 'calendar-outline',
    salary: focused ? 'wallet' : 'wallet-outline',
    settings: focused ? 'person-circle' : 'person-circle-outline',
  };
  return icons[routeName] || 'ellipse-outline';
}

function getTabLabel(routeName) {
  const labels = { home: '홈', calendar: '캘린더', salary: '급여', settings: '내 정보' };
  return labels[routeName] || routeName;
}

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();

  // 탭바 높이.
  // 예전엔 56 + insets.bottom 이었는데, 안에 들어가는 콘텐츠는
  // paddingTop 8 + itemPadding 4 + 아이콘 24 + 라벨 ~18 + itemPadding 4 + paddingBottom 8
  // = 66px 이라 56px 상자에 안 들어갔다. insets.bottom 이 0인 안드로이드 기기
  // 대부분에서 라벨 아래가 잘려 나갔다.
  const BAR_CONTENT = 60;
  const BOTTOM_PAD = Math.max(insets.bottom, 8);
  const TAB_BAR_HEIGHT = BAR_CONTENT + BOTTOM_PAD;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={getTabIcon(route.name, focused)} size={24} color={color} />
          ),
          tabBarLabel: getTabLabel(route.name),
          tabBarActiveTintColor: COLORS.tabActive,
          tabBarInactiveTintColor: COLORS.tabInactive,
          tabBarStyle: {
            backgroundColor: COLORS.card,
            borderTopColor: COLORS.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: TAB_BAR_HEIGHT,
            paddingBottom: BOTTOM_PAD,
            paddingTop: 6,
            // 광고와의 겹침 방지: elevation 높게 유지 (안드로이드 z-order상 필요)
            elevation: 8,
            shadowColor: COLORS.shadow,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            ...type.micro,
            fontWeight: '700',
            marginTop: 2,
            marginBottom: 0,
            // 안드로이드에서 라벨이 잘리는 진짜 원인. 높이만 키워선 안 고쳐진다.
            includeFontPadding: false,
          },
          tabBarIconStyle: { marginTop: 2 },
          // 예전 paddingVertical:4 가 상자 밖으로 넘치던 주범이었다
          tabBarItemStyle: { paddingVertical: 0 },
          headerShown: false,
        })}
      >
        {/* 로드맵·봉급표·적금·혜택은 더 이상 "숨은 탭"이 아니다.
            루트 스택(RootNavigator)으로 push 된다. */}
        <Tab.Screen name="home" component={HomeScreen} options={{ title: '전역까지', tabBarLabel: '홈' }} />
        <Tab.Screen name="calendar" component={CalendarScreen} options={{ title: '캘린더', tabBarLabel: '캘린더' }} />
        <Tab.Screen name="salary" component={SalaryScreen} options={{ title: '급여 계산', tabBarLabel: '급여' }} />
        <Tab.Screen name="settings" component={SettingsScreen} options={{ title: '내 정보', tabBarLabel: '내 정보' }} />
      </Tab.Navigator>

      {/* 축하 오버레이는 앱 전체에서 정확히 한 번만 마운트된다.
          화면별로 붙이면 탭 전환마다 이중 발화한다. NavigationContainer 안이라
          "테마 보러가기"도 동작하고, 어느 탭에 착지하든 뜬다. */}
      <CelebrationOverlay />
    </View>
  );
}
