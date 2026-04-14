import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import Card from '../components/Card';
import AdBanner from '../components/AdBanner';
import { AD_UNITS } from '../constants/adUnits';
import { loadMilitaryInfo, loadSalaryInfo, saveSalaryInfo } from '../utils/storage';
import { calcServedMonths } from '../utils/dateUtils';

const DEFAULT_SALARIES = [
  { rank: '이병', amount: 640000,  months: '0~2개월' },
  { rank: '일병', amount: 800000,  months: '3~5개월' },
  { rank: '상병', amount: 1000000, months: '6~9개월' },
  { rank: '병장', amount: 1250000, months: '10개월~' },
];

function formatMoney(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export default function SalaryScreen() {
  const [militaryInfo, setMilitaryInfo]   = useState(null);
  const [salaryInfo, setSalaryInfo]       = useState(null);
  const [customMode, setCustomMode]       = useState(false);
  const [customSalary, setCustomSalary]   = useState('');
  const [totalMonths, setTotalMonths]     = useState('');

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
  };

  const handleSave = async () => {
    const salary = parseInt(customSalary.replace(/,/g, ''), 10);
    const months = parseInt(totalMonths, 10);
    if (isNaN(salary) || salary < 0) { Alert.alert('오류', '월급을 올바르게 입력해주세요.'); return; }
    if (isNaN(months) || months < 1 || months > 36) { Alert.alert('오류', '복무 개월 수를 올바르게 입력해주세요 (1~36).'); return; }
    const si = { monthlyAmount: salary, totalMonths: months };
    await saveSalaryInfo(si);
    setSalaryInfo(si);
    setCustomMode(false);
    Alert.alert('저장 완료', '급여 정보가 저장되었습니다!');
  };

  const servedMonths = militaryInfo ? calcServedMonths(militaryInfo.enlistDate) : 0;

  const calcStandardTotal = (totalM) => {
    let total = 0;
    DEFAULT_SALARIES.forEach((s, i) => {
      const start    = [0, 3, 6, 10][i];
      const end      = [2, 5, 9, totalM - 1][i];
      const effective = Math.max(0, Math.min(end, totalM - 1) - start + 1);
      total += effective * s.amount;
    });
    return total;
  };

  const totalSalary = salaryInfo
    ? salaryInfo.monthlyAmount * salaryInfo.totalMonths
    : militaryInfo ? calcStandardTotal(militaryInfo.months) : 0;

  const earnedSalary = salaryInfo
    ? salaryInfo.monthlyAmount * Math.min(servedMonths, salaryInfo.totalMonths)
    : militaryInfo ? calcStandardTotal(servedMonths) : 0;

  const displayTotalMonths = salaryInfo?.totalMonths ?? militaryInfo?.months ?? 0;
  const earnedPercent = totalSalary > 0 ? Math.min(100, Math.floor((earnedSalary / totalSalary) * 100)) : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>급여 계산</Text>

        {/* 표준 월급 참고표 */}
        <Card>
          <Text style={styles.sectionTitle}>2024년 병사 월급 💰</Text>
          {DEFAULT_SALARIES.map((s) => (
            <View key={s.rank} style={styles.salaryRow}>
              <View>
                <Text style={styles.rankText}>{s.rank}</Text>
                <Text style={styles.rankMonths}>{s.months}</Text>
              </View>
              <Text style={styles.salaryAmount}>{formatMoney(s.amount)}원</Text>
            </View>
          ))}
          <Text style={styles.salaryNote}>* 실제 지급액은 상이할 수 있습니다.</Text>
        </Card>

        {/* ── 광고: 월급표 아래 ── */}
        <AdBanner unit={AD_UNITS.SALARY_MIDDLE} />

        {/* 직접 입력 */}
        <Card>
          <Text style={styles.sectionTitle}>급여 설정</Text>
          {!customMode ? (
            <TouchableOpacity style={styles.editBtn} onPress={() => setCustomMode(true)}>
              <Text style={styles.editBtnText}>{salaryInfo ? '급여 정보 수정 ✏️' : '직접 입력하기'}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.formLabel}>월 지급액 (원)</Text>
              <TextInput
                style={styles.formInput}
                value={customSalary}
                onChangeText={(t) => setCustomSalary(t.replace(/[^0-9]/g, ''))}
                placeholder="예: 1000000"
                placeholderTextColor={COLORS.textLight}
                keyboardType="number-pad"
              />
              <Text style={styles.formLabel}>총 복무 개월 수</Text>
              <TextInput
                style={styles.formInput}
                value={totalMonths}
                onChangeText={setTotalMonths}
                placeholder="예: 18"
                placeholderTextColor={COLORS.textLight}
                keyboardType="number-pad"
                maxLength={2}
              />
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setCustomMode(false)}>
                  <Text style={styles.cancelBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>저장</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Card>

        {/* 급여 현황 */}
        <Card style={styles.resultCard}>
          <Text style={styles.sectionTitle}>급여 현황</Text>

          <View style={styles.bigAmountBox}>
            <Text style={styles.bigAmountLabel}>총 수령 예정액</Text>
            <Text style={styles.bigAmount}>{formatMoney(totalSalary)}원</Text>
            <Text style={styles.bigAmountSub}>복무 {displayTotalMonths}개월 기준</Text>
          </View>

          <View style={styles.earnedBox}>
            <View style={styles.earnedHeader}>
              <Text style={styles.earnedLabel}>현재까지 수령액</Text>
              <Text style={styles.earnedPercent}>{earnedPercent}%</Text>
            </View>
            <Text style={styles.earnedAmount}>{formatMoney(earnedSalary)}원</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${earnedPercent}%` }]} />
            </View>
          </View>

          <View style={styles.remainBox}>
            <Text style={styles.remainLabel}>남은 수령액</Text>
            <Text style={styles.remainAmount}>{formatMoney(Math.max(0, totalSalary - earnedSalary))}원</Text>
          </View>
        </Card>

        {/* 복무 개월 요약 */}
        <View style={styles.monthsRow}>
          {[
            { emoji: '📆', val: `${servedMonths}개월`,                              label: '복무 기간' },
            { emoji: '🎯', val: `${displayTotalMonths}개월`,                         label: '총 복무' },
            { emoji: '⏳', val: `${Math.max(0, displayTotalMonths - servedMonths)}개월`, label: '남은 기간' },
          ].map((item) => (
            <Card key={item.label} style={styles.monthCard}>
              <Text style={styles.monthEmoji}>{item.emoji}</Text>
              <Text style={styles.monthValue}>{item.val}</Text>
              <Text style={styles.monthLabel}>{item.label}</Text>
            </Card>
          ))}
        </View>

        {/* ── 광고: 하단 ── */}
        <AdBanner unit={AD_UNITS.SALARY_BOTTOM} style={{ marginBottom: 12 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.primary, marginBottom: 18, marginTop: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  salaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rankText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  rankMonths: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  salaryAmount: { fontSize: 17, fontWeight: '700', color: COLORS.primary },
  salaryNote: { fontSize: 12, color: COLORS.textLight, marginTop: 10, textAlign: 'right' },
  editBtn: {
    backgroundColor: COLORS.background, borderRadius: 10, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary,
  },
  editBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  formLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 9 },
  formInput: {
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: COLORS.text, marginBottom: 14,
  },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  resultCard: { paddingBottom: 20 },
  bigAmountBox: {
    alignItems: 'center', backgroundColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 28, marginBottom: 16,
  },
  bigAmountLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 6 },
  bigAmount: { fontSize: 30, fontWeight: '900', color: COLORS.white },
  bigAmountSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 5 },
  earnedBox: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, marginBottom: 12 },
  earnedHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  earnedLabel: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  earnedPercent: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
  earnedAmount: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  progressTrack: { height: 10, backgroundColor: COLORS.border, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 5 },
  remainBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  remainLabel: { fontSize: 14, color: COLORS.textSecondary },
  remainAmount: { fontSize: 18, fontWeight: '700', color: COLORS.accent },
  monthsRow: { flexDirection: 'row', gap: 8 },
  monthCard: { flex: 1, alignItems: 'center', paddingVertical: 18, marginBottom: 0 },
  monthEmoji: { fontSize: 24, marginBottom: 7 },
  monthValue: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  monthLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
});
