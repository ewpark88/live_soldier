import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/ThemeContext';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import FadeInView from '../components/FadeInView';
import BenefitsList from '../components/BenefitsList';
import AdBanner from '../components/AdBanner';
import MenuButton from '../components/MenuButton';
import { AD_UNITS } from '../constants/adUnits';

export default function BenefitsScreen({ navigation }) {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(tc), [tc]);

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scrollFlex}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topBar}>
          <Text style={s.pageTitle}>군인 혜택 모음</Text>
          <MenuButton navigation={navigation} current="benefits" />
        </View>

        <FadeInView>
          <Card>
            <SectionTitle icon="gift-outline" size={16} style={{ marginBottom: 4 }}>군인 혜택 모음</SectionTitle>
            <Text style={s.sub}>금융·교통·문화·자기계발 등 할인·지원</Text>
            <BenefitsList />
          </Card>
        </FadeInView>
      </ScrollView>

      {/* ── 고정 배너 광고 (탭바 위, 스크롤 무관 항상 노출) ── */}
      <View style={s.adFooter}>
        <AdBanner unit={AD_UNITS.SALARY_MIDDLE} />
      </View>
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  container: { flex: 1, backgroundColor: tc.background },
  scrollFlex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 24 },
  adFooter: {
    paddingHorizontal: 16,
    paddingTop: 4,
    backgroundColor: tc.card,
    borderTopWidth: 1,
    borderTopColor: tc.border,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: tc.primary },
  sub: { fontSize: 12, color: tc.textSecondary },
});
