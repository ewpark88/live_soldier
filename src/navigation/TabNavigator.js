import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';

import HomeScreen from '../screens/HomeScreen';
import DischargeScreen from '../screens/DischargeScreen';
import LeaveScreen from '../screens/LeaveScreen';
import SalaryScreen from '../screens/SalaryScreen';
import TodoScreen from '../screens/TodoScreen';

const Tab = createBottomTabNavigator();

function getTabIcon(routeName, focused) {
  const icons = {
    home: focused ? 'home' : 'home-outline',
    discharge: focused ? 'flag' : 'flag-outline',
    leave: focused ? 'calendar' : 'calendar-outline',
    salary: focused ? 'cash' : 'cash-outline',
    todo: focused ? 'checkbox' : 'checkbox-outline',
  };
  return icons[routeName] || 'ellipse-outline';
}

function getTabLabel(routeName) {
  const labels = { home: '홈', discharge: '전역', leave: '휴가', salary: '급여', todo: '일정' };
  return labels[routeName] || routeName;
}

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

  // 탭바 높이: 아이콘+라벨 기본 56px + 하단 safe area
  const TAB_BAR_HEIGHT = 56 + insets.bottom;

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
            borderTopWidth: 1,
            height: TAB_BAR_HEIGHT,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingTop: 8,
            // 광고와의 겹침 방지: elevation 높게 유지
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginBottom: Platform.OS === 'android' ? 2 : 0,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="home" component={HomeScreen} options={{ title: '전역까지', tabBarLabel: '홈' }} />
        <Tab.Screen name="discharge" component={DischargeScreen} options={{ title: '전역일 계산', tabBarLabel: '전역' }} />
        <Tab.Screen name="leave" component={LeaveScreen} options={{ title: '휴가 관리', tabBarLabel: '휴가' }} />
        <Tab.Screen name="salary" component={SalaryScreen} options={{ title: '급여 계산', tabBarLabel: '급여' }} />
        <Tab.Screen name="todo" component={TodoScreen} options={{ title: '일정 관리', tabBarLabel: '일정' }} />
      </Tab.Navigator>

    </View>
  );
}
