import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { loadSavingsPlan, saveSavingsPlan } from '../utils/storage';
import { calcServedMonths } from '../utils/dateUtils';
import { calcSavings, recommendedSavingMonths, SAVINGS } from '../utils/savingsUtils';

function formatMoney(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function formatEok(n) {
  return `약 ${formatMoney(Math.round(n / 10000))}만원`;
}

/**
 * 장병내일준비적금 계산기 (급여 탭 내 섹션용 본문).
 * 자체적으로 입력값(savingsPlan)을 불러오고 저장한다.
 * @param {object} militaryInfo  기본 가입 개월·복무개월 산출용
 */
export default function SavingsCalculator({ militaryInfo }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [monthly, setMonthly] = useState(String(SAVINGS.MONTHLY_MAX));
  const [months, setMonths] = useState(String(SAVINGS.MAX_MONTHS));

  const servedMonths = militaryInfo?.enlistDate ? calcServedMonths(militaryInfo.enlistDate) : 0;

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

  const persist = (mo, mn) =>
    saveSavingsPlan({ monthly: parseInt(mo, 10) || 0, months: parseInt(mn, 10) || 0 }).catch(() => {});

  const onMonthly = (t) => { const v = t.replace(/[^0-9]/g, ''); setMonthly(v); persist(v, months); };
  const onMonths  = (t) => { const v = t.replace(/[^0-9]/g, ''); setMonths(v); persist(monthly, v); };

  const Row = ({ label, value, sub, accent, strong }) => (
    <View style={s.resRow}>
      <View style={{ flex: 1 }}>
        <Text style={[s.resLabel, strong && { color: tc.text, fontWeight: '700' }]}>{label}</Text>
        {sub ? <Text style={s.resSub}>{sub}</Text> : null}
      </View>
      <Text style={[s.resValue, accent && { color: tc.primary }, strong && { fontSize: 18, fontWeight: '900' }]}>
        {formatMoney(value)}원
      </Text>
    </View>
  );

  return (
    <View style={s.wrap}>
      {/* 만기 수령액 강조 */}
      <View style={s.hero}>
        <Text style={s.heroLabel}>전역 시 예상 수령액</Text>
        <Text style={s.heroAmount}>{formatMoney(result.total)}<Text style={s.heroUnit}>원</Text></Text>
        <Text style={s.heroSub}>{formatEok(result.total)}</Text>
      </View>

      {/* 입력 */}
      <Text style={s.formLabel}>월 납입액 (원)</Text>
      <TextInput
        style={[s.input, overLimit && { borderColor: tc.danger }]}
        value={monthly} onChangeText={onMonthly}
        keyboardType="number-pad" placeholder="예: 550000"
        placeholderTextColor={tc.textLight} maxLength={7}
      />
      <View style={s.chipRow}>
        {[200000, 400000, 550000].map((v) => (
          <TouchableOpacity key={v} style={s.chip} onPress={() => onMonthly(String(v))}>
            <Text style={s.chipText}>{formatMoney(v / 10000)}만</Text>
          </TouchableOpacity>
        ))}
      </View>
      {overLimit && <Text style={s.warn}>* 2025년 기준 월 납입 한도는 55만원입니다.</Text>}

      <Text style={[s.formLabel, { marginTop: 14 }]}>가입 기간 (개월)</Text>
      <TextInput
        style={[s.input, overMonths && { borderColor: tc.danger }]}
        value={months} onChangeText={onMonths}
        keyboardType="number-pad" placeholder="예: 18"
        placeholderTextColor={tc.textLight} maxLength={2}
      />
      {overMonths && <Text style={s.warn}>* 적금 최대 가입 기간은 24개월입니다. (24개월로 계산됨)</Text>}
      {servedMonths > 0 && (
        <Text style={s.hint}>현재 복무 {servedMonths}개월째 · 적금은 최대 24개월까지 가입 가능</Text>
      )}

      {/* 상세 내역 */}
      <View style={s.detailBox}>
        <Row label="납입 원금" sub={`월 ${formatMoney(result.monthly)}원 × ${result.months}개월`} value={result.principal} />
        <View style={s.divider} />
        <Row label="은행 이자" sub="연 5% 단리(비과세) 가정" value={result.interest} accent />
        <View style={s.divider} />
        <Row label="정부 매칭지원금" sub="납입 원금의 100% 지원" value={result.matchGrant} accent />
        <View style={s.dividerStrong} />
        <Row label="전역 시 총 수령액" value={result.total} strong />
      </View>

      <Text style={s.disclaimer}>
        * 2025년 제도 기준 추정치입니다. 금리(연 5%)·정부 매칭(100%)·납입 한도(월 55만원)는 정책·가입 조건에
        따라 달라질 수 있어 실제 수령액과 차이가 있을 수 있습니다.
      </Text>
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  wrap: { marginTop: 14 },
  hero: {
    alignItems: 'center', backgroundColor: tc.primary,
    borderRadius: 14, paddingVertical: 20, marginBottom: 16,
  },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.78)', marginBottom: 6 },
  heroAmount: { fontSize: 34, fontWeight: '900', color: tc.white, letterSpacing: -1 },
  heroUnit: { fontSize: 18, fontWeight: '700' },
  heroSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 5 },

  formLabel: { fontSize: 14, fontWeight: '600', color: tc.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: tc.background, borderWidth: 1.5, borderColor: tc.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: tc.text,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chip: {
    flex: 1, backgroundColor: tc.background, borderRadius: 9, paddingVertical: 9,
    alignItems: 'center', borderWidth: 1, borderColor: tc.border,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: tc.primary },
  warn: { fontSize: 12, color: tc.danger, marginTop: 8 },
  hint: { fontSize: 12, color: tc.textLight, marginTop: 8 },

  detailBox: { marginTop: 18 },
  resRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  resLabel: { fontSize: 14, color: tc.textSecondary, fontWeight: '600' },
  resSub: { fontSize: 11, color: tc.textLight, marginTop: 2 },
  resValue: { fontSize: 15, fontWeight: '700', color: tc.text, marginLeft: 8 },
  divider: { height: 1, backgroundColor: tc.border },
  dividerStrong: { height: 1.5, backgroundColor: tc.primaryLight, marginVertical: 2 },
  disclaimer: { fontSize: 11.5, color: tc.textLight, lineHeight: 17, marginTop: 12 },
});
