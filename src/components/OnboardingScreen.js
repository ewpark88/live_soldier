import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import { PERSONNEL_TYPES } from '../constants/serviceTerms';
import { useMotion } from '../hooks/useMotion';
import { space as sp } from '../theme/tokens';
import Card from './Card';
import ListRow from './ui/ListRow';
import Txt from './ui/Txt';

/**
 * 첫 진입(또는 새 프로필) 시 신분 선택 온보딩.
 * 병사 → 기존 병사 화면/로직 유지, 부사관·장교 → 간부 전용 로직 적용.
 */
const DESC = {
  soldier: '이병~병장 진급·병사 봉급·휴가 관리',
  nco: '하사~원사 · 복무개월/호봉 · 봉급 직접관리',
  officer: '소위~ · 복무개월/호봉 · 봉급 직접관리',
};

export default function OnboardingScreen({ name, onSelect }) {
  const tc = useThemeColors();
  const m = useMotion();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={m.enter(FadeInUp, 0)} style={s.head}>
        <View style={[s.iconWrap, { backgroundColor: tc.primarySoft }]}>
          <Ionicons name="medal" size={34} color={tc.primary} />
        </View>

        <Txt role="title" tone="primary" style={s.center}>
          {name ? `${name} 님,` : '환영합니다!'}
        </Txt>
        <Txt role="subtitle" style={s.center}>어떤 신분으로 복무 중이신가요?</Txt>
        <Txt role="bodySm" tone="secondary" style={s.center}>
          선택에 따라 맞는 계급·봉급·계산이 적용돼요.{'\n'}나중에 ‘전역일 계산’에서 변경할 수 있어요.
        </Txt>
      </Animated.View>

      <View style={s.cards}>
        {PERSONNEL_TYPES.map((t, i) => (
          <Animated.View key={t.key} entering={m.enter(FadeInUp, i + 1)}>
            <Card pad="none" style={s.card}>
              <ListRow
                title={t.label}
                subtitle={DESC[t.key]}
                icon={t.icon}
                chevron
                onPress={() => onSelect(t.key)}
                style={s.row}
              />
            </Card>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: sp.xxl, paddingTop: sp.xxl, paddingBottom: sp.huge },
  head: { alignItems: 'center', gap: sp.sm },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.sm,
  },
  center: { textAlign: 'center' },
  cards: { marginTop: sp.xxxl, gap: sp.md },
  card: { paddingHorizontal: 0 },
  row: { paddingHorizontal: sp.lg, minHeight: 68 },
});
