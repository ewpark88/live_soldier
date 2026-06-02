import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { PERSONNEL_TYPES } from '../constants/serviceTerms';

/**
 * 첫 진입(또는 새 프로필) 시 신분 선택 온보딩.
 * 병사 → 기존 병사 화면/로직 유지, 부사관·장교 → 간부 전용 로직 적용.
 */
const DESC = {
  soldier: '이병~병장 진급·병사 봉급·휴가 관리',
  nco:     '하사~원사 · 복무개월/호봉 · 봉급 직접관리',
  officer: '소위~ · 복무개월/호봉 · 봉급 직접관리',
};

export default function OnboardingScreen({ name, onSelect }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.emoji}>🎖️</Text>
      <Text style={s.title}>
        {name ? `${name} 님,` : '환영합니다!'}
      </Text>
      <Text style={s.subtitle}>어떤 신분으로 복무 중이신가요?</Text>
      <Text style={s.hint}>선택에 따라 맞는 계급·봉급·계산이 적용돼요.{'\n'}나중에 ‘전역일 계산’에서 변경할 수 있어요.</Text>

      <View style={s.cards}>
        {PERSONNEL_TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={s.card}
            onPress={() => onSelect(t.key)}
            activeOpacity={0.85}
          >
            <Text style={s.cardEmoji}>{t.emoji}</Text>
            <View style={s.cardTextWrap}>
              <Text style={s.cardLabel}>{t.label}</Text>
              <Text style={s.cardDesc}>{DESC[t.key]}</Text>
            </View>
            <Text style={s.cardArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  container: { flex: 1, backgroundColor: tc.background },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  emoji: { fontSize: 52, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: tc.primary, textAlign: 'center' },
  subtitle: { fontSize: 18, fontWeight: '700', color: tc.text, textAlign: 'center', marginTop: 8 },
  hint: { fontSize: 13, color: tc.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 19 },

  cards: { marginTop: 32, gap: 14 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: tc.card, borderRadius: 16,
    paddingVertical: 20, paddingHorizontal: 20,
    borderWidth: 1.5, borderColor: tc.border,
  },
  cardEmoji: { fontSize: 34, marginRight: 16 },
  cardTextWrap: { flex: 1 },
  cardLabel: { fontSize: 19, fontWeight: '800', color: tc.text },
  cardDesc: { fontSize: 13, color: tc.textSecondary, marginTop: 4, lineHeight: 18 },
  cardArrow: { fontSize: 26, color: tc.textLight, fontWeight: '700' },
});
