import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/ThemeContext';
import Card from '../components/Card';
import AdBanner from '../components/AdBanner';
import { AD_UNITS } from '../constants/adUnits';
import { loadMilitaryInfo, loadSalaryInfo, saveSalaryInfo, loadRankPromotions } from '../utils/storage';
import SetupRequired from '../components/SetupRequired';
import { calcServedMonths, calcRankFromPromotions } from '../utils/dateUtils';
import { isOfficer, personnelLabel } from '../constants/serviceTerms';
import { getOfficerBasePay, OFFICER_PAY_GUIDE } from '../constants/militaryRanks';
import { calcHobong } from '../utils/officerUtils';

/* ─── 계급별 표준 월급 (2024년 기준) ───────────────────────── */
/* 진급 기준: 이병 0~1개월, 일병 2~7개월, 상병 8~13개월, 병장 14개월~ */
const SALARY_GUIDE = [
  { rank: '이병', emoji: '🪖', months: '0 ~ 1개월',  amount: 640000,  start: 0,  end: 1   },
  { rank: '일병', emoji: '⭐', months: '2 ~ 7개월',  amount: 800000,  start: 2,  end: 7   },
  { rank: '상병', emoji: '⭐⭐', months: '8 ~ 13개월', amount: 1000000, start: 8,  end: 13  },
  { rank: '병장', emoji: '👑', months: '14개월~',    amount: 1250000, start: 14, end: 999 },
];
const MAX_SALARY = 1250000;

