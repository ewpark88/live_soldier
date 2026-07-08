import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeContext';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import RoadmapTimeline from '../components/RoadmapTimeline';
import AdBanner from '../components/AdBanner';
import MenuButton from '../components/MenuButton';
import SetupRequired from '../components/SetupRequired';
import FadeInView from '../components/FadeInView';
import { AD_UNITS } from '../constants/adUnits';
import { loadMilitaryInfo, loadRankPromotions } from '../utils/storage';
import { buildRoadmap } from '../utils/roadmapUtils';
import { nextHobongInfo } from '../utils/officerUtils';
import { nextPromotion, formatDateKo } from '../utils/dateUtils';
import { isOfficer } from '../constants/serviceTerms';

export default function RoadmapScreen({ navigation }) {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [info, setInfo] = useState(undefined); // undefined=로딩중
  const [promotions, setPromotions] = useState(null);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const mi = await loadMilitaryInfo();
    setInfo(mi ?? null);
    if (!mi) return;
    setPromotions(await loadRankPromotions(mi.enlistDate));
  };

  if (info === undefined) return <View style={s.container} />;
  if (!info) {
    return (
      <View style={s.container}>
        <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
          <Text style={s.pageTitle}>전역 로드맵</Text>
          <MenuButton navigation={navigation} current="roadmap" />
        </View>
        <SetupRequired />
      </View>
    );
  }

  const officer = isOfficer(info.personnelType);
  const promo   = officer ? null : nextPromotion(promotions);
  const hobong  = officer ? nextHobongInfo(info.enlistDate) : null;
  const roadmap = buildRoadmap(info, promotions);

  return (
    <View style={s.container}>
      <ScrollView
        style={s.scrollFlex}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.topBar}>
          <Text style={s.pageTitle}>전역 로드맵</Text>
          <MenuButton navigation={navigation} current="roadmap" />
        </View>

        {/* 다음 진급 카운트다운 (병사) */}
        {promo && (
          <FadeInView>
            <Card style={s.nextCard}>
              <Ionicons name="medal" size={26} color={tc.primary} />
              <View style={s.nextInfo}>
                <Text style={s.nextLabel}>다음 진급 · {promo.rank}</Text>
                <Text style={s.nextSub}>{formatDateKo(promo.date)}</Text>
              </View>
              <Text style={s.nextDday}>D-{promo.daysLeft}</Text>
            </Card>
          </FadeInView>
        )}

        {/* 다음 호봉 카운트다운 (간부) */}
        {hobong && (
          <FadeInView>
            <Card style={s.nextCard}>
              <Ionicons name="trending-up" size={26} color={tc.primary} />
              <View style={s.nextInfo}>
                <Text style={s.nextLabel}>현재 {hobong.current}호봉 · 다음 {hobong.next}호봉</Text>
                <Text style={s.nextSub}>{formatDateKo(hobong.nextDate)} 승급 예정</Text>
              </View>
              <Text style={s.nextDday}>D-{hobong.daysLeft}</Text>
            </Card>
          </FadeInView>
        )}

        {/* 전역 로드맵 타임라인 */}
        {roadmap.length > 0 && (
          <FadeInView delay={80}>
            <Card style={s.roadmapCard}>
              <SectionTitle icon="map-outline" size={16}>전역 로드맵</SectionTitle>
              <Text style={s.roadmapSub}>입대부터 전역까지 주요 순간</Text>
              <View style={{ marginTop: 14 }}>
                <RoadmapTimeline roadmap={roadmap} />
              </View>
            </Card>
          </FadeInView>
        )}

      </ScrollView>

      {/* ── 고정 배너 광고 (탭바 위, 스크롤 무관 항상 노출) ── */}
      <View style={s.adFooter}>
        <AdBanner unit={AD_UNITS.ROADMAP_BOTTOM} />
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

  nextCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18, gap: 12, marginBottom: 12 },
  nextInfo: { flex: 1 },
  nextLabel: { fontSize: 15, fontWeight: '700', color: tc.text },
  nextSub: { fontSize: 13, color: tc.textSecondary, marginTop: 2 },
  nextDday: { fontSize: 22, fontWeight: '900', color: tc.primary, letterSpacing: -0.5 },

  roadmapCard: { marginBottom: 12 },
  roadmapSub: { fontSize: 12.5, color: tc.textSecondary, marginTop: 2 },
});
