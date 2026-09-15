import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import {
  Screen,
  AppHeader,
  Section,
  HeroCard,
  Chip,
  Divider,
  Txt,
  AnimatedNumber,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { loadMilitaryInfo, loadSavingsPlan, saveSavingsPlan } from '../utils/storage';
import { calcServedMonths } from '../utils/dateUtils';
import { calcSavings, recommendedSavingMonths, SAVINGS } from '../utils/savingsUtils';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../theme/tokens';

function formatMoney(n) {
  return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 상세 내역 한 줄 */
function BreakdownRow({ label, sub, value, tone = 'default', strong = false }) {
  return (
    <View style={rowStyles.row}>
      <View style={{ flex: 1 }}>
        <Txt role={strong ? 'bodyLg' : 'bodySm'} tone={strong ? 'default' : 'secondary'}
          style={strong && { fontWeight: '800' }}>
          {label}
        </Txt>
        {sub ? <Txt role="micro" tone="light">{sub}</Txt> : null}
      </View>
      <Txt role={strong ? 'subtitle' : 'body'} tone={tone} numeric style={{ fontWeight: '800' }}>
        {formatMoney(value)}원
      </Txt>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingVertical: sp.md },
});

export default function SavingsScreen({ navigation }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [militaryInfo, setMilitaryInfo] = useState(null);
  const [monthly, setMonthly] = useState(String(SAVINGS.MONTHLY_MAX));
  const [months, setMonths] = useState(String(SAVINGS.MAX_MONTHS));

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const mi = await loadMilitaryInfo();
          if (alive) setMilitaryInfo(mi);
        } catch (e) {
          if (__DEV__) console.warn('[SavingsScreen] 로드 실패:', e && e.message);
          if (alive) setMilitaryInfo(null);
        }
      })();
      return () => { alive = false; };
    }, [])
  );

  useEffect(() => {
    let alive = true;
    loadSavingsPlan().then((plan) => {
      if (!alive) return;
      if (plan) {
        setMonthly(String(plan.monthly));
        setMonths(String(plan.months));
      } else if (militaryInfo?.months) {
        setMonths(String(recommendedSavingMonths(militaryInfo.months)));
      }
    });
    return () => { alive = false; };
  }, [militaryInfo?.months]);

  const m = parseInt(monthly, 10) || 0;
  const n = parseInt(months, 10) || 0;
  const result = calcSavings({ monthly: m, months: n });
  const overLimit = m > SAVINGS.MONTHLY_MAX;
  const overMonths = n > SAVINGS.MAX_MONTHS;

  const servedMonths = militaryInfo?.enlistDate ? calcServedMonths(militaryInfo.enlistDate) : 0;

  // 키 입력마다 저장소에 쓰지 않는다 — 입력이 멎은 뒤 한 번만 기록한다.
  const saveTimer = useRef(null);
  const pendingSave = useRef(null);

  const flushSave = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const p = pendingSave.current;
    if (!p) return;
    pendingSave.current = null;
    saveSavingsPlan(p).catch(() => {});
  }, []);

  const persist = useCallback((mo, mn) => {
    pendingSave.current = {
      monthly: parseInt(mo, 10) || 0,
      months: parseInt(mn, 10) || 0,
    };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 400);
  }, [flushSave]);

  // 언마운트 시 대기 중인 저장을 '취소'가 아니라 '즉시 실행'해야 한다.
  // 그냥 clearTimeout 하면 마지막 400ms 안의 입력이 조용히 사라진다.
  useEffect(() => flushSave, [flushSave]);

  const onlyDigits = (t) => t.replace(/[^0-9]/g, '');
  const onMonthly = (t) => { const v = onlyDigits(t); setMonthly(v); persist(v, months); };
  const onMonths = (t) => { const v = onlyDigits(t); setMonths(v); persist(monthly, v); };

  return (
    <Screen
      standalone
      ad={AD_UNITS.SALARY_MIDDLE}
      contentContainerStyle={{ paddingBottom: sp.xxxl }}
      header={
        <AppHeader
          title="장병내일적금"
          subtitle="전역 시 받을 목돈을 미리 계산"
          back
        />
      }
    >
      {/* 만기 수령액 — 이 화면의 유일한 주인공 */}
      <Section index={0}>
        <HeroCard>
          <Txt role="label" tone="heroMuted">전역 시 예상 수령액</Txt>
          <View style={s.heroAmountRow}>
            <AnimatedNumber
              value={result.total}
              comma
              /* 입력할 때마다 다시 계산되므로 카운트업을 짧게 — 1200ms면 덜덜거린다 */
              duration={260}
              style={[ty.hero, { color: tc.heroText }]}
            />
            <Txt role="subtitle" tone="hero">원</Txt>
          </View>
          <Txt role="caption" tone="heroMuted">
            약 {formatMoney(Math.round(result.total / 10000))}만원
          </Txt>
        </HeroCard>
      </Section>

      {/* 입력 */}
      <Section index={1}>
        <Card>
          <SectionTitle icon="create-outline">납입 조건</SectionTitle>

          <Txt role="label" tone="secondary" style={s.formLabel}>월 납입액 (원)</Txt>
          <TextInput
            style={[s.input, overLimit && { borderColor: tc.danger }]}
            value={monthly}
            onChangeText={onMonthly}
            keyboardType="number-pad"
            placeholder="예: 550000"
            placeholderTextColor={tc.textLight}
            maxLength={7}
          />
          <View style={s.chipRow}>
            {[200000, 400000, 550000].map((v) => (
              <Chip
                key={v}
                label={`${formatMoney(v / 10000)}만`}
                selected={m === v}
                onPress={() => onMonthly(String(v))}
                style={{ flex: 1 }}
              />
            ))}
          </View>
          {overLimit ? (
            <Txt role="caption" tone="danger" style={s.warn}>
              * 2025년 기준 월 납입 한도는 55만원입니다.
            </Txt>
          ) : null}

          <Txt role="label" tone="secondary" style={[s.formLabel, { marginTop: sp.lg }]}>
            가입 기간 (개월)
          </Txt>
          <TextInput
            style={[s.input, overMonths && { borderColor: tc.danger }]}
            value={months}
            onChangeText={onMonths}
            keyboardType="number-pad"
            placeholder="예: 18"
            placeholderTextColor={tc.textLight}
            maxLength={2}
          />
          <View style={s.chipRow}>
            {[12, 18, 24].map((v) => (
              <Chip
                key={v}
                label={`${v}개월`}
                selected={n === v}
                onPress={() => onMonths(String(v))}
                style={{ flex: 1 }}
              />
            ))}
          </View>
          {overMonths ? (
            <Txt role="caption" tone="danger" style={s.warn}>
              * 적금 최대 가입 기간은 24개월입니다. (24개월로 계산됨)
            </Txt>
          ) : null}
          {servedMonths > 0 ? (
            <Txt role="caption" tone="light" style={s.warn}>
              현재 복무 {servedMonths}개월째 · 적금은 최대 24개월까지 가입 가능
            </Txt>
          ) : null}
        </Card>
      </Section>

      {/* 상세 내역 */}
      <Section index={2}>
        <Card>
          <SectionTitle icon="receipt-outline">상세 내역</SectionTitle>

          <View style={{ marginTop: sp.xs }}>
            <BreakdownRow
              label="납입 원금"
              sub={`월 ${formatMoney(result.monthly)}원 × ${result.months}개월`}
              value={result.principal}
            />
            <Divider />
            <BreakdownRow
              label="은행 이자"
              sub="연 5% 단리(비과세) 가정"
              value={result.interest}
              tone="primary"
            />
            <Divider />
            <BreakdownRow
              label="정부 매칭지원금"
              sub="납입 원금의 100% 지원"
              value={result.matchGrant}
              tone="primary"
            />
            <Divider color={tc.primaryLight} spacing={sp.xxs} />
            <BreakdownRow label="전역 시 총 수령액" value={result.total} strong />
          </View>
        </Card>
      </Section>

      <Section index={3}>
        <Txt role="micro" tone="light">
          * 2025년 제도 기준 추정치입니다. 금리(연 5%)·정부 매칭(100%)·납입 한도(월 55만원)는
          정책·가입 조건에 따라 달라질 수 있어 실제 수령액과 차이가 있을 수 있습니다.
        </Txt>
      </Section>
    </Screen>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    heroAmountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: sp.xs,
      marginTop: sp.xs,
    },
    formLabel: { marginTop: sp.md, marginBottom: sp.sm },
    input: {
      backgroundColor: tc.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tc.surfaceSunkenBorder,
      borderRadius: r.sm,
      paddingHorizontal: sp.md,
      paddingVertical: sp.md,
      ...ty.bodyLg,
      color: tc.text,
    },
    chipRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.sm },
    warn: { marginTop: sp.sm },
  });
