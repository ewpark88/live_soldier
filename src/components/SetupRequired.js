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
import { josa, termsFor } from '../constants/serviceTerms';

/* 정보가 아직 없는 상태라 신분을 모를 수 있다 — 넘겨주면 그 신분 문구('입대 정보'),
   없으면 모든 신분에 맞는 중립 문구('복무 정보')를 쓴다. */
export default function SetupRequired({ personnelType }) {
  const tc = useThemeColors();
  const navigation = useNavigation();
  const info = personnelType ? termsFor(personnelType).info : '복무 정보';

  return (
    <View style={[styles.center, { backgroundColor: tc.background }]}>
      <EmptyState
        icon="shield-half"
        title={`${josa(info, '이/가')} 필요해요`}
        /* '전역 탭'은 v1.0.8 에서 루트 스택 화면으로 바뀌어 더 이상 없다 */
        desc={`이 기능을 사용하려면 먼저\n${josa(info, '을/를')} 입력해주세요.`}
        action={{
          label: `${info} 입력하러 가기`,
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