function formatMoney(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* 계급명으로 월급 반환 */
function getSalaryByRank(rank) {
  const g = SALARY_GUIDE.find((s) => s.rank === rank);
  return g ? g.amount : SALARY_GUIDE[SALARY_GUIDE.length - 1].amount;
}

/* 복무 개월 수로 표준 월급 반환 (진급일 미설정 fallback) */
function getStandardMonthly(servedMonths) {
  const g = SALARY_GUIDE.find((s) => servedMonths >= s.start && servedMonths <= s.end);
  return g ? g.amount : SALARY_GUIDE[SALARY_GUIDE.length - 1].amount;
}

/* 표준 기준 총 복무 예상 수령액 */
function calcStandardTotal(totalM) {
  let total = 0;
  SALARY_GUIDE.forEach((s) => {
    const effective = Math.max(0, Math.min(s.end, totalM - 1) - s.start + 1);
    total += effective * s.amount;
  });
  return total;
}

export default function SalaryScreen() {
  const insets = useSafeAreaInsets();
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const [militaryInfo,  setMilitaryInfo]  = useState(undefined);
  const [salaryInfo,    setSalaryInfo]    = useState(null);
  const [promotions,    setPromotions]    = useState(null);
  const [customMode,    setCustomMode]    = useState(false);
  const [customSalary,  setCustomSalary]  = useState('');
  const [totalMonths,   setTotalMonths]   = useState('');
  const [guideOpen,     setGuideOpen]     = useState(false);

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
    const promo = await loadRankPromotions(mi?.enlistDate);
    setPromotions(promo);
  };

  const handleSave = async () => {
    const salary = parseInt(customSalary.replace(/,/g, ''), 10);
    const months = parseInt(totalMonths, 10);
    if (isNaN(salary) || salary < 0) { Alert.alert('오류', '월급을 올바르게 입력해주세요.'); return; }
    if (isNaN(months) || months < 1 || months > 240) { Alert.alert('오류', '복무 개월 수를 올바르게 입력해주세요 (1~240).'); return; }
    const si = { monthlyAmount: salary, totalMonths: months };
    await saveSalaryInfo(si);
    setSalaryInfo(si);
    setCustomMode(false);
    Alert.alert('저장 완료', '급여 정보가 저장되었습니다!');
  };

  const handleResetToStandard = async () => {
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

  if (militaryInfo === undefined) return null;
  if (!militaryInfo) return <SetupRequired />;

  const officer        = isOfficer(militaryInfo.personnelType);
  const servedMonths   = calcServedMonths(militaryInfo.enlistDate);
  const officerRank    = militaryInfo.officerRank ?? null;
  // 간부: 선택 계급의 2025 초임(1호봉) 참고값 (없으면 null → 직접입력 유도)
  const officerBase    = officer ? getOfficerBasePay(officerRank) : null;
  const hobong         = officer ? calcHobong(militaryInfo.enlistDate) : null;

  const currentRank    = officer
    ? (officerRank ?? personnelLabel(militaryInfo.personnelType))
    : (calcRankFromPromotions(promotions)
        ?? (SALARY_GUIDE.find((s) => servedMonths >= s.start && servedMonths <= s.end)?.rank ?? '이병'));

  // 우선순위: 직접입력 > (간부)초임 참고값 > (병사)봉급표
  const currentMonthly = salaryInfo
    ? salaryInfo.monthlyAmount
    : (officer ? (officerBase ?? 0) : getSalaryByRank(currentRank));
  const displayTotalMonths = salaryInfo?.totalMonths ?? militaryInfo?.months ?? 0;
  const totalSalary        = salaryInfo
    ? salaryInfo.monthlyAmount * salaryInfo.totalMonths
    : (officer ? (officerBase ? officerBase * displayTotalMonths : 0) : calcStandardTotal(militaryInfo.months));
  const earnedSalary = salaryInfo
    ? salaryInfo.monthlyAmount * Math.min(servedMonths, salaryInfo.totalMonths)
    : (officer ? (officerBase ? officerBase * Math.min(servedMonths, displayTotalMonths) : 0) : calcStandardTotal(servedMonths));
  const earnedPercent = totalSalary > 0
    ? Math.min(100, Math.floor((earnedSalary / totalSalary) * 100))
    : 0;
  const isCustom    = !!salaryInfo;
  // 간부 + 직접입력X + 초임 참고값도 없음 → 직접 입력 필요
  const needInput   = officer && !salaryInfo && !officerBase;
  // 간부 초임 참고값으로 추정 표시 중 (직접입력 권장)
  const officerEstimate = officer && !salaryInfo && !!officerBase;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>급여 계산</Text>

        {/* ━━ ① 이번 달 예상 급여 (메인 카드) ━━ */}
        <Card style={styles.mainCard}>
          {/* 계급 뱃지 행 */}
          <View style={styles.mainTop}>
            <View style={styles.rankPill}>
              <Text style={styles.rankPillText}>{currentRank}</Text>
            </View>
            {isCustom && (
              <View style={styles.customPill}>
                <Text style={styles.customPillText}>직접 입력</Text>
              </View>
            )}
            {officerEstimate && (
              <View style={styles.estimatePill}>
                <Text style={styles.customPillText}>초임 기준 추정</Text>
              </View>
            )}
          </View>

          {/* 이번 달 급여 */}
          <Text style={styles.mainLabel}>이번 달 예상 급여</Text>
          {needInput ? (
            <Text style={styles.mainNeedInput}>아래에서 급여를{'\n'}직접 입력해주세요</Text>
          ) : (
            <Text style={styles.mainAmount}>{formatMoney(currentMonthly)}<Text style={styles.mainAmountUnit}>원</Text></Text>
          )}
          <Text style={styles.mainSub}>
            복무 {servedMonths}개월째{officer && hobong ? ` · ${hobong}호봉` : ''}
          </Text>
          {officerEstimate && (
            <Text style={styles.estimateNote}>
              * 2025년 초임(1호봉) 기준 추정치. 호봉·수당 미반영 — 정확한 금액은 직접 입력하세요.
            </Text>
          )}
        </Card>

        {/* ━━ ② 급여 현황 ━━ */}
        <Card style={styles.statusCard}>
          <Text style={styles.sectionTitle}>💰 급여 현황</Text>

          {/* 총 수령 예정 */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>총 수령 예정액</Text>
            <Text style={styles.totalAmount}>{formatMoney(totalSalary)}원</Text>
          </View>
          <Text style={styles.totalSub}>복무 {displayTotalMonths}개월 기준</Text>

          {/* 진행 바 */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>현재까지 수령</Text>
              <Text style={styles.progressPct}>{earnedPercent}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${earnedPercent}%` }]} />
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.earnedText}>{formatMoney(earnedSalary)}원 수령</Text>
              <Text style={styles.remainText}>
                {formatMoney(Math.max(0, totalSalary - earnedSalary))}원 남음
              </Text>
            </View>
          </View>
        </Card>

        {/* ━━ ③ 급여 설정 ━━ */}
        <Card>
          <Text style={styles.sectionTitle}>⚙️ 급여 설정</Text>

          {!customMode ? (
            <View style={styles.settingInfo}>
              <View style={styles.settingInfoRow}>
                <Text style={styles.settingInfoLabel}>현재 기준</Text>
                <Text style={styles.settingInfoValue}>
                  {isCustom
                    ? `직접 입력 (${formatMoney(salaryInfo.monthlyAmount)}원/월)`
                    : (officer ? '직접 입력 필요' : '표준 급여표 자동 적용')}
                </Text>
              </View>
              <View style={styles.settingBtnRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setCustomMode(true)}
                >
                  <Text style={styles.editBtnText}>{isCustom ? '수정 ✏️' : '직접 입력하기'}</Text>
                </TouchableOpacity>
                {isCustom && (
                  <TouchableOpacity style={styles.resetBtn} onPress={handleResetToStandard}>
                    <Text style={styles.resetBtnText}>표준으로 초기화</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.formLabel}>월 지급액 (원)</Text>
              <TextInput
                style={styles.formInput}
                value={customSalary}
                onChangeText={(t) => setCustomSalary(t.replace(/[^0-9]/g, ''))}
                placeholder="예: 1000000"
                placeholderTextColor={tc.textLight}
                keyboardType="number-pad"
              />
              <Text style={styles.formLabel}>총 복무 개월 수</Text>
              <TextInput
                style={styles.formInput}
                value={totalMonths}
                onChangeText={setTotalMonths}
                placeholder="예: 18"
                placeholderTextColor={tc.textLight}
                keyboardType="number-pad"
                maxLength={3}
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

        {/* ━━ ④ 복무 개월 요약 ━━ */}
        <View style={styles.monthsRow}>
          {[
            { emoji: '📆', val: `${servedMonths}개월`, label: '복무 기간' },
            { emoji: '🎯', val: `${displayTotalMonths}개월`, label: '총 복무' },
            { emoji: '⏳', val: `${Math.max(0, displayTotalMonths - servedMonths)}개월`, label: '남은 기간' },
          ].map((item) => (
            <Card key={item.label} style={styles.monthCard}>
              <Text style={styles.monthEmoji}>{item.emoji}</Text>
              <Text style={styles.monthValue}>{item.val}</Text>
              <Text style={styles.monthLabel}>{item.label}</Text>
            </Card>
          ))}
        </View>

        {/* ━━ ⑤ 병사 월급 가이드 (병사 전용, 접기/펼치기) ━━ */}
        {!officer && (
        <Card style={styles.guideCard}>
          <TouchableOpacity
            style={styles.guideHeader}
            onPress={() => setGuideOpen((v) => !v)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.sectionTitle}>📋 2024년 병사 월급 가이드</Text>
              <Text style={styles.guideSub}>계급별 표준 월급 참고표</Text>
            </View>
            <Text style={styles.guideToggleIcon}>{guideOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {guideOpen && (
            <View style={styles.guideBody}>
              {SALARY_GUIDE.map((s) => {
                const isCurrent = s.rank === currentRank;
                const barPct    = Math.round((s.amount / MAX_SALARY) * 100);
                return (
                  <View
                    key={s.rank}
                    style={[styles.guideRow, isCurrent && styles.guideRowCurrent]}
                  >
                    {/* 좌측: 계급 정보 */}
                    <View style={styles.guideLeft}>
                      <View style={styles.guideRankRow}>
                        <Text style={styles.guideEmoji}>{s.emoji}</Text>
                        <Text style={[styles.guideRank, isCurrent && styles.guideRankCurrent]}>
                          {s.rank}
                        </Text>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>현재</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.guideMonths}>{s.months}</Text>
                    </View>

                    {/* 우측: 금액 + 바 */}
                    <View style={styles.guideRight}>
                      <Text style={[styles.guideAmount, isCurrent && { color: tc.primary }]}>
                        {formatMoney(s.amount)}원
                      </Text>
                      <View style={styles.guideBarTrack}>
                        <View style={[
                          styles.guideBarFill,
                          { width: `${barPct}%` },
                          isCurrent && { backgroundColor: tc.primary },
                        ]} />
                      </View>
                    </View>
                  </View>
                );
              })}
              <Text style={styles.guideNote}>* 실제 지급액은 상이할 수 있습니다.</Text>
            </View>
          )}
        </Card>
        )}

        {/* ━━ ⑤' 간부 봉급 참고 (간부 전용) ━━ */}
        {officer && (
          <Card style={styles.guideCard}>
            <TouchableOpacity
              style={styles.guideHeader}
              onPress={() => setGuideOpen((v) => !v)}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.sectionTitle}>📋 간부봉급참고</Text>
                <Text style={styles.guideSub}>초임(1호봉) 월 기본급 · 참고용</Text>
              </View>
              <Text style={styles.guideToggleIcon}>{guideOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {guideOpen && (
              <View style={styles.guideBody}>
                {OFFICER_PAY_GUIDE.map((g) => {
                  const isCurrent = g.rank === officerRank;
                  return (
                    <View
                      key={g.rank}
                      style={[styles.guideRow, isCurrent && styles.guideRowCurrent]}
                    >
                      <View style={styles.guideLeft}>
                        <View style={styles.guideRankRow}>
                          <Text style={[styles.guideRank, isCurrent && styles.guideRankCurrent]}>
                            {g.rank}
                          </Text>
                          <Text style={styles.guideMonths}>{g.group}</Text>
                          {isCurrent && (
                            <View style={styles.currentBadge}>
                              <Text style={styles.currentBadgeText}>현재</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={[styles.guideAmount, isCurrent && { color: tc.primary }]}>
                        {formatMoney(g.amount)}원
                      </Text>
                    </View>
                  );
                })}
                <Text style={styles.guideNote}>
                  * 2025년 초임(1호봉) 기준 추정. 호봉·각종 수당 미반영, 정확한 금액은 직접 입력하세요.
                </Text>
              </View>
            )}
          </Card>
        )}

        <AdBanner unit={AD_UNITS.SALARY_BOTTOM} style={{ marginBottom: 12 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  container: { flex: 1, backgroundColor: tc.background },
  scroll: { padding: 16, paddingBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: tc.primary, marginBottom: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: tc.text, marginBottom: 4 },

  /* ① 메인 카드 */
  mainCard: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: tc.primary,
  },
  mainTop: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  rankPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20,
  },
  rankPillText: { color: tc.white, fontWeight: '700', fontSize: 14 },
  customPill: {
    backgroundColor: tc.accent,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  customPillText: { color: tc.white, fontWeight: '700', fontSize: 12 },
  estimatePill: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  estimateNote: { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 8, lineHeight: 16, paddingHorizontal: 8 },
  mainLabel: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 8 },
  mainAmount: { fontSize: 46, fontWeight: '900', color: tc.white, letterSpacing: -1 },
  mainNeedInput: { fontSize: 20, fontWeight: '800', color: tc.white, textAlign: 'center', lineHeight: 28, opacity: 0.95 },
  mainAmountUnit: { fontSize: 22, fontWeight: '700' },
  mainSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 6 },

  /* ② 급여 현황 */
  statusCard: { paddingBottom: 20 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 14, color: tc.textSecondary },
  totalAmount: { fontSize: 20, fontWeight: '800', color: tc.text },
  totalSub: { fontSize: 12, color: tc.textLight, marginBottom: 16, textAlign: 'right' },
  progressSection: {},
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: tc.textSecondary, fontWeight: '600' },
  progressPct: { fontSize: 13, color: tc.primary, fontWeight: '700' },
  progressTrack: { height: 12, backgroundColor: tc.border, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: tc.primary, borderRadius: 6 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  earnedText: { fontSize: 13, color: tc.primary, fontWeight: '600' },
  remainText: { fontSize: 13, color: tc.accent, fontWeight: '600' },

  /* ③ 급여 설정 */
  settingInfo: {},
  settingInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: tc.background, borderRadius: 10, padding: 14, marginBottom: 12,
  },
  settingInfoLabel: { fontSize: 13, color: tc.textSecondary },
  settingInfoValue: { fontSize: 13, color: tc.text, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 8 },
  settingBtnRow: { flexDirection: 'row', gap: 10 },
  editBtn: {
    flex: 1, backgroundColor: tc.background, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
    borderWidth: 1.5, borderColor: tc.primary,
  },
  editBtnText: { color: tc.primary, fontWeight: '700', fontSize: 15 },
  resetBtn: {
    flex: 1, backgroundColor: tc.background, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
    borderWidth: 1.5, borderColor: tc.danger,
  },
  resetBtnText: { color: tc.danger, fontWeight: '700', fontSize: 14 },
  formLabel: { fontSize: 14, fontWeight: '600', color: tc.textSecondary, marginBottom: 9 },
  formInput: {
    backgroundColor: tc.background, borderWidth: 1.5, borderColor: tc.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: tc.text, marginBottom: 14,
  },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: tc.border, alignItems: 'center' },
  cancelBtnText: { color: tc.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: tc.primary, alignItems: 'center' },
  saveBtnText: { color: tc.white, fontWeight: '700', fontSize: 16 },

  /* ④ 복무 요약 */
  monthsRow: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 14 },
  monthCard: { flex: 1, alignItems: 'center', paddingVertical: 18, marginBottom: 0 },
  monthEmoji: { fontSize: 24, marginBottom: 7 },
  monthValue: { fontSize: 16, fontWeight: '800', color: tc.primary },
  monthLabel: { fontSize: 12, color: tc.textSecondary, marginTop: 3 },

  /* ⑤ 가이드 */
  guideCard: { paddingBottom: 0, overflow: 'hidden' },
  guideHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingBottom: 4,
  },
  guideSub: { fontSize: 12, color: tc.textSecondary },
  guideToggleIcon: { fontSize: 16, color: tc.textSecondary, fontWeight: '700' },
  guideBody: { marginTop: 16 },
  guideRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 8,
    backgroundColor: tc.background,
  },
  guideRowCurrent: {
    backgroundColor: '#E8F3F0',
    borderWidth: 1.5,
    borderColor: tc.primaryLight,
  },
  guideLeft: { flex: 1 },
  guideRankRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  guideEmoji: { fontSize: 16 },
  guideRank: { fontSize: 16, fontWeight: '700', color: tc.text },
  guideRankCurrent: { color: tc.primary },
  currentBadge: {
    backgroundColor: tc.primary, borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 10, color: tc.white, fontWeight: '700' },
  guideMonths: { fontSize: 12, color: tc.textSecondary },
  guideRight: { alignItems: 'flex-end', minWidth: 130 },
  guideAmount: { fontSize: 16, fontWeight: '800', color: tc.text, marginBottom: 6 },
  guideBarTrack: {
    width: 120, height: 6,
    backgroundColor: tc.border, borderRadius: 3, overflow: 'hidden',
  },
  guideBarFill: {
    height: '100%', backgroundColor: tc.textLight, borderRadius: 3,
  },
  guideNote: { fontSize: 12, color: tc.textLight, textAlign: 'right', marginTop: 8, marginBottom: 4 },
});
