import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import RoadmapTimeline from '../components/RoadmapTimeline';
import SetupRequired from '../components/SetupRequired';
import {
  Screen,
  AppHeader,
  Section,
  HeroCard,
  EmptyState,
  Txt,
  AnimatedNumber,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { loadMilitaryInfo, loadRankPromotions } from '../utils/storage';
import { buildRoadmap } from '../utils/roadmapUtils';
import { nextHobongInfo } from '../utils/officerUtils';
import { nextPromotion, formatDateKo } from '../utils/dateUtils';
import { isOfficer } from '../constants/serviceTerms';
import { useThemeColors } from '../theme/ThemeContext';
import { space as sp, type as ty } from '../theme/tokens';

export default function RoadmapScreen({ navigation }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [info, setInfo] = useState(undefined); // undefined = 로딩중
  const [promotions, setPromotions] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const mi = await loadMilitaryInfo();
          if (!alive) return;
          setInfo(mi ?? null);
          if (mi) {
            const promo = await loadRankPromotions(mi.enlistDate);
            if (alive) setPromotions(promo);
          }
        } catch (e) {
          if (__DEV__) console.warn('[RoadmapScreen] 로드 실패:', e && e.message);
          if (alive) setInfo(null);   // 로딩 상태로 멈추지 않게
        }
      })();
      return () => { alive = false; };
    }, [])
  );

  const header = (
    <AppHeader title="전역 로드맵" back />
  );

  if (info === undefined) {
    return <Screen scroll={false} standalone header={header} ad={AD_UNITS.ROADMAP_BOTTOM} />;
  }

  // 입대 정보 없음 — 예전엔 이 분기가 패딩 없는 topBar 를 직접 그려서
  // 제목이 x=0 에 붙어 있었다. 이제 로딩/정상/빈 상태가 모두 같은
  // Screen + AppHeader 를 지나므로 구조적으로 재발할 수 없다.
  if (!info) {
    return (
      <Screen scroll={false} standalone header={header} ad={AD_UNITS.ROADMAP_BOTTOM}>
        <SetupRequired />
      </Screen>
    );
  }

  const officer = isOfficer(info.personnelType);
  const promo = officer ? null : nextPromotion(promotions);
  const hobong = officer ? nextHobongInfo(info.enlistDate) : null;
  const roadmap = buildRoadmap(info, promotions);

  const next = promo
    ? {
        icon: 'medal',
        label: `다음 진급 · ${promo.rank}`,
        sub: formatDateKo(promo.date),
        dday: promo.daysLeft,
      }
    : hobong
    ? {
        icon: 'trending-up',
        label: `현재 ${hobong.current}호봉 · 다음 ${hobong.next}호봉`,
        sub: `${formatDateKo(hobong.nextDate)} 승급 예정`,
        dday: hobong.daysLeft,
      }
    : null;

  return (
    <Screen standalone header={header} ad={AD_UNITS.ROADMAP_BOTTOM}>
      {next ? (
        <Section index={0}>
          <HeroCard>
            <View style={s.nextRow}>
              <View style={s.nextIcon}>
                <Ionicons name={next.icon} size={22} color={tc.accentLight} />
              </View>

              <View style={{ flex: 1 }}>
                <Txt role="label" tone="hero" numberOfLines={1}>{next.label}</Txt>
                <Txt role="caption" tone="heroMuted" numberOfLines={1}>{next.sub}</Txt>
              </View>

              <View style={s.ddayWrap}>
                <Txt role="caption" tone="heroMuted">D-</Txt>
                <AnimatedNumber
                  value={next.dday}
                  style={[ty.statValue, { color: tc.accentLight }]}
                />
              </View>
            </View>
          </HeroCard>
        </Section>
      ) : null}

      {roadmap.length > 0 ? (
        <Section index={1}>
          <Card>
            <SectionTitle icon="map-outline">전역 로드맵</SectionTitle>
            <Txt role="caption" tone="secondary" style={{ marginTop: sp.xxs, marginBottom: sp.lg }}>
              입대부터 전역까지 주요 순간
            </Txt>
            <RoadmapTimeline roadmap={roadmap} />
          </Card>
        </Section>
      ) : (
        // 예전엔 여기서 아무것도 안 그려서 완전히 빈 스크롤뷰만 남았다
        <Section index={1}>
          <Card>
            <EmptyState
              icon="map-outline"
              title="아직 표시할 로드맵이 없어요"
              desc="입대일과 전역일이 등록되면 주요 순간이 자동으로 채워집니다."
              action={{
                label: '입대 정보 확인하기',
                icon: 'create-outline',
                onPress: () => navigation.navigate('discharge'),
              }}
              compact
            />
          </Card>
        </Section>
      )}
    </Screen>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    nextRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    nextIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tc.heroSheen,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tc.heroBorder,
    },
    ddayWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  });
