import React, { useState, useCallback, useMemo } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
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
  Divider,
  Txt,
  AnimatedNumber,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { loadMilitaryInfo, loadSalaryInfo, saveSalaryInfo, loadRankPromotions } from '../utils/storage';
import { calcServedMonths, calcRankFromPromotions } from '../utils/dateUtils';
import { isOfficer, personnelLabel } from '../constants/serviceTerms';
import { getOfficerBasePay } from '../constants/militaryRanks';
import { calcHobong } from '../utils/officerUtils';
import { SALARY_GUIDE, getSalaryByRank, getRankByMonths, formatMoney } from '../constants/salaryGuide';
import { haptic } from '../utils/haptics';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../theme/tokens';

/* 표준 기준 총 복무 예상 수령액 */
function calcStandardTotal(totalM) {
  let total = 0;
  SALARY_GUIDE.forEach((s) => {
    const effective = Math.max(0, Math.min(s.end, totalM - 1) - s.start + 1);
    total += effective * s.amount;
  });
  return total;
}

export default function SalaryScreen({ navigation }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [militaryInfo, setMilitaryInfo] = useState(undefined);
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [promotions, setPromotions] = useState(null);
  const [customMode, setCustomMode] = useState(false);
  const [customSalary, setCustomSalary] = useState('');
  const [totalMonths, setTotalMonths] = useState('');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const mi = await loadMilitaryInfo();
    setMilitaryInfo(mi);
    const si = await loadSalaryInfo();
    setSalaryInfo(si);
    if (si) {
      setCustomSalary(String(si.monthlyAmount));
      setTotalMonths(String(si.totalMonths));
    } else if (mi) {
      setTotalMonths(String(mi.months));
    }
    setPromotions(await loadRankPromotions(mi?.enlistDate));
  };

  const handleSave = async () => {
    const salary = parseInt(customSalary.replace(/,/g, ''), 10);
    const months = parseInt(totalMonths, 10);
    if (isNaN(salary) || salary < 0) {
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
    await saveSalaryInfo(si);
    setSalaryInfo(si);
    setCustomMode(false);
    haptic.success();
  };

  const handleResetToStandard = () => {
    Alert.alert('표준 급여로 초기화', '직접 입력한 급여를 삭제하고 표준 급여표를 사용할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '초기화',
        style: 'destructive',
        onPress: async () => {
          await saveSalaryInfo(null);
          setSalaryInfo(null);
          setCustomMode(false);
          setCustomSalary('');
          setTotalMonths(String(militaryInfo?.months ?? ''));
        },
      },
    ]);
  };

  if (militaryInfo === undefined) return <Screen scroll={false} />;
  if (!militaryInfo) return <SetupRequired />;

  const officer = isOfficer(militaryInfo.personnelType);
  const servedMonths = calcServedMonths(militaryInfo.enlistDate);
  const officerRank = militaryInfo.officerRank ?? null;
  const officerBase = officer ? getOfficerBasePay(officerRank) : null;
  const hobong = officer ? calcHobong(militaryInfo.enlistDate) : null;

  const currentRank = officer
    ? (officerRank ?? personnelLabel(militaryInfo.personnelType))
    : (calcRankFromPromotions(promotions) ?? getRankByMonths(servedMonths));

  // 우선순위: 직접입력 > (간부)초임 참고값 > (병사)봉급표
  const currentMonthly = salaryInfo
    ? salaryInfo.monthlyAmount
    : officer ? (officerBase ?? 0) : getSalaryByRank(currentRank);

  const displayTotalMonths = salaryInfo?.totalMonths ?? militaryInfo?.months ?? 0;
  const totalSalary = salaryInfo
    ? salaryInfo.monthlyAmount * salaryInfo.totalMonths
    : officer
      ? (officerBase ? officerBase * displayTotalMonths : 0)
      : calcStandardTotal(militaryInfo.months);
  const earnedSalary = salaryInfo
    ? salaryInfo.monthlyAmount * Math.min(servedMonths, salaryInfo.totalMonths)
    : officer
      ? (officerBase ? officerBase * Math.min(servedMonths, displayTotalMonths) : 0)
      : calcStandardTotal(Math.min(servedMonths, militaryInfo.months));  // 전역 후 계속 늘지 않도록 상한

  const earnedRatio = totalSalary > 0 ? Math.min(1, earnedSalary / totalSalary) : 0;
  const earnedPercent = Math.floor(earnedRatio * 100);

  const isCustom = !!salaryInfo;
  const needInput = officer && !salaryInfo && !officerBase;
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
            <Chip label={currentRank} size="sm" tone="accent" />
            {isCustom ? <Chip label="직접 입력" size="sm" /> : null}
            {officerEstimate ? <Chip label="초임 기준 추정" size="sm" /> : null}
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
            복무 {servedMonths}개월째{officer && hobong ? ` · ${hobong}호봉` : ''}
          </Txt>

          {officerEstimate ? (
            <Txt role="micro" tone="heroMuted" style={{ marginTop: sp.sm }}>
              * 2025년 초임(1호봉) 기준 추정치. 호봉·수당 미반영 — 정확한 금액은 직접 입력하세요.
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
              <Txt role="micro" tone="light">복무 {displayTotalMonths}개월 기준</Txt>
            </View>
            <Txt role="subtitle" numeric style={{ fontWeight: '800' }}>
              {formatMoney(totalSalary)}원
            </Txt>
          </View>

          <View style={s.progressHead}>
            <Txt role="caption" tone="secondary">현재까지 수령</Txt>
            <Txt role="label" tone="primary" numeric>{earnedPercent}%</Txt>
          </View>
          <ProgressBar progress={earnedRatio} height={10} />

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
                    : officer ? '직접 입력 필요' : '표준 급여표 자동 적용'}
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
                    title="표준으로 초기화"
                    variant="ghost"
                    onPress={handleResetToStandard}
                    style={{ flex: 1 }}
                  />
                ) : null}
              </View>
            </View>
          ) : (
            <View style={{ marginTop: sp.md }}>
              <Txt role="label" tone="secondary" style={s.formLabel}>월 지급액 (원)</Txt>
              <TextInput
                style={s.input}
                value={customSalary}
                onChangeText={(t) => setCustomSalary(t.replace(/[^0-9]/g, ''))}
                placeholder="예: 1000000"
                placeholderTextColor={tc.textLight}
                keyboardType="number-pad"
              />

              <Txt role="label" tone="secondary" style={s.formLabel}>총 복무 개월 수</Txt>
              <TextInput
                style={s.input}
                value={totalMonths}
                onChangeText={(t) => setTotalMonths(t.replace(/[^0-9]/g, ''))}
                placeholder="예: 18"
                placeholderTextColor={tc.textLight}
                keyboardType="number-pad"
                maxLength={3}
              />

              <View style={s.btnRow}>
                <Button
                  title="취소"
                  variant="ghost"
                  onPress={() => setCustomMode(false)}
                  style={{ flex: 1 }}
                />
                <Button title="저장" onPress={handleSave} style={{ flex: 1 }} />
              </View>
            </View>
          )}
        </Card>
      </Section>

      {/* ④ 급여 관련 화면 — 지금까지 햄버거 메뉴에만 있어서 아무도 못 찾았다 */}
      <Section index={3}>
        <Card pad="none" style={{ paddingHorizontal: 0 }}>
          {!officer ? (
            <>
              <ListRow
                title="병사 월급 가이드"
                subtitle="계급별 표준 월급 참고표"
                icon="list-outline"
                chevron
                onPress={() => navigation.navigate('salaryGuide')}
                style={s.navRow}
              />
              <Divider inset={sp.lg + 48} />
            </>
          ) : (
            <>
              <ListRow
                title="간부 봉급 참고"
                subtitle="초임(1호봉) 월 기본급"
                icon="list-outline"
                chevron
                onPress={() => navigation.navigate('officerPay')}
                style={s.navRow}
              />
              <Divider inset={sp.lg + 48} />
            </>
          )}
          <ListRow
            title="장병내일적금 계산기"
            subtitle="전역 시 받을 목돈을 미리 계산"
            icon="calculator-outline"
            iconTone="accent"
            chevron
            onPress={() => navigation.navigate('savings')}
            style={s.navRow}
          />
          <Divider inset={sp.lg + 48} />
          <ListRow
            title="군인 혜택 모음"
            subtitle="금융·교통·문화·자기계발 할인과 지원"
            icon="gift-outline"
            iconTone="success"
            chevron
            onPress={() => navigation.navigate('benefits')}
            style={s.navRow}
          />
        </Card>
      </Section>
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
    formLabel: { marginBottom: sp.sm, marginTop: sp.sm },
    input: {
      backgroundColor: tc.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tc.surfaceSunkenBorder,
      borderRadius: r.sm,
      paddingHorizontal: sp.md,
      paddingVertical: sp.md,
      ...ty.bodyLg,
      color: tc.text,
      marginBottom: sp.sm,
    },
    navRow: { paddingHorizontal: sp.lg },
  });
