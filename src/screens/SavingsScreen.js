import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/ThemeContext';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import FadeInView from '../components/FadeInView';
import SavingsCalculator from '../components/SavingsCalculator';
import AdBanner from '../components/AdBanner';
import MenuButton from '../components/MenuButton';
import { AD_UNITS } from '../constants/adUnits';
import { loadMilitaryInfo } from '../utils/storage';

export default function SavingsScreen({ navigation }) {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [militaryInfo, setMilitaryInfo] = useState(null);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    setMilitaryInfo(await loadMilitaryInfo());
  };

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scrollFlex}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.topBar}>
          <Text style={s.pageTitle}>장병내일적금 계산기</Text>
          <MenuButton navigation={navigation} current="savings" />
        </View>

        <FadeInView>
          <Card>
            <SectionTitle icon="calculator-outline" size={16} style={{ marginBottom: 4 }}>장병내일준비적금 계산기</SectionTitle>
            <Text style={s.sub}>전역 시 받을 목돈을 미리 계산</Text>
            <SavingsCalculator militaryInfo={militaryInfo} />
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
