import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/ThemeContext';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import FadeInView from '../components/FadeInView';
import AdBanner from '../components/AdBanner';
import MenuButton from '../components/MenuButton';
import { AD_UNITS } from '../constants/adUnits';
import { loadMilitaryInfo } from '../utils/storage';
import { OFFICER_PAY_GUIDE } from '../constants/militaryRanks';

function formatMoney(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function OfficerPayScreen({ navigation }) {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [officerRank, setOfficerRank] = useState(null);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const mi = await loadMilitaryInfo();
    setOfficerRank(mi?.officerRank ?? null);
  };

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scrollFlex}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topBar}>
          <Text style={s.pageTitle}>간부 봉급 참고</Text>
          <MenuButton navigation={navigation} current="officerPay" />
        </View>

        <FadeInView>
          <Card>
            <SectionTitle icon="list-outline" size={16} style={{ marginBottom: 4 }}>간부봉급참고</SectionTitle>
            <Text style={s.guideSub}>초임(1호봉) 월 기본급 · 참고용</Text>

            <View style={s.guideBody}>
              {OFFICER_PAY_GUIDE.map((g) => {
                const isCurrent = g.rank === officerRank;
                return (
                  <View
                    key={g.rank}
                    style={[s.guideRow, isCurrent && s.guideRowCurrent]}
                  >
                    <View style={s.guideLeft}>
                      <View style={s.guideRankRow}>
                        <Text style={[s.guideRank, isCurrent && s.guideRankCurrent]}>
                          {g.rank}
                        </Text>
                        <Text style={s.guideMonths}>{g.group}</Text>
                        {isCurrent && (
                          <View style={s.currentBadge}>
                            <Text style={s.currentBadgeText}>현재</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[s.guideAmount, isCurrent && { color: tc.primary }]}>
                      {formatMoney(g.amount)}원
                    </Text>
                  </View>
                );
              })}
              <Text style={s.guideNote}>
                * 2025년 초임(1호봉) 기준 추정. 호봉·각종 수당 미반영, 정확한 금액은 직접 입력하세요.
              </Text>
            </View>
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

  guideSub: { fontSize: 12, color: tc.textSecondary },
  guideBody: { marginTop: 16 },
  guideRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 8,
    backgroundColor: tc.background,
  },
  guideRowCurrent: {
    backgroundColor: '#E8F3F0',
    borderWidth: 1.5,
    borderColor: tc.primaryLight,
  },
  guideLeft: { flex: 1 },
  guideRankRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  guideRank: { fontSize: 16, fontWeight: '700', color: tc.text },
  guideRankCurrent: { color: tc.primary },
  currentBadge: {
    backgroundColor: tc.primary, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 10, color: tc.white, fontWeight: '700' },
  guideMonths: { fontSize: 12, color: tc.textSecondary },
  guideAmount: { fontSize: 16, fontWeight: '800', color: tc.text, marginBottom: 6 },
  guideNote: { fontSize: 12, color: tc.textLight, textAlign: 'right', marginTop: 8, marginBottom: 4 },
});
