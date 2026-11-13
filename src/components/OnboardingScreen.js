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
  nco: '하사~원사 · 임관일 기준 호봉 · 봉급 참고/직접 입력',
  warrant: '준위 · 임관일 기준 호봉 · 봉급 참고/직접 입력',
  officer: '소위~대령 · 임관일 기준 호봉 · 봉급 참고/직접 입력',
  social: '21개월 · 소집해제까지 · 연가 28일',
  industrial: '현역 대상 34개월 / 보충역 대상 23개월',
  research: '지정 연구기관 · 36개월',
  professional: '공중보건의사·공익법무관·공중방역수의사 · 36개월',
  artsports: '34개월 · 544시간 공익복무 포함',
};

const GROUPS = [
  { key: 'active', label: '현역' },
  { key: 'alt', label: '대체복무 (보충역 등)' },
];

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
        <Txt role="subtitle" style={s.center}>어떤 형태로 복무 중이신가요?</Txt>
        <Txt role="bodySm" tone="secondary" style={s.center}>
          선택에 따라 맞는 복무기간·급여·계산이 적용돼요.{'\n'}나중에 ‘내 정보’의 복무 정보에서 변경할 수 있어요.
        </Txt>
      </Animated.View>

      {GROUPS.map((g, gi) => (
        <View key={g.key} style={s.cards}>
          <Txt role="label" tone="secondary">{g.label}</Txt>
          {PERSONNEL_TYPES.filter((t) => t.group === g.key).map((t, i) => (
            <Animated.View key={t.key} entering={m.enter(FadeInUp, gi * 3 + i + 1)}>
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
      ))}
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
