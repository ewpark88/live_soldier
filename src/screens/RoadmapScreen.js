import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import RoadmapTimeline from '../components/RoadmapTimeline';
import JourneyRail from '../components/JourneyRail';
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
import { nextCadrePromotion, buildRoadmap } from '../utils/roadmapUtils';
import { hobongStatus } from '../utils/officerUtils';
import { nextPromotion, formatDateKo, calcProgress, calcServedMonths, calcDaysLeft } from '../utils/dateUtils';
import { hasSoldierRanks, isAlternative, isOfficer, termsFor } from '../constants/serviceTerms';
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

  const t = termsFor(info?.personnelType);
  const header = (
    <AppHeader title={t.roadmapTitle} back />
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
  // 간부는 기록한 진급 예정일(v1.6)이 있으면 그것을 호봉보다 먼저 보여준다
  const promo = hasSoldierRanks(info.personnelType) ? nextPromotion(promotions)
    : officer ? nextCadrePromotion(info) : null;
  // 전역일 뒤의 승급은 보여주지 않는다 — 전역했으면 null (호봉이 계속 오르지 않게)
  const hobong = officer ? hobongStatus(info.enlistDate, info.dischargeDate) : null;
  // 대체복무 (v1.6): 진급·호봉이 없다 — 복무 개월차와 남은 개월을 대신 보여준다
  const altLeft = isAlternative(info.personnelType) ? calcDaysLeft(info.dischargeDate) : 0;
  const served = calcServedMonths(info.enlistDate);
  const altNext = altLeft > 0
    ? {
        icon: 'hourglass-outline',
        label: `복무 ${served + 1}개월차 · 남은 ${Math.max(0, (Number(info.months) || 0) - served)}개월`,
        sub: `${formatDateKo(info.dischargeDate)} ${t.end}`,
        dday: altLeft,
      }
    : null;
  const roadmap = buildRoadmap(info, promotions);
  const progress = calcProgress(info.enlistDate, info.dischargeDate) / 100;

  const next = promo
    ? {
        icon: 'medal',
        label: `다음 진급 · ${promo.rank}`,
        sub: formatDateKo(promo.date),
        dday: promo.daysLeft,
      }
    : hobong && !hobong.last
    ? {
        icon: 'trending-up',
        label: `현재 ${hobong.current}호봉 · 다음 ${hobong.next}호봉`,
        sub: `${formatDateKo(hobong.nextDate)} 승급 예정`,
        dday: hobong.daysLeft,
      }
    : hobong
    ? {
        // 다음 승급일이 전역 뒤 — 복무 중 마지막 호봉이다. D-day 는 전역까지.
        icon: 'trending-up',
        label: `현재 ${hobong.current}호봉 · 복무 중 마지막 호봉`,
        sub: `${formatDateKo(info.dischargeDate)} ${t.end}`,
        dday: calcDaysLeft(info.dischargeDate),
      }
    : altNext;

  return (
    <Screen standalone header={header} ad={AD_UNITS.ROADMAP_BOTTOM}>
      {next ? (
        <Section index={0}>
          <HeroCard>
            <View style={s.nextRow}>
              <View style={s.nextIcon}>
                <Ionicons name={next.icon} size={22} color={tc.phase.normal.accent} />
              </View>

              <View style={{ flex: 1 }}>
                <Txt role="label" tone="hero" numberOfLines={1}>{next.label}</Txt>
                <Txt role="caption" tone="heroMuted" numberOfLines={1}>{next.sub}</Txt>
              </View>

              <View style={s.ddayWrap}>
                <Txt role="caption" tone="heroMuted">D-</Txt>
                <AnimatedNumber
                  value={next.dday}
                  style={[ty.statValue, { color: tc.phase.normal.accent }]}
                />
              </View>
            </View>
          </HeroCard>
        </Section>
      ) : null}

      {roadmap.length > 0 ? (
        <Section index={1}>
          <Card>
            <SectionTitle icon="map-outline">{t.roadmapTitle}</SectionTitle>
            <Txt role="caption" tone="secondary" style={{ marginTop: sp.xxs }}>
              {t.start}부터 {t.end}까지 주요 순간
            </Txt>

            {/* 한눈에 보는 여정 — 세로 타임라인은 항목을 읽게 하고,
               이 레일은 '지금 어디쯤'을 한 줄로 답한다. */}
            <JourneyRail milestones={roadmap} progress={progress} style={s.rail} />

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
              desc={`${t.startDate}과 ${t.endDate}이 등록되면 주요 순간이 자동으로 채워집니다.`}
              action={{
                label: `${t.info} 확인하기`,
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
    // 마커가 레일 위아래로 삐져나오므로 세로 여유를 준다
    rail: { marginTop: sp.lg, marginBottom: sp.xl, paddingVertical: sp.sm },
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
