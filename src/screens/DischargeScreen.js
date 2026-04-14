import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import AdBanner from '../components/AdBanner';
import DatePickerField from '../components/DatePickerField';
import { AD_UNITS } from '../constants/adUnits';
import { loadMilitaryInfo, saveMilitaryInfo } from '../utils/storage';
import {
  calcDischargeDate, calcDaysLeft, calcProgress,
  calcServedDays, formatDate, formatDateKo, calcRank,
} from '../utils/dateUtils';

const BRANCHES = [
  { key: 'army',     label: '육군', months: 18, emoji: '🪖' },
  { key: 'navy',     label: '해군', months: 20, emoji: '⚓' },
  { key: 'airforce', label: '공군', months: 21, emoji: '✈️' },
];

export default function DischargeScreen() {
  const [enlistDate, setEnlistDate] = useState('');
  const [branch, setBranch]         = useState('army');
  const [info, setInfo]             = useState(null);
  const [saved, setSaved]           = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const mi = await loadMilitaryInfo();
    if (mi) {
      setInfo(mi);
      setEnlistDate(mi.enlistDate);
      setBranch(mi.branch);
      setSaved(true);
    }
  };

  const selectedBranch = BRANCHES.find((b) => b.key === branch);

  const handleSave = async () => {
    if (!enlistDate) {
      Alert.alert('오류', '입대일을 선택해주세요.');
      return;
    }
    if (new Date(enlistDate) > new Date()) {
      Alert.alert('오류', '입대일이 오늘보다 미래일 수 없습니다.');
      return;
    }
    const dischargeDate = calcDischargeDate(enlistDate, selectedBranch.months);
    const mi = {
      enlistDate,
      branch,
      dischargeDate: formatDate(dischargeDate),
      months: selectedBranch.months,
    };
    await saveMilitaryInfo(mi);
    setInfo(mi);
    setSaved(true);
    Alert.alert('저장 완료', '입대 정보가 저장되었습니다!');
  };

  const daysLeft   = info ? calcDaysLeft(info.dischargeDate) : 0;
  const progress   = info ? calcProgress(info.enlistDate, info.dischargeDate) : 0;
  const servedDays = info ? calcServedDays(info.enlistDate) : 0;
  const rank       = info ? calcRank(servedDays) : '';

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>전역일 계산</Text>

        {/* 입력 폼 */}
        <Card>
          <Text style={styles.sectionTitle}>입대 정보 입력</Text>

          {/* 캘린더 날짜 선택 */}
          <DatePickerField
            label="입대일"
            value={enlistDate}
            onChange={saved ? undefined : setEnlistDate}
            placeholder="입대일을 선택하세요"
            maximumDate={new Date()}
            minimumDate={new Date(2000, 0, 1)}
          />
          {saved && (
            <Text style={styles.savedHint}>수정하려면 아래 '수정하기'를 누르세요</Text>
          )}

          <Text style={[styles.label, { marginTop: 6 }]}>군별 선택</Text>
          <View style={styles.branchRow}>
            {BRANCHES.map((b) => (
              <TouchableOpacity
                key={b.key}
                style={[
                  styles.branchBtn,
                  branch === b.key && styles.branchBtnActive,
                  saved && styles.branchBtnDisabled,
                ]}
                onPress={() => !saved && setBranch(b.key)}
                disabled={saved}
              >
                <Text style={styles.branchEmoji}>{b.emoji}</Text>
                <Text style={[styles.branchLabel, branch === b.key && styles.branchLabelActive]}>
                  {b.label}
                </Text>
                <Text style={[styles.branchMonths, branch === b.key && styles.branchMonthsActive]}>
                  {b.months}개월
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {saved ? (
            <TouchableOpacity style={styles.editBtn} onPress={() => setSaved(false)}>
              <Text style={styles.editBtnText}>수정하기 ✏️</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>저장 및 계산</Text>
            </TouchableOpacity>
          )}
        </Card>

        {info && <AdBanner unit={AD_UNITS.DISCHARGE_MIDDLE} />}

        {/* 결과 */}
        {info && (
          <>
            <Card style={styles.resultCard}>
              <Text style={styles.sectionTitle}>전역 정보</Text>
              <View style={styles.resultRow}>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>입대일</Text>
                  <Text style={styles.resultValue}>{formatDateKo(info.enlistDate)}</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultLabel}>전역일</Text>
                  <Text style={[styles.resultValue, { color: COLORS.accent }]}>
                    {formatDateKo(info.dischargeDate)}
                  </Text>
                </View>
              </View>

              <View style={styles.ddayBox}>
                <Text style={styles.ddayLabel}>전역까지</Text>
                <Text style={styles.ddayValue}>
                  {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-Day!' : '전역 완료!'}
                </Text>
              </View>

              <Text style={styles.progressLabel}>복무 진행률</Text>
              <ProgressBar progress={progress} />
            </Card>

            <View style={styles.statsGrid}>
              {[
                { emoji: '⚔️', val: `${servedDays}일`, sub: '복무 일수' },
                { emoji: '📅', val: daysLeft > 0 ? `${daysLeft}일` : '완료', sub: '남은 일수' },
                { emoji: '🎖️', val: rank, sub: '현재 계급' },
                { emoji: '🏁', val: `${progress}%`, sub: '진행률' },
              ].map((item) => (
                <Card key={item.sub} style={styles.statCard}>
                  <Text style={styles.statEmoji}>{item.emoji}</Text>
                  <Text style={styles.statBig}>{item.val}</Text>
                  <Text style={styles.statSub}>{item.sub}</Text>
                </Card>
              ))}
            </View>

            <AdBanner unit={AD_UNITS.DISCHARGE_BOTTOM} style={{ marginBottom: 12 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.primary, marginBottom: 18, marginTop: 6 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 9 },
  savedHint: { fontSize: 12, color: COLORS.textLight, marginTop: -8, marginBottom: 12, marginLeft: 2 },
  branchRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  branchBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 16,
    borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  branchBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  branchBtnDisabled: { opacity: 0.6 },
  branchEmoji: { fontSize: 24, marginBottom: 5 },
  branchLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  branchLabelActive: { color: COLORS.primary },
  branchMonths: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },
  branchMonthsActive: { color: COLORS.primaryLight },
  saveBtn: { marginTop: 20, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 17 },
  editBtn: { marginTop: 20, backgroundColor: COLORS.background, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.primary },
  editBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 17 },
  resultCard: { paddingVertical: 20 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  resultItem: { flex: 1 },
  resultLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 5 },
  resultValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  ddayBox: { alignItems: 'center', paddingVertical: 22, backgroundColor: COLORS.primary, borderRadius: 12, marginBottom: 20 },
  ddayLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  ddayValue: { fontSize: 54, fontWeight: '900', color: COLORS.white, letterSpacing: -1 },
  progressLabel: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  statCard: { width: '47%', alignItems: 'center', paddingVertical: 20, marginBottom: 0 },
  statEmoji: { fontSize: 28, marginBottom: 7 },
  statBig: { fontSize: 21, fontWeight: '800', color: COLORS.primary },
  statSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
});
