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
import { loadMilitaryInfo, loadRankPromotions } from '../utils/storage';
import { calcRankFromPromotions } from '../utils/dateUtils';

/* ─── 계급별 표준 월급 (2024년 기준) ───────────────────────── */
/* 진급 기준: 이병 0~1개월, 일병 2~7개월, 상병 8~13개월, 병장 14개월~ */
const SALARY_GUIDE = [
  { rank: '이병', emoji: '🪖', months: '0 ~ 1개월',  amount: 640000,  start: 0,  end: 1   },
  { rank: '일병', emoji: '⭐', months: '2 ~ 7개월',  amount: 800000,  start: 2,  end: 7   },
  { rank: '상병', emoji: '⭐⭐', months: '8 ~ 13개월', amount: 1000000, start: 8,  end: 13  },
  { rank: '병장', emoji: '👑', months: '14개월~',    amount: 1250000, start: 14, end: 999 },
];
const MAX_SALARY = 1250000;

function formatMoney(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function SalaryGuideScreen({ navigation }) {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [promotions, setPromotions] = useState(null);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const mi = await loadMilitaryInfo();
    if (!mi) return;
    setPromotions(await loadRankPromotions(mi.enlistDate));
  };

  const currentRank = calcRankFromPromotions(promotions);

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scrollFlex}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topBar}>
          <Text style={s.pageTitle}>병사 월급 가이드</Text>
          <MenuButton navigation={navigation} current="salaryGuide" />
        </View>

        <FadeInView>
          <Card>
            <SectionTitle icon="list-outline" size={16} style={{ marginBottom: 4 }}>계급별 표준 월급</SectionTitle>
            <Text style={s.guideSub}>계급별 표준 월급 참고표</Text>

            <View style={s.guideBody}>
              {SALARY_GUIDE.map((g) => {
                const isCurrent = g.rank === currentRank;
                const barPct    = Math.round((g.amount / MAX_SALARY) * 100);
                return (
                  <View
                    key={g.rank}
                    style={[s.guideRow, isCurrent && s.guideRowCurrent]}
                  >
                    {/* 좌측: 계급 정보 */}
                    <View style={s.guideLeft}>
                      <View style={s.guideRankRow}>
                        <Text style={s.guideEmoji}>{g.emoji}</Text>
                        <Text style={[s.guideRank, isCurrent && s.guideRankCurrent]}>
                          {g.rank}
                        </Text>
                        {isCurrent && (
                          <View style={s.currentBadge}>
                            <Text style={s.currentBadgeText}>현재</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.guideMonths}>{g.months}</Text>
                    </View>

                    {/* 우측: 금액 + 바 */}
                    <View style={s.guideRight}>
                      <Text style={[s.guideAmount, isCurrent && { color: tc.primary }]}>
                        {formatMoney(g.amount)}원
                      </Text>
                      <View style={s.guideBarTrack}>
                        <View style={[
                          s.guideBarFill,
                          { width: `${barPct}%` },
                          isCurrent && { backgroundColor: tc.primary },
                        ]} />
                      </View>
                    </View>
                  </View>
                );
              })}
              <Text style={s.guideNote}>* 실제 지급액은 상이할 수 있습니다.</Text>
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
  guideEmoji: { fontSize: 16 },
  guideRank: { fontSize: 16, fontWeight: '700', color: tc.text },
  guideRankCurrent: { color: tc.primary },
  currentBadge: {
    backgroundColor: tc.primary, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 10, color: tc.white, fontWeight: '700' },
  guideMonths: { fontSize: 12, color: tc.textSecondary },
  guideRight: { alignItems: 'flex-end', minWidth: 130 },
  guideAmount: { fontSize: 16, fontWeight: '800', color: tc.text, marginBottom: 6 },
  guideBarTrack: {
    width: 120, height: 6,
    backgroundColor: tc.border, borderRadius: 3, overflow: 'hidden',
  },
  guideBarFill: {
    height: '100%', backgroundColor: tc.textLight, borderRadius: 3,
  },
  guideNote: { fontSize: 12, color: tc.textLight, textAlign: 'right', marginTop: 8, marginBottom: 4 },
});
