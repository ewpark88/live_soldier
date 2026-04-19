/**
 * 입대 정보 미입력 시 표시하는 안내 화면
 * LeaveScreen / SalaryScreen / TodoScreen 에서 공통 사용
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants/colors';

export default function SetupRequired() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🪖</Text>
      <Text style={styles.title}>입대 정보가 필요해요</Text>
      <Text style={styles.desc}>
        이 기능을 사용하려면{'\n'}
        먼저 전역 탭에서 입대 정보를 입력해주세요.
      </Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => navigation.navigate('discharge')}
      >
        <Text style={styles.btnText}>입대 정보 입력하러 가기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
  },
  emoji: { fontSize: 64, marginBottom: 20 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  desc: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 36,
  },
  btn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
  },
  btnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
