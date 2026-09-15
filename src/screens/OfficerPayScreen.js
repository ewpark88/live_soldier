import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import PayTable from '../components/PayTable';
import { Screen, AppHeader, Section, Txt } from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { OFFICER_PAY_GUIDE } from '../constants/militaryRanks';
import { OFFICER_RANK_IMAGES } from '../constants/rankImages';
import { loadMilitaryInfo } from '../utils/storage';
import { space as sp } from '../theme/tokens';

export default function OfficerPayScreen({ navigation }) {
  const [officerRank, setOfficerRank] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const mi = await loadMilitaryInfo();
          if (alive) setOfficerRank(mi?.officerRank ?? null);
        } catch (e) {
          if (__DEV__) console.warn('[OfficerPayScreen] 로드 실패:', e && e.message);
          if (alive) setOfficerRank(null);
        }
      })();
      return () => { alive = false; };
    }, [])
  );

  const rows = OFFICER_PAY_GUIDE.map((g) => ({
    key: g.rank,
    title: g.rank,
    sub: g.group,
    amount: g.amount,
    image: OFFICER_RANK_IMAGES[g.rank],
  }));

  return (
    <Screen
      standalone
      ad={AD_UNITS.SALARY_MIDDLE}
      header={
        <AppHeader title="간부 봉급 참고" back />
      }
    >
      <Section index={0}>
        <Card>
          <SectionTitle icon="list-outline">계급별 기본급</SectionTitle>
          <Txt role="caption" tone="secondary" style={{ marginTop: sp.xs, marginBottom: sp.lg }}>
            초임(1호봉) 월 기본급 · 참고용
          </Txt>

          <PayTable
            rows={rows}
            currentKey={officerRank}
            note="* 2025년 초임(1호봉) 기준 추정. 호봉·각종 수당 미반영, 정확한 금액은 직접 입력하세요."
          />
        </Card>
      </Section>
    </Screen>
  );
}
