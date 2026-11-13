import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import ProgressBar from '../components/ProgressBar';
import SetupRequired from '../components/SetupRequired';
import {
  Screen,
  AppHeader,
  Section,
  HeroCard,
  Button,
  Chip,
  StatTile,
  ListRow,
  Txt,
  AnimatedNumber,
  TextField,
  ListGroup,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { loadMilitaryInfo, loadSalaryInfo, saveSalaryInfo, loadRankPromotions } from '../utils/storage';
import { calcServedMonths, rankFromServedMonths } from '../utils/dateUtils';
import { cadreCurrentRank, currentRankLabel } from '../utils/roadmapUtils';
import { isAlternative, isOfficer, josa, savingsEligible, termsFor } from '../constants/serviceTerms';
import { benefitsFor } from '../constants/benefits';
import { getOfficerBasePay, OFFICER_PAY_YEAR } from '../constants/militaryRanks';
import { calcHobong } from '../utils/officerUtils';
import { SALARY_GUIDE, getSalaryByRank, formatMoney, calcStandardTotal } from '../constants/salaryGuide';
import { haptic } from '../utils/haptics';
import { guardSave, SAVE_FAILED } from '../utils/saveGuard';
import useShowInterstitial from '../hooks/useShowInterstitial';
import { useSaving } from '../hooks/useSaving';
import { useThemeColors } from '../theme/ThemeContext';
import { space as sp, type as ty } from '../theme/tokens';

export default function SalaryScreen({ navigation }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [militaryInfo, setMilitaryInfo] = useState(undefined);
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [promotions, setPromotions] = useState(null);
  const [customMode, setCustomMode] = useState(false);
  const [customSalary, setCustomSalary] = useState('');
  const [totalMonths, setTotalMonths] = useState('');
  const { saving, savingRef, run: runSave } = useSaving();

  /* 급여 정보 저장은 '주요 저장' 이라 전면 광고 지점이다 (하루 2회·30분 간격은
     adManager 가 강제한다). 직접 입력 폼이 열려 있을 때만 프리로드한다. */
  const { show: showAd } = useShowInterstitial(customMode);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  /* 입력 폼을 저장된 값(없으면 표준값)으로 되돌린다. 취소했는데 버린 입력이
     다음에 폼을 열 때 그대로 남아 있던 문제 — 로드와 취소가 같은 규칙을 쓴다. */
  const resetForm = (si, mi) => {
    setCustomSalary(si ? String(si.monthlyAmount) : '');
    setTotalMonths(si ? String(si.totalMonths) : String(mi?.months ?? ''));
  };

  const customOpen = useRef(false);
  customOpen.current = customMode;

  const loadData = async () => {
    try {
      const mi = await loadMilitaryInfo();
      setMilitaryInfo(mi);
      const si = await loadSalaryInfo();
      setSalaryInfo(si);
      // 직접 입력 폼을 열어 둔 채 탭을 떠났다 오면 입력 중인 값을 덮지 않는다
      if (!customOpen.current) resetForm(si, mi);
      setPromotions(await loadRankPromotions(mi?.enlistDate));
    } catch (e) {
      // 빈 화면에 갇히지 않게 — 미설정 안내로 떨어진다
      setMilitaryInfo((prev) => (prev === undefined ? null : prev));
    }
  };

  const handleCancel = () => {
    resetForm(salaryInfo, militaryInfo);
    setCustomMode(false);
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    const salary = parseInt(customSalary.replace(/,/g, ''), 10);
    const months = parseInt(totalMonths, 10);
    // 0원은 '직접 입력' 모드로 들어가 0원·0원을 그리기만 한다 — 1원 이상만 받는다
    if (isNaN(salary) || salary < 1) {
      haptic.warning();
      Alert.alert('오류', '월급을 올바르게 입력해주세요.');
      return;
    }
    if (isNaN(months) || months < 1 || months > 240) {
      haptic.warning();
      Alert.alert('오류', '복무 개월 수를 올바르게 입력해주세요 (1~240).');
      return;
    }
    const si = { monthlyAmount: salary, totalMonths: months };
    const res = await runSave(() => guardSave(() => saveSalaryInfo(si)));
    if (res === undefined || res === SAVE_FAILED) return;
    setSalaryInfo(si);
    setCustomMode(false);
    haptic.success();
    showAd();
  };

  const handleResetToStandard = () => {
    // 간부·대체복무에게 '표준 급여표'는 없다 — 지우면 무엇으로 돌아가는지 신분별로 말한다
    const pt0 = militaryInfo?.personnelType;
    const back = isOfficer(pt0)
      ? (getOfficerBasePay(cadreCurrentRank(militaryInfo) ?? militaryInfo?.officerRank) ? '초임(1호봉) 참고값으로 돌아갑니다.' : '참고 봉급이 없는 계급이라 다시 직접 입력해야 해요.')
      : (isAlternative(pt0) && pt0 !== 'social') ? '다시 직접 입력해야 해요.'
        : pt0 === 'social' ? '현역병 급여표 참고값으로 돌아갑니다.' : '표준 급여표로 돌아갑니다.';
    Alert.alert('직접 입력 삭제', `직접 입력한 급여를 삭제할까요?
${back}`, [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        style: 'destructive',
        onPress: async () => {
          if ((await guardSave(() => saveSalaryInfo(null))) === SAVE_FAILED) return;
          setSalaryInfo(null);
          setCustomMode(false);
          resetForm(null, militaryInfo);
        },
      },
    ]);
  };

  if (militaryInfo === undefined) return <Screen scroll={false} />;
  if (!militaryInfo) {
    // 헤더·안전영역 없이 맨 컴포넌트만 그리던 분기 — 다른 탭과 같은 껍데기를 쓴다
    return (
      <Screen scroll={false} header={<AppHeader title="급여 계산" />}>
        <SetupRequired />
      </Screen>
    );
  }

  const pt = militaryInfo.personnelType;
  const t = termsFor(pt);
  const officer = isOfficer(pt);
  /* 대체복무 (v1.6): 사회복무요원은 현역병 봉급표를 복무개월 기준 참고값으로 쓰고,
     그 외(산업기능·전문연구·전문직·예술체육)는 근무처 급여라 직접 입력해야 한다. */
  const alt = isAlternative(pt);
  const social = pt === 'social';
  const manualOnly = officer || (alt && !social);   // 표준 봉급표를 쓰지 않는 신분
  const usesSoldierTable = !manualOnly;             // 병사·사회복무요원
  const servedMonths = calcServedMonths(militaryInfo.enlistDate);
  // 간부 진급 이력(v1.6)이 있으면 오늘 기준 계급으로 봉급 참고값을 찾는다
  const officerRank = officer ? (cadreCurrentRank(militaryInfo) ?? militaryInfo.officerRank ?? null) : null;
  const officerBase = officer ? getOfficerBasePay(officerRank) : null;
  const hobong = officer ? calcHobong(militaryInfo.enlistDate) : null;

  const currentRank = currentRankLabel(militaryInfo, promotions);
  // 봉급표를 찾을 계급 — 사회복무요원은 계급이 없으니 복무개월로 현역병 계급을 환산한다
  const payRank = social ? rankFromServedMonths(servedMonths) : currentRank;

  // 우선순위: 직접입력 > (간부)초임 참고값 > (병사·사회복무요원)봉급표 > (그 외 대체복무)0
  const currentMonthly = salaryInfo
    ? salaryInfo.monthlyAmount
    : officer ? (officerBase ?? 0) : manualOnly ? 0 : getSalaryByRank(payRank);

  const displayTotalMonths = salaryInfo?.totalMonths ?? militaryInfo?.months ?? 0;
  const totalSalary = salaryInfo
    ? salaryInfo.monthlyAmount * salaryInfo.totalMonths
    : officer
      ? (officerBase ? officerBase * displayTotalMonths : 0)
      : manualOnly ? 0 : calcStandardTotal(displayTotalMonths);
  const earnedSalary = salaryInfo
    ? salaryInfo.monthlyAmount * Math.min(servedMonths, salaryInfo.totalMonths)
    : officer
      ? (officerBase ? officerBase * Math.min(servedMonths, displayTotalMonths) : 0)
      : manualOnly ? 0 : calcStandardTotal(Math.min(servedMonths, displayTotalMonths));  // 전역 후 계속 늘지 않도록 상한

  const earnedRatio = totalSalary > 0 ? Math.min(1, earnedSalary / totalSalary) : 0;
  const earnedPercent = Math.floor(earnedRatio * 100);

  /* 계급이 바뀌는 지점을 바 위에 눈금으로 찍는다 — 바가 어디서 한 단
     가팔라지는지 보이면 "진급하면 월급이 오른다"가 숫자 없이 읽힌다.
     표준 봉급표를 쓰는 병사에게만 의미가 있다 (직접 입력·간부는 단일 단가). */
  const rankTicks = (!salaryInfo && usesSoldierTable && totalSalary > 0)
    ? SALARY_GUIDE.slice(1).map((g) => calcStandardTotal(g.start) / totalSalary)
    : undefined;

  const isCustom = !!salaryInfo;
  const needInput = manualOnly && !salaryInfo && !officerBase;
  const socialEstimate = social && !salaryInfo;
  const showBenefits = benefitsFor(pt).length > 0;
  const officerEstimate = officer && !salaryInfo && !!officerBase;

  return (
    <Screen
      ad={AD_UNITS.SALARY_BOTTOM}
      header={<AppHeader title="급여 계산" />}
    >
      {/* ① 이번 달 예상 급여 */}
      <Section index={0}>
        <HeroCard>
          <View style={s.pillRow}>
            {/* 히어로 위 칩은 onHero — tone="accent" 의 accentSoft 바탕은 밝은 히어로에 묻혔다 */}
            <Chip label={currentRank} size="sm" onHero />
            {isCustom ? <Chip label="직접 입력" size="sm" onHero /> : null}
            {officerEstimate ? <Chip label="초임 기준 추정" size="sm" onHero /> : null}
            {officer && hobong ? <Chip label={`${hobong}호봉(추정)`} size="sm" onHero /> : null}
            {socialEstimate ? <Chip label="현역병 기준 참고" size="sm" onHero /> : null}
          </View>

          <Txt role="label" tone="heroMuted" style={{ marginTop: sp.md }}>
            이번 달 예상 급여
          </Txt>

          {needInput ? (
            <Txt role="subtitle" tone="hero" style={{ marginTop: sp.xs }}>
              아래에서 급여를{'\n'}직접 입력해주세요
            </Txt>
          ) : (
            <View style={s.amountRow}>
              <AnimatedNumber
                value={currentMonthly}
                comma
                style={[ty.hero, { color: tc.heroText }]}
              />
              <Txt role="subtitle" tone="hero">원</Txt>
            </View>
          )}

          <Txt role="caption" tone="heroMuted">
            복무 {servedMonths}개월째
          </Txt>
          {officer && needInput ? (
            <Txt role="micro" tone="heroMuted" style={{ marginTop: sp.sm }}>
              {officerRank
                ? `* ${josa(officerRank, '은/는')} 참고 봉급 자료가 없어요. 실제 월급을 직접 입력하세요.`
                : `* ${t.infoScreen}에서 계급을 고르면 초임 참고값이 들어가요. 직접 입력도 할 수 있어요.`}
            </Txt>
          ) : null}

          {officerEstimate ? (
            <Txt role="micro" tone="heroMuted" style={{ marginTop: sp.sm }}>
              * {OFFICER_PAY_YEAR}년 1호봉 기본급 기준 추정치. 호봉·수당 미반영 — 정확한 금액은 직접 입력하세요.
            </Txt>
          ) : null}
          {socialEstimate ? (
            <Txt role="micro" tone="heroMuted" style={{ marginTop: sp.sm }}>
              * 복무개월에 맞춘 현역병 봉급 기준 참고치. 식비·교통비 등 실제 지급액은 다를 수 있어 직접 입력할 수 있어요.
            </Txt>
          ) : null}
        </HeroCard>
      </Section>

      {/* ② 급여 현황 */}
      <Section index={1}>
        <Card>
          <SectionTitle icon="wallet-outline">급여 현황</SectionTitle>

          <View style={s.totalRow}>
            <View style={{ flex: 1 }}>
              <Txt role="bodySm" tone="secondary">총 수령 예정액</Txt>
              <Txt role="micro" tone="light">
                {officerEstimate
                  ? `초임 월급 × ${displayTotalMonths}개월 단순 추정 (호봉·진급 미반영)`
                  : `복무 ${displayTotalMonths}개월 기준`}
              </Txt>
            </View>
            <Txt role="subtitle" numeric style={{ fontWeight: '800' }}>
              {formatMoney(totalSalary)}원
            </Txt>
          </View>

          <View style={s.progressHead}>
            <Txt role="caption" tone="secondary">현재까지 수령</Txt>
            <Txt role="label" tone="primary" numeric>{earnedPercent}%</Txt>
          </View>
          <ProgressBar progress={earnedRatio} height={10} ticks={rankTicks} />
          {rankTicks ? (
            <Txt role="micro" tone="light" style={{ marginTop: sp.xs }}>
              {social ? '눈금은 현역병 기준 봉급이 바뀌는 지점이에요' : '눈금은 계급이 바뀌는 지점이에요'}
            </Txt>
          ) : null}

          {/* 금액 타일은 값이 길다(12,345,678) — StatTile 이 폭에 맞춰 글자를 줄인다 */}
          <View style={s.statRow}>
            <StatTile label="수령" value={formatMoney(earnedSalary)} unit="원" tone="primary" />
            <StatTile
              label="남음"
              value={formatMoney(Math.max(0, totalSalary - earnedSalary))}
              unit="원"
            />
          </View>
        </Card>
      </Section>

      {/* ③ 급여 설정 */}
      <Section index={2}>
        <Card>
          <SectionTitle icon="options-outline">급여 설정</SectionTitle>

          {!customMode ? (
            <View style={{ marginTop: sp.md }}>
              <View style={s.settingRow}>
                <Txt role="bodySm" tone="secondary">현재 기준</Txt>
                <Txt role="bodySm" style={{ fontWeight: '700', flexShrink: 1, textAlign: 'right' }}>
                  {isCustom
                    ? `직접 입력 (${formatMoney(salaryInfo.monthlyAmount)}원/월)`
                    : manualOnly ? '직접 입력 필요' : social ? '현역병 급여표 참고 적용' : '표준 급여표 자동 적용'}
                </Txt>
              </View>

              <View style={s.btnRow}>
                <Button
                  title={isCustom ? '수정' : '직접 입력하기'}
                  icon={isCustom ? 'create-outline' : 'add'}
                  variant="secondary"
                  onPress={() => setCustomMode(true)}
                  style={{ flex: 1 }}
                />
                {isCustom ? (
                  <Button
                    title={usesSoldierTable ? '표준으로 초기화' : '직접 입력 삭제'}
                    variant="ghost"
                    onPress={handleResetToStandard}
                    style={{ flex: 1 }}
                  />
                ) : null}
              </View>
            </View>
          ) : (
            <View style={s.form}>
              <TextField
                label="월 지급액"
                value={customSalary}
                onChangeText={(t) => setCustomSalary(t.replace(/[^0-9]/g, ''))}
                placeholder="예: 1000000"
                keyboardType="number-pad"
                suffix="원"
                hint={customSalary ? `${formatMoney(parseInt(customSalary, 10) || 0)}원` : undefined}
                maxLength={9}   // 길이 제한이 없으면 22자리부터 formatMoney 가 '1e+21' 을 찍는다
              />

              <TextField
                label="총 복무 개월 수"
                value={totalMonths}
                onChangeText={(t) => setTotalMonths(t.replace(/[^0-9]/g, ''))}
                placeholder={officer ? '예: 48' : '예: 18'}
                keyboardType="number-pad"
                suffix="개월"
                maxLength={3}
              />

              <View style={s.btnRow}>
                <Button
                  title="취소"
                  variant="ghost"
                  onPress={handleCancel}
                  style={{ flex: 1 }}
                />
                <Button title="저장" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          )}
        </Card>
      </Section>

      {/* ④ 급여 관련 화면 — 지금까지 햄버거 메뉴에만 있어서 아무도 못 찾았다 */}
      {(usesSoldierTable || officer || savingsEligible(pt) || showBenefits) ? (
      <Section index={3}>
        <ListGroup>
          {usesSoldierTable ? (
            <ListRow
              title="병사 월급 가이드"
              subtitle={social ? '현역병 계급별 월급 (사회복무요원 참고)' : '계급별 표준 월급 참고표'}
              icon="list-outline"
              chevron
              onPress={() => navigation.navigate('salaryGuide')}
            />
          ) : officer ? (
            <ListRow
              title="간부 봉급 참고"
              subtitle="초임(1호봉) 월 기본급"
              icon="list-outline"
              chevron
              onPress={() => navigation.navigate('officerPay')}
            />
          ) : null}
          {savingsEligible(pt) ? (
            <ListRow
              title="장병내일적금 계산기"
              subtitle={`${t.end} 시 받을 목돈을 미리 계산`}
              icon="calculator-outline"
              iconTone="success"
              chevron
              onPress={() => navigation.navigate('savings')}
            />
          ) : null}
          {showBenefits ? (
            <ListRow
              title={t.benefitsTitle}
              subtitle="금융·교통·문화·자기계발 할인과 지원"
              icon="gift-outline"
              iconTone="neutral"
              chevron
              onPress={() => navigation.navigate('benefits')}
            />
          ) : null}
        </ListGroup>
      </Section>
      ) : null}
    </Screen>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
    amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: sp.xs, marginTop: sp.xxs },

    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.sm,
      marginTop: sp.md,
      marginBottom: sp.lg,
    },
    progressHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: sp.sm,
    },
    statRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },

    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: sp.md,
      marginBottom: sp.lg,
    },
    btnRow: { flexDirection: 'row', gap: sp.sm },
    form: { marginTop: sp.md, gap: sp.lg },
  });
