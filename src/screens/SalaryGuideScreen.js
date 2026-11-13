import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import PayTable from '../components/PayTable';
import { Screen, AppHeader, Section, Txt } from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { SALARY_GUIDE, SALARY_YEAR } from '../constants/salaryGuide';
import { SOLDIER_RANK_IMAGES } from '../constants/rankImages';
import { loadMilitaryInfo, loadRankPromotions } from '../utils/storage';
import { currentRankLabel } from '../utils/roadmapUtils';
import { calcServedMonths, rankFromServedMonths } from '../utils/dateUtils';
import { termsFor } from '../constants/serviceTerms';
import { space as sp } from '../theme/tokens';

export default function SalaryGuideScreen({ navigation }) {
  const [info, setInfo] = useState(null);
  const [promotions, setPromotions] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const mi = await loadMilitaryInfo();
          if (!alive || !mi) return;
          const promo = await loadRankPromotions(mi.enlistDate);
          if (alive) setInfo(mi);
          if (alive) setPromotions(promo);
        } catch (e) {
          if (__DEV__) console.warn('[SalaryGuideScreen] 로드 실패:', e && e.message);
        }
      })();
      return () => { alive = false; };
    }, [])
  );

  // 사회복무요원은 계급이 없다 — 복무개월로 환산한 현역병 계급을 강조한다 (참고용)
  const social = info?.personnelType === 'social';
  const currentRank = social ? rankFromServedMonths(calcServedMonths(info.enlistDate)) : currentRankLabel(info, promotions);
  const t = termsFor(info?.personnelType);

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
      ad={AD_UNITS.REFERENCE_BOTTOM}
      header={
        <AppHeader title="병사 월급 가이드" back />
      }
    >
      <Section index={0}>
        <Card>
          <SectionTitle icon="list-outline">계급별 표준 월급</SectionTitle>
          <Txt role="caption" tone="secondary" style={{ marginTop: sp.xs, marginBottom: sp.lg }}>
            {SALARY_YEAR}년 기준 계급별 표준 월급 참고표
          </Txt>
          {social ? (
            <Txt role="caption" tone="secondary" style={{ marginBottom: sp.lg }}>
              사회복무요원은 복무 기간에 따라 현역병 봉급 기준으로 받아요. 강조된 줄은 지금 복무개월에 해당하는 참고 구간이며, 식비·교통비 등은 따로 지급될 수 있어요.
            </Txt>
          ) : null}

          <PayTable
            rows={rows}
            currentKey={currentRank}
            note={`* ${SALARY_YEAR}년 기준. 실제 지급액은 상이할 수 있습니다. 장병내일준비적금 매칭지원금은 ${t.end} 시 일괄 지급되어 미포함.`}
          />
        </Card>
      </Section>
    </Screen>
  );
}
