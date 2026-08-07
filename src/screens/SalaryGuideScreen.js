import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import PayTable from '../components/PayTable';
import { Screen, AppHeader, Section, Txt } from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { SALARY_GUIDE } from '../constants/salaryGuide';
import { SOLDIER_RANK_IMAGES } from '../constants/rankImages';
import { loadMilitaryInfo, loadRankPromotions } from '../utils/storage';
import { calcRankFromPromotions } from '../utils/dateUtils';
import { space as sp } from '../theme/tokens';

export default function SalaryGuideScreen({ navigation }) {
  const [promotions, setPromotions] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadMilitaryInfo().then((mi) => {
        if (mi) loadRankPromotions(mi.enlistDate).then(setPromotions);
      });
    }, [])
  );

  const currentRank = calcRankFromPromotions(promotions);

  const rows = SALARY_GUIDE.map((g) => ({
    key: g.rank,
    title: g.rank,
    sub: g.months,
    amount: g.amount,
    image: SOLDIER_RANK_IMAGES[g.rank],
  }));

  return (
    <Screen
      standalone
      ad={AD_UNITS.SALARY_MIDDLE}
      header={
        <AppHeader title="병사 월급 가이드" back />
      }
    >
      <Section index={0}>
        <Card>
          <SectionTitle icon="list-outline">계급별 표준 월급</SectionTitle>
          <Txt role="caption" tone="secondary" style={{ marginTop: sp.xs, marginBottom: sp.lg }}>
            계급별 표준 월급 참고표
          </Txt>

          <PayTable
            rows={rows}
            currentKey={currentRank}
            note="* 실제 지급액은 상이할 수 있습니다."
          />
        </Card>
      </Section>
    </Screen>
  );
}
