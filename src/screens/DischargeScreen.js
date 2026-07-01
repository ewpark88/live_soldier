import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeContext';
import SectionTitle from '../components/SectionTitle';
import Card from '../components/Card';
import AdBanner from '../components/AdBanner';
import DatePickerField from '../components/DatePickerField';
import FadeInView from '../components/FadeInView';
import MenuButton from '../components/MenuButton';
import EventCalendar from '../components/EventCalendar';
import { AD_UNITS } from '../constants/adUnits';
import {
  loadMilitaryInfo, saveMilitaryInfo,
  loadRankPromotions, saveRankPromotions, resetRankPromotions, calcDefaultPromotions,
  savePersonnelType, loadPersonnelType,
  loadLeaveRecords, loadLeaveBonusRecords, loadTodos,
} from '../utils/storage';
import { ranksFor } from '../constants/militaryRanks';
import AdInterstitial from '../components/AdInterstitial';
import useShowInterstitial from '../hooks/useShowInterstitial';
import {
  calcDischargeDate, calcDaysLeft, formatDate, formatDateKo,
} from '../utils/dateUtils';
import { BRANCHES, PERSONNEL_TYPES, isOfficer } from '../constants/serviceTerms';
import { updateDischargeWidget } from '../widget/updateWidget';

const BRANCH_LABEL = { army: '육군', navy: '해군', airforce: '공군', marines: '해병대' };

