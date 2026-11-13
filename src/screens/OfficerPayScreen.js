import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import PayTable from '../components/PayTable';
import { Screen, AppHeader, Section, Txt } from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { OFFICER_PAY_GUIDE, OFFICER_PAY_YEAR } from '../constants/militaryRanks';
import { OFFICER_RANK_IMAGES } from '../constants/rankImages';
import { loadMilitaryInfo } from '../utils/storage';
import { isOfficer } from '../constants/serviceTerms';
import { space as sp } from '../theme/tokens';

export default function OfficerPayScreen({ navigation }) {
  const [officerRank, setOfficerRank] = useState(null);
  const [isCadre, setIsCadre] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const mi = await loadMilitaryInfo();
          if (alive) {
            setOfficerRank(mi?.officerRank ?? null);
            setIsCadre(isOfficer(mi?.personnelType));
          }
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
      ad={AD_UNITS.REFERENCE_BOTTOM}
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
          {isCadre && !officerRank ? (
            <Txt role="caption" tone="secondary" style={{ marginBottom: sp.md }}>
              임관 정보에서 계급을 고르면 내 계급이 표시돼요.
            </Txt>
          ) : null}

          <PayTable
            rows={rows}
            currentKey={officerRank}
            note={`* ${OFFICER_PAY_YEAR}년 군인 봉급표(공무원보수규정 별표13) 기준 1호봉 기본급. 호봉·각종 수당 미반영 — 정확한 금액은 급여 탭에서 직접 입력하세요.`}
          />
        </Card>
      </Section>
    </Screen>
  );
}
