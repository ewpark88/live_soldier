/**
 * 입대 정보 미입력 시 표시하는 안내 화면.
 * LeaveScreen / SalaryScreen / TodoScreen 에서 공통 사용.
 *
 * 내용은 EmptyState 프리미티브가 그린다 — 여기선 문구와 CTA 만 정한다.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../theme/ThemeContext';
import EmptyState from './ui/EmptyState';

export default function SetupRequired() {
  const tc = useThemeColors();
  const navigation = useNavigation();

  return (
    <View style={[styles.center, { backgroundColor: tc.background }]}>
      <EmptyState
        icon="shield-half"
        title="입대 정보가 필요해요"
        desc={'이 기능을 사용하려면 먼저\n전역 탭에서 입대 정보를 입력해주세요.'}
        action={{
          label: '입대 정보 입력하러 가기',
          icon: 'create-outline',
          onPress: () => navigation.navigate('discharge'),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