export default function DischargeScreen({ navigation }) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const insets = useSafeAreaInsets();

  const [enlistDate,    setEnlistDate]    = useState('');
  const [branch,        setBranch]        = useState('army');
  const [personnelType, setPersonnelType] = useState('soldier'); // soldier | nco | officer
  const [monthsInput,   setMonthsInput]   = useState('');         // 간부 복무개월 직접입력
  const [officerRank,   setOfficerRank]   = useState(null);       // 간부 현재 계급
  const [info,          setInfo]          = useState(null);
  const [editing,       setEditing]       = useState(false);      // 입력 폼 펼침 여부
  const { adVisible, show: showAd, handleClose: closeAd } = useShowInterstitial();

  /* 진급일 관련 */
  const [promotions,   setPromotions]   = useState(null);
  const [promoOpen,    setPromoOpen]    = useState(false);
  const [editingPromo, setEditingPromo] = useState(false);
  const [editPromo,    setEditPromo]    = useState(null);

  /* 캘린더용 (휴가/일정) */
  const [leaveRecords, setLeaveRecords] = useState([]);
  const [bonusRecords, setBonusRecords] = useState([]);
  const [todos,        setTodos]        = useState([]);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const mi = await loadMilitaryInfo();
    if (mi) {
      setInfo(mi);
      setEnlistDate(mi.enlistDate);
      setBranch(mi.branch);
      setPersonnelType(mi.personnelType ?? 'soldier');
      setOfficerRank(mi.officerRank ?? null);
      setMonthsInput(String(mi.months ?? ''));
      setEditing(false);
      setPromotions(await loadRankPromotions(mi.enlistDate));
      setLeaveRecords(await loadLeaveRecords());
      setBonusRecords(await loadLeaveBonusRecords());
      setTodos(await loadTodos());
    } else {
      // 입대정보 없는(새/빈) 프로필로 전환 시 폼 초기화 — 온보딩에서 정한 신분은 유지
      const pt = await loadPersonnelType();
      setInfo(null);
      setEnlistDate('');
      setBranch('army');
      setPersonnelType(pt ?? 'soldier');
      setOfficerRank(null);
      setMonthsInput('');
      setEditing(true); // 정보 없으면 바로 입력 폼
      setPromotions(null);
      setLeaveRecords([]);
      setBonusRecords([]);
      setTodos([]);
    }
  };

  const selectedBranch = BRANCHES.find((b) => b.key === branch);
  const officer = isOfficer(personnelType);

  const handleSave = async () => {
    if (!enlistDate) {
      Alert.alert('오류', '입대일을 선택해주세요.');
      return;
    }
    if (new Date(enlistDate) > new Date()) {
      Alert.alert('오류', '입대일이 오늘보다 미래일 수 없습니다.');
      return;
    }
    // 병사는 군별 의무복무기간 자동, 간부는 복무개월 직접입력
    let months;
    if (officer) {
      months = parseInt(monthsInput, 10);
      if (isNaN(months) || months < 1 || months > 240) {
        Alert.alert('오류', '복무 개월 수를 올바르게 입력해주세요 (1~240).');
        return;
      }
    } else {
      months = selectedBranch.months;
    }

    const dischargeDate = calcDischargeDate(enlistDate, months);
    const mi = {
      enlistDate,
      branch,
      personnelType,
      officerRank: officer ? (officerRank ?? null) : null,
      dischargeDate: formatDate(dischargeDate),
      months,
    };
    await saveMilitaryInfo(mi);
    await savePersonnelType(personnelType); // 신분 브리지 동기화

    /* 병사만 진급일 체계 적용. 입대일 변경 시 진급일 자동 재계산 */
    if (officer) {
      await resetRankPromotions();
      setPromotions(null);
    } else if (!info || info.enlistDate !== enlistDate || info.personnelType !== personnelType) {
      await resetRankPromotions();
      setPromotions(calcDefaultPromotions(enlistDate));
    }

    setInfo(mi);
    setEditing(false);
    updateDischargeWidget(); // 홈 위젯 갱신 (안드로이드)
    Alert.alert('저장 완료', '입대 정보가 저장되었습니다!');
    showAd();
  };

  /* 진급일 수정 시작 */
  const handleStartEditPromo = () => {
    setEditPromo({ ...promotions });
    setEditingPromo(true);
  };

  /* 진급일 저장 */
  const handleSavePromo = async () => {
    if (!editPromo.일병 || !editPromo.상병 || !editPromo.병장) {
      Alert.alert('오류', '진급일을 모두 입력해주세요.');
      return;
    }
    if (editPromo.일병 >= editPromo.상병 || editPromo.상병 >= editPromo.병장) {
      Alert.alert('오류', '진급일 순서가 올바르지 않습니다.\n일병 < 상병 < 병장 순이어야 합니다.');
      return;
    }
    await saveRankPromotions(editPromo);
    setPromotions(editPromo);
    setEditingPromo(false);
    updateDischargeWidget(); // 계급 변동 가능 → 위젯 갱신
    Alert.alert('저장 완료', '진급일이 저장되었습니다!');
  };

  /* 진급일 기본값 초기화 */
  const handleResetPromo = () => {
    Alert.alert(
      '기본값으로 초기화',
      '표준 진급일 기준으로 되돌립니다.\n(이병 2개월, 상병 8개월, 병장 14개월)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            await resetRankPromotions();
            setEditPromo(calcDefaultPromotions(info.enlistDate));
          },
        },
      ]
    );
  };

  const daysLeft    = info ? calcDaysLeft(info.dischargeDate) : 0;
  const infoOfficer = info ? isOfficer(info.personnelType) : false;
  const activePromo = editingPromo ? editPromo : promotions;
  const typeLabel   = PERSONNEL_TYPES.find((t) => t.key === (info?.personnelType))?.label ?? '';

  return (
    <View style={styles.container}>
      <AdInterstitial visible={adVisible} onClose={closeAd} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── 상단 (제목 + 햄버거) ── */}
        <View style={styles.topBar}>
          <Text style={styles.pageTitle}>전역일 계산</Text>
          <MenuButton navigation={navigation} current="discharge" />
        </View>

        {/* ── 입력 폼 (편집 중이거나 정보 없을 때만) ── */}
        {editing ? (
          <Card>
            <Text style={styles.sectionTitle}>입대 정보 입력</Text>

            <DatePickerField
              label="입대일"
              value={enlistDate}
              onChange={setEnlistDate}
              placeholder="입대일을 선택하세요"
              maximumDate={new Date()}
              minimumDate={new Date(2000, 0, 1)}
            />

            <Text style={[styles.label, { marginTop: 6 }]}>구분</Text>
            <View style={styles.typeRow}>
              {PERSONNEL_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeBtn, personnelType === t.key && styles.typeBtnActive]}
                  onPress={() => { setPersonnelType(t.key); setOfficerRank(null); }}
                >
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.typeLabel, personnelType === t.key && styles.typeLabelActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>군별 선택</Text>
            <View style={styles.branchRow}>
              {BRANCHES.map((b) => (
                <TouchableOpacity
                  key={b.key}
                  style={[styles.branchBtn, branch === b.key && styles.branchBtnActive]}
                  onPress={() => setBranch(b.key)}
                >
                  <Text style={styles.branchEmoji}>{b.emoji}</Text>
                  <Text style={[styles.branchLabel, branch === b.key && styles.branchLabelActive]}>
                    {b.label}
                  </Text>
                  {!officer && (
                    <Text style={[styles.branchMonths, branch === b.key && styles.branchMonthsActive]}>
                      {b.months}개월
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {officer ? (
              <>
                <Text style={[styles.label, { marginTop: 14 }]}>현재 계급</Text>
                <View style={styles.rankWrap}>
                  {ranksFor(personnelType).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.rankChip, officerRank === r && styles.rankChipActive]}
                      onPress={() => setOfficerRank(r)}
                    >
                      <Text style={[styles.rankChipText, officerRank === r && styles.rankChipTextActive]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 14 }]}>의무복무 개월 수</Text>
                <TextInput
                  style={styles.monthsInput}
                  value={monthsInput}
                  onChangeText={(t) => setMonthsInput(t.replace(/[^0-9]/g, ''))}
                  placeholder="예) 부사관 48, 장교 36"
                  placeholderTextColor={tc.textLight}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={styles.termNote}>
                  ⓘ 간부는 의무복무기간이 다양해 직접 입력합니다. 병사 진급·계급 체계는 적용되지 않습니다.
                </Text>
              </>
            ) : (
              <Text style={styles.termNote}>
                ⓘ 군복무 단축이 반영된 현행 복무기간 기준입니다.
              </Text>
            )}

            <View style={styles.formBtnRow}>
              {info && (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => loadData()}>
                  <Text style={styles.cancelBtnText}>취소</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>저장 및 계산</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ) : (
          info && (
            /* ── 입대정보 요약 (저장 후) ── */
            <FadeInView>
              <Card style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <SectionTitle icon="shield-checkmark-outline" size={16}>입대 정보</SectionTitle>
                  <TouchableOpacity
                    style={styles.editInfoBtn}
                    onPress={() => setEditing(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="create-outline" size={14} color={tc.primary} />
                    <Text style={styles.editInfoBtnText}>입대정보 수정하기</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>입대일</Text>
                    <Text style={styles.summaryValue}>{formatDateKo(info.enlistDate)}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>전역일</Text>
                    <Text style={[styles.summaryValue, { color: tc.accent }]}>{formatDateKo(info.dischargeDate)}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>구분 · 군별</Text>
                    <Text style={styles.summaryValue}>{BRANCH_LABEL[info.branch]} · {typeLabel}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>복무 기간</Text>
                    <Text style={styles.summaryValue}>{info.months}개월</Text>
                  </View>
                </View>

                <View style={styles.ddayBox}>
                  <Text style={styles.ddayLabel}>전역까지</Text>
                  <Text style={styles.ddayValue}>
                    {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-Day!' : '전역 완료!'}
                  </Text>
                </View>
              </Card>
            </FadeInView>
          )
        )}

        {/* ── 진급일 관리 + 캘린더 (정보 있고, 편집 중이 아닐 때) ── */}
        {info && !editing && (
          <>
            {/* 진급일 관리 (병사 전용) */}
            {!infoOfficer && (
              <Card style={styles.promoCard}>
                <TouchableOpacity
                  style={styles.promoHeaderRow}
                  onPress={() => setPromoOpen((v) => !v)}
                  activeOpacity={0.75}
                >
                  <View style={{ flex: 1 }}>
                    <SectionTitle icon="medal-outline" size={16} style={{ marginBottom: 4 }}>진급일 관리</SectionTitle>
                    <Text style={styles.promoDesc}>조기진급·부대 차이가 있을 경우 수정하세요</Text>
                  </View>
                  <Text style={styles.promoToggle}>{promoOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {promoOpen && activePromo && (
                  <View style={styles.promoBody}>
                    <View style={[styles.promoHint, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                      <Ionicons name="information-circle-outline" size={13} color={tc.primary} />
                      <Text style={[styles.promoHintText, { flex: 1 }]}>
                        기본값: 입대일 기준 +2개월(일병) / +8개월(상병) / +14개월(병장)
                      </Text>
                    </View>

                    <DatePickerField
                      label="일병 진급일"
                      value={activePromo.일병 ?? ''}
                      onChange={(v) => setEditPromo((p) => ({ ...p, 일병: v }))}
                      disabled={!editingPromo}
                      minimumDate={new Date(info.enlistDate)}
                    />
                    <DatePickerField
                      label="상병 진급일"
                      value={activePromo.상병 ?? ''}
                      onChange={(v) => setEditPromo((p) => ({ ...p, 상병: v }))}
                      disabled={!editingPromo}
                      minimumDate={new Date(info.enlistDate)}
                    />
                    <DatePickerField
                      label="병장 진급일"
                      value={activePromo.병장 ?? ''}
                      onChange={(v) => setEditPromo((p) => ({ ...p, 병장: v }))}
                      disabled={!editingPromo}
                      minimumDate={new Date(info.enlistDate)}
                    />

                    {editingPromo ? (
                      <View style={styles.promoBtnRow}>
                        <TouchableOpacity style={styles.promoResetBtn} onPress={handleResetPromo}>
                          <Text style={styles.promoResetBtnText}>기본값 초기화</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.promoCancelBtn} onPress={() => setEditingPromo(false)}>
                          <Text style={styles.promoCancelBtnText}>취소</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.promoSaveBtn} onPress={handleSavePromo}>
                          <Text style={styles.promoSaveBtnText}>저장</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.promoEditBtn, { flexDirection: 'row', justifyContent: 'center', gap: 6 }]}
                        onPress={handleStartEditPromo}
                      >
                        <Ionicons name="create-outline" size={15} color={tc.primary} />
                        <Text style={styles.promoEditBtnText}>진급일 수정하기</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </Card>
            )}

            {/* 휴가·일정 캘린더 */}
            <Card style={styles.calendarCard}>
              <SectionTitle icon="calendar-outline" size={16} style={{ marginBottom: 4 }}>휴가 · 일정 캘린더</SectionTitle>
              <Text style={styles.calendarSub}>날짜를 탭하면 그날의 휴가·일정을 볼 수 있어요</Text>
              <View style={{ marginTop: 10 }}>
                <EventCalendar records={leaveRecords} bonusRecords={bonusRecords} todos={todos} />
              </View>
            </Card>

            <AdBanner unit={AD_UNITS.DISCHARGE_BOTTOM} style={{ marginBottom: 12 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  container:  { flex: 1, backgroundColor: tc.background },
  scroll:     { padding: 16, paddingBottom: 24 },
  topBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  pageTitle:  { fontSize: 26, fontWeight: '800', color: tc.primary },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: tc.text, marginBottom: 4 },
  label:      { fontSize: 14, fontWeight: '600', color: tc.textSecondary, marginBottom: 9 },
  termNote:   { fontSize: 12, color: tc.textLight, marginTop: 10, marginLeft: 2 },

  typeRow:            { flexDirection: 'row', gap: 8, marginTop: 8 },
  typeBtn:            { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: tc.border, backgroundColor: tc.background },
  typeBtnActive:      { borderColor: tc.primary, backgroundColor: `${tc.primary}15` },
  typeEmoji:          { fontSize: 20, marginBottom: 4 },
  typeLabel:          { fontSize: 14, fontWeight: '700', color: tc.textSecondary },
  typeLabelActive:    { color: tc.primary },
  monthsInput:        { backgroundColor: tc.background, borderWidth: 1.5, borderColor: tc.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: tc.text, marginTop: 4 },
  rankWrap:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  rankChip:           { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: tc.border, backgroundColor: tc.background },
  rankChipActive:     { borderColor: tc.primary, backgroundColor: `${tc.primary}15` },
  rankChipText:       { fontSize: 14, fontWeight: '700', color: tc.textSecondary },
  rankChipTextActive: { color: tc.primary },

  branchRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4, marginTop: 8 },
  branchBtn:          { width: '47.5%', alignItems: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 1.5, borderColor: tc.border, backgroundColor: tc.background },
  branchBtnActive:    { borderColor: tc.primary, backgroundColor: `${tc.primary}15` },
  branchEmoji:        { fontSize: 24, marginBottom: 5 },
  branchLabel:        { fontSize: 15, fontWeight: '700', color: tc.textSecondary },
  branchLabelActive:  { color: tc.primary },
  branchMonths:       { fontSize: 12, color: tc.textLight, marginTop: 3 },
  branchMonthsActive: { color: tc.primaryLight },

  formBtnRow:  { flexDirection: 'row', gap: 10, marginTop: 20 },
  saveBtn:     { flex: 2, backgroundColor: tc.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: tc.white, fontWeight: '700', fontSize: 17 },
  cancelBtn:   { flex: 1, backgroundColor: tc.background, borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: tc.border },
  cancelBtnText: { color: tc.textSecondary, fontWeight: '600', fontSize: 16 },

  /* 입대정보 요약 */
  summaryCard:    { paddingVertical: 18 },
  summaryHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  editInfoBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: tc.primary },
  editInfoBtnText:{ fontSize: 13, fontWeight: '700', color: tc.primary },
  summaryGrid:    { flexDirection: 'row', flexWrap: 'wrap' },
  summaryItem:    { width: '50%', marginBottom: 14 },
  summaryLabel:   { fontSize: 12.5, color: tc.textSecondary, marginBottom: 4 },
  summaryValue:   { fontSize: 15, fontWeight: '700', color: tc.text },
  ddayBox:        { alignItems: 'center', paddingVertical: 18, backgroundColor: tc.primary, borderRadius: 12, marginTop: 2 },
  ddayLabel:      { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  ddayValue:      { fontSize: 44, fontWeight: '900', color: tc.white, letterSpacing: -1 },

  /* 진급일 관리 */
  promoCard:        { marginTop: 4, paddingBottom: 8 },
  promoHeaderRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  promoDesc:        { fontSize: 12, color: tc.textSecondary, marginTop: 2 },
  promoToggle:      { fontSize: 16, color: tc.textSecondary, fontWeight: '700', marginTop: 2 },
  promoBody:        { marginTop: 16 },
  promoHint:        { backgroundColor: `${tc.primary}12`, borderRadius: 10, padding: 12, marginBottom: 14 },
  promoHintText:    { fontSize: 12, color: tc.primary, fontWeight: '600', lineHeight: 18 },
  promoBtnRow:      { flexDirection: 'row', gap: 8, marginTop: 8 },
  promoResetBtn:    { flex: 1.2, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: '#E53935', alignItems: 'center' },
  promoResetBtnText:{ color: '#E53935', fontWeight: '700', fontSize: 12 },
  promoCancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: tc.border, alignItems: 'center' },
  promoCancelBtnText: { color: tc.textSecondary, fontWeight: '600', fontSize: 14 },
  promoSaveBtn:     { flex: 1.2, paddingVertical: 13, borderRadius: 10, backgroundColor: tc.primary, alignItems: 'center' },
  promoSaveBtnText: { color: tc.white, fontWeight: '700', fontSize: 14 },
  promoEditBtn:     { marginTop: 8, paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: tc.primary, alignItems: 'center' },
  promoEditBtnText: { color: tc.primary, fontWeight: '700', fontSize: 15 },

  /* 캘린더 */
  calendarCard: { marginTop: 4, paddingVertical: 16 },
  calendarSub:  { fontSize: 12, color: tc.textSecondary },
});
