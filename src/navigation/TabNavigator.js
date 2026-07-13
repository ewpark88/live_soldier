import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/ThemeContext';
import { type } from '../theme/tokens';

import HomeScreen from '../screens/HomeScreen';
import DischargeScreen from '../screens/DischargeScreen';
import RoadmapScreen from '../screens/RoadmapScreen';
import LeaveScreen from '../screens/LeaveScreen';
import SalaryScreen from '../screens/SalaryScreen';
import SalaryGuideScreen from '../screens/SalaryGuideScreen';
import OfficerPayScreen from '../screens/OfficerPayScreen';
import SavingsScreen from '../screens/SavingsScreen';
import BenefitsScreen from '../screens/BenefitsScreen';
import TodoScreen from '../screens/TodoScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function getTabIcon(routeName, focused) {
  const icons = {
    home: focused ? 'home' : 'home-outline',
    discharge: focused ? 'flag' : 'flag-outline',
    leave: focused ? 'calendar' : 'calendar-outline',
    salary: focused ? 'cash' : 'cash-outline',
    todo: focused ? 'checkbox' : 'checkbox-outline',
    settings: focused ? 'settings' : 'settings-outline',
  };
  return icons[routeName] || 'ellipse-outline';
}

function getTabLabel(routeName) {
  const labels = { home: '홈', discharge: '전역', leave: '휴가', salary: '급여', todo: '일정', settings: '설정' };
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
        <Tab.Screen name="home" component={HomeScreen} options={{ title: '전역까지', tabBarLabel: '홈' }} />
        <Tab.Screen name="discharge" component={DischargeScreen} options={{ title: '전역일 계산', tabBarLabel: '전역' }} />
        {/* 전역 로드맵: 하단 탭엔 숨기고 햄버거 메뉴에서만 진입 */}
        <Tab.Screen
          name="roadmap"
          component={RoadmapScreen}
          options={{
            title: '전역 로드맵',
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
        <Tab.Screen name="leave" component={LeaveScreen} options={{ title: '휴가 관리', tabBarLabel: '휴가' }} />
        <Tab.Screen name="salary" component={SalaryScreen} options={{ title: '급여 계산', tabBarLabel: '급여' }} />
        {/* 병사 월급 가이드·간부 봉급 참고·장병내일적금·군인 혜택: 하단 탭엔 숨기고 햄버거 메뉴에서만 진입 */}
        <Tab.Screen
          name="salaryGuide"
          component={SalaryGuideScreen}
          options={{ title: '병사 월급 가이드', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
        />
        <Tab.Screen
          name="officerPay"
          component={OfficerPayScreen}
          options={{ title: '간부 봉급 참고', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
        />
        <Tab.Screen
          name="savings"
          component={SavingsScreen}
          options={{ title: '장병내일적금 계산기', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
        />
        <Tab.Screen
          name="benefits"
          component={BenefitsScreen}
          options={{ title: '군인 혜택 모음', tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }}
        />
        <Tab.Screen name="todo" component={TodoScreen} options={{ title: '일정 관리', tabBarLabel: '일정' }} />
        <Tab.Screen name="settings" component={SettingsScreen} options={{ title: '설정', tabBarLabel: '설정' }} />
      </Tab.Navigator>

    </View>
  );
}
