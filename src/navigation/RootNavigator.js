import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useThemeColors } from '../theme/ThemeContext';

import TabNavigator from './TabNavigator';
import DischargeScreen from '../screens/DischargeScreen';
import RoadmapScreen from '../screens/RoadmapScreen';
import SalaryGuideScreen from '../screens/SalaryGuideScreen';
import OfficerPayScreen from '../screens/OfficerPayScreen';
import SavingsScreen from '../screens/SavingsScreen';
import BenefitsScreen from '../screens/BenefitsScreen';
import ThemeScreen from '../screens/ThemeScreen';

const Stack = createNativeStackNavigator();

/**
 * 루트 스택.
 *
 * 예전엔 이 화면들이 전부 "숨은 탭"(tabBarButton: () => null)이었다. 그래서
 *   - 하드웨어 백이 스택을 되감지 않고 마지막 탭으로 튀었고
 *   - 리프 화면에도 탭바가 계속 깔려 하단이 [탭바 + 광고] 두 겹 띠였다.
 * 이제 진짜 스택으로 push 된다.
 *
 * 라우트 이름은 예전 그대로다. React Navigation 은 현재 네비게이터에 없는
 * 이름이면 부모로 버블링하므로, 탭 화면의 navigation.navigate('roadmap') 이
 * 수정 없이 그대로 동작한다. 대신 트리 전체에서 라우트 이름이 유일해야 한다.
 *
 * ⚠️ 버블링은 위로만 간다. 스택 화면에서 탭 자식으로는 못 간다.
 *    그래서 '전역 정보'(discharge)도 여기로 올렸다 — 로드맵/SetupRequired 가
 *    discharge 로 보내는데, 탭에 남겨두면 그 경로가 조용히 죽는다.
 *
 * 모든 화면이 자체 <AppHeader> 를 그리므로 헤더는 끈다.
 */
export default function RootNavigator() {
  const tc = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // 지정하지 않으면 전환 중 흰 배경이 번쩍인다 (다크모드에서 특히 눈에 띈다)
        contentStyle: { backgroundColor: tc.background },
        animation: 'slide_from_right',
        navigationBarColor: tc.background,
      }}
    >
      <Stack.Screen name="tabs" component={TabNavigator} />

      <Stack.Screen name="discharge" component={DischargeScreen} />
      <Stack.Screen name="roadmap" component={RoadmapScreen} />
      <Stack.Screen name="salaryGuide" component={SalaryGuideScreen} />
      <Stack.Screen name="officerPay" component={OfficerPayScreen} />
      <Stack.Screen name="savings" component={SavingsScreen} />
      <Stack.Screen name="benefits" component={BenefitsScreen} />
      <Stack.Screen name="theme" component={ThemeScreen} />
    </Stack.Navigator>
  );
}
