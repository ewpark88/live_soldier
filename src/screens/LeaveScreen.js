import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeContext';
import SectionTitle from '../components/SectionTitle';
import Card from '../components/Card';
import AdBanner from '../components/AdBanner';
import DatePickerField from '../components/DatePickerField';
import RangeCalendar from '../components/RangeCalendar';
import MenuButton from '../components/MenuButton';
import FadeInView from '../components/FadeInView';
import { AD_UNITS } from '../constants/adUnits';
import {
  loadLeaveRecords, addLeaveRecord, deleteLeaveRecord,
  loadLeaveTotal, saveLeaveTotal,
  loadLeaveBonusRecords, addLeaveBonusRecord, deleteLeaveBonusRecord,
  loadMilitaryInfo,
} from '../utils/storage';
import { formatDateKo, daysBetweenInclusive } from '../utils/dateUtils';
import SetupRequired from '../components/SetupRequired';
import AdInterstitial from '../components/AdInterstitial';
import useShowInterstitial from '../hooks/useShowInterstitial';

/* ─── 모달 타입 ─────────────────────────────────────────────── */
// 'use'   : 일반 휴가 사용 기록 추가
// 'bonus' : 포상휴가 추가
const MODAL_NONE  = null;
const MODAL_USE   = 'use';
const MODAL_BONUS = 'bonus';

export default function LeaveScreen({ navigation }) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const insets = useSafeAreaInsets();
  const { adVisible, show: showAd, handleClose: closeAd } = useShowInterstitial();
  const [militaryInfo, setMilitaryInfo] = useState(undefined); // undefined=로딩중
  const [records,      setRecords]      = useState([]);
  const [bonusRecords, setBonusRecords] = useState([]);
  const [leaveBase,    setLeaveBase]    = useState(21);
  const [editingBase,  setEditingBase]  = useState(false);
  const [baseInput,    setBaseInput]    = useState('21');
  const [modalType,    setModalType]    = useState(MODAL_NONE);
  // 공통 폼 상태 (사용 / 포상 모두 동일 필드)
  const [formDate,    setFormDate]    = useState('');
  const [formEndDate, setFormEndDate] = useState(''); // 휴가 사용 기간 종료일 (단일이면 '')
  const [formDays,    setFormDays]    = useState('');
  const [formMemo,    setFormMemo]    = useState('');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const mi = await loadMilitaryInfo();
    setMilitaryInfo(mi);
    if (!mi) return;
    const r  = await loadLeaveRecords();
    const br = await loadLeaveBonusRecords();
    const lt = await loadLeaveTotal();
    setRecords(r);
    setBonusRecords(br);
    setLeaveBase(lt);
    setBaseInput(String(lt));
  };

  /* ─── 계산 ─────────────────────────────────────────────────── */
  const usedDays  = records.reduce((s, r) => s + (r.days || 0), 0);
  const bonusDays = bonusRecords.reduce((s, r) => s + (r.days || 0), 0);
  const totalDays = leaveBase + bonusDays;
  const leftDays  = totalDays - usedDays;

  /* ─── 기본 휴가 수정 ─────────────────────────────────────────── */
  const handleSaveBase = async () => {
    const val = parseInt(baseInput, 10);
    if (isNaN(val) || val < 1 || val > 100) {
      Alert.alert('오류', '1~100 사이의 숫자를 입력해주세요.');
      return;
    }
    await saveLeaveTotal(val);
    setLeaveBase(val);
    setEditingBase(false);
  };

  /* ─── 휴가 사용 추가 ─────────────────────────────────────────── */
  const handleAddUse = async () => {
    if (!formDate) { Alert.alert('오류', '휴가 시작일을 선택해주세요.'); return; }
    // 기간 캘린더에서 시작~종료를 선택 → 일수 자동 계산 (단일이면 1일)
    const days = daysBetweenInclusive(formDate, formEndDate || formDate);
    if (days < 1) { Alert.alert('오류', '휴가 날짜를 다시 선택해주세요.'); return; }
    const updated = await addLeaveRecord({ date: formDate, days, memo: formMemo.trim() });
    setRecords(updated);
    closeModal();
    showAd();
  };

  /* ─── 포상휴가 추가 ─────────────────────────────────────────── */
  const handleAddBonus = async () => {
    if (!formDate) { Alert.alert('오류', '부여일을 선택해주세요.'); return; }
    const days = parseInt(formDays, 10);
    if (isNaN(days) || days < 1) { Alert.alert('오류', '일수를 올바르게 입력해주세요.'); return; }
    const updated = await addLeaveBonusRecord({ date: formDate, days, memo: formMemo.trim() });
    setBonusRecords(updated);
    closeModal();
    showAd();
  };

  /* ─── 삭제 ─────────────────────────────────────────────────── */
  const handleDeleteUse = (id, date) => {
    Alert.alert('삭제', `${formatDateKo(date)} 휴가 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => setRecords(await deleteLeaveRecord(id)) },
    ]);
  };

  const handleDeleteBonus = (id, date) => {
    Alert.alert('삭제', `${formatDateKo(date)} 포상휴가를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => setBonusRecords(await deleteLeaveBonusRecord(id)) },
    ]);
  };

  /* ─── 모달 닫기 ─────────────────────────────────────────────── */
  const closeModal = () => {
    setModalType(MODAL_NONE);
    setFormDate('');
    setFormEndDate('');
    setFormDays('');
    setFormMemo('');
  };

  const isBonus = modalType === MODAL_BONUS;

  if (militaryInfo === undefined) return null; // 로딩 중
  if (!militaryInfo) return <SetupRequired />;

  return (
    <View style={styles.container}>
      <AdInterstitial visible={adVisible} onClose={closeAd} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Text style={styles.pageTitle}>휴가 관리</Text>
          <MenuButton navigation={navigation} current="leave" />
        </View>

        {/* ── 요약 카드 ── */}
        <FadeInView>
        <Card style={styles.summaryCard}>
          {/* 상단: 기본 + 포상 = 총 가용 */}
          <View style={styles.calcRow}>
            <View style={styles.calcItem}>
              <Text style={styles.calcVal}>{leaveBase}일</Text>
              <Text style={styles.calcLabel}>기본 휴가</Text>
            </View>
            <Text style={styles.calcOp}>＋</Text>
            <View style={styles.calcItem}>
              <Text style={[styles.calcVal, { color: tc.accent }]}>{bonusDays}일</Text>
              <Text style={styles.calcLabel}>포상 휴가</Text>
            </View>
            <Text style={styles.calcOp}>＝</Text>
            <View style={styles.calcItem}>
              <Text style={[styles.calcVal, { color: tc.primary, fontSize: 22 }]}>{totalDays}일</Text>
              <Text style={styles.calcLabel}>총 가용</Text>
            </View>
          </View>

          {/* 구분선 */}
          <View style={styles.divider} />

          {/* 하단: 사용 / 잔여 */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="checkmark-circle" size={26} color={tc.primary} style={styles.summaryEmoji} />
              <Text style={[styles.summaryBig, { color: tc.primary }]}>{usedDays}일</Text>
              <Text style={styles.summarySub}>사용</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="documents-outline" size={24} color={tc.primary} style={styles.summaryEmoji} />
              <Text style={[
                styles.summaryBig,
                { color: leftDays < 0 ? tc.danger : tc.primary },
              ]}>
                {leftDays}일
              </Text>
              <Text style={styles.summarySub}>잔여</Text>
            </View>
          </View>

          {/* 기본 휴가 수정 */}
          <View style={styles.baseEditRow}>
            {editingBase ? (
              <>
                <TextInput
                  style={styles.baseInput}
                  value={baseInput}
                  onChangeText={setBaseInput}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <TouchableOpacity style={styles.baseSaveBtn} onPress={handleSaveBase}>
                  <Text style={styles.baseSaveBtnText}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.baseCancelBtn} onPress={() => { setBaseInput(String(leaveBase)); setEditingBase(false); }}>
                  <Text style={styles.baseCancelBtnText}>취소</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={[styles.baseEditBtn, { flexDirection: 'row', gap: 5 }]} onPress={() => setEditingBase(true)}>
                <Text style={styles.baseEditBtnText}>기본 휴가 수정 ({leaveBase}일)</Text>
                <Ionicons name="create-outline" size={14} color={tc.primaryLight} />
              </TouchableOpacity>
            )}
          </View>
        </Card>
        </FadeInView>

        {/* ── 버튼 행 ── */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.addUseBtn, { flexDirection: 'row', gap: 6 }]} onPress={() => setModalType(MODAL_USE)}>
            <Ionicons name="add-circle-outline" size={16} color={tc.white} />
            <Text style={styles.addUseBtnText}>휴가 사용</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addBonusBtn, { flexDirection: 'row', gap: 6 }]} onPress={() => setModalType(MODAL_BONUS)}>
            <Ionicons name="add-circle-outline" size={16} color={tc.white} />
            <Text style={styles.addBonusBtnText}>포상휴가 추가</Text>
          </TouchableOpacity>
        </View>

        {/* ── 캘린더 안내 (달력은 전역 탭으로 이전) ── */}
        <TouchableOpacity
          style={styles.calendarHint}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('discharge')}
        >
          <Ionicons name="calendar-outline" size={18} color={tc.primary} />
          <Text style={styles.calendarHintText}>휴가·일정 달력은 ‘전역’ 탭에서 볼 수 있어요</Text>
          <Ionicons name="chevron-forward" size={16} color={tc.textSecondary} />
        </TouchableOpacity>

        {/* ── 포상휴가 목록 ── */}
        {bonusRecords.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <SectionTitle icon="medal-outline" size={16}>포상휴가</SectionTitle>
              <Text style={styles.sectionTotal}>총 {bonusDays}일 추가됨</Text>
            </View>
            {bonusRecords.map((item) => (
              <Card key={item.id} style={styles.bonusCard}>
                <View style={styles.recordTop}>
                  <View style={styles.recordLeft}>
                    <Text style={styles.recordDate}>{formatDateKo(item.date)}</Text>
                    <Text style={[styles.recordDays, { color: tc.accent }]}>
                      ＋{item.days}일 포상
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteBonus(item.id, item.date)}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
                {!!item.memo && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="document-text-outline" size={12} color={tc.textSecondary} />
                    <Text style={styles.recordMemo}>{item.memo}</Text>
                  </View>
                )}
              </Card>
            ))}
          </>
        )}

        {/* ── 휴가 사용 목록 ── */}
        {(
          <>
            <View style={styles.sectionHeader}>
              <SectionTitle icon="list-outline" size={16}>사용 기록</SectionTitle>
              <Text style={styles.sectionTotal}>총 {usedDays}일 사용</Text>
            </View>

            {records.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="file-tray-outline" size={50} color={tc.textLight} style={styles.emptyEmoji} />
                <Text style={styles.emptyText}>아직 휴가 사용 기록이 없어요.</Text>
              </Card>
            ) : (
              records.map((item) => (
                <Card key={item.id} style={styles.recordCard}>
                  <View style={styles.recordTop}>
                    <View style={styles.recordLeft}>
                      <Text style={styles.recordDate}>{formatDateKo(item.date)}</Text>
                      <Text style={styles.recordDays}>{item.days}일 사용</Text>
                    </View>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteUse(item.id, item.date)}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {!!item.memo && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="document-text-outline" size={12} color={tc.textSecondary} />
                      <Text style={styles.recordMemo}>{item.memo}</Text>
                    </View>
                  )}
                </Card>
              ))
            )}
          </>
        )}

        <AdBanner unit={AD_UNITS.LEAVE_BOTTOM} style={{ marginBottom: 12 }} />
      </ScrollView>

      {/* ── 추가 모달 (사용 / 포상 공용) ── */}
      <Modal visible={modalType !== MODAL_NONE} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBox}>
            {/* 상단 인디케이터 */}
            <View style={styles.modalHandle} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScroll}
            >
              <Text style={styles.modalTitle}>
                {isBonus ? '포상휴가 추가' : '휴가 사용 기록'}
              </Text>

              {isBonus ? (
                <>
                  <View style={styles.bonusNotice}>
                    <Text style={styles.bonusNoticeText}>
                      포상휴가는 총 가용 휴가에 자동으로 합산됩니다.
                    </Text>
                  </View>

                  <DatePickerField
                    label="포상휴가 부여일"
                    value={formDate}
                    onChange={setFormDate}
                    placeholder="날짜를 선택하세요"
                  />

                  <Text style={styles.formLabel}>포상 일수</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formDays}
                    onChangeText={setFormDays}
                    placeholder="숫자만 입력 (예: 3)"
                    placeholderTextColor={tc.textLight}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.formLabel}>휴가 기간 (시작 ~ 종료)</Text>
                  <View style={styles.calendarBox}>
                    <RangeCalendar
                      startDate={formDate}
                      endDate={formEndDate}
                      onChange={(start, end) => { setFormDate(start); setFormEndDate(end); }}
                    />
                  </View>
                </>
              )}

              <Text style={styles.formLabel}>메모 (선택)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                value={formMemo}
                onChangeText={setFormMemo}
                placeholder={isBonus ? '예) 분대장 포상, GOP 포상' : '예) 1박 2일 귀향'}
                placeholderTextColor={tc.textLight}
                multiline
                numberOfLines={2}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={closeModal}>
                  <Text style={styles.modalCancelBtnText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, isBonus && styles.modalSaveBtnBonus]}
                  onPress={isBonus ? handleAddBonus : handleAddUse}
                >
                  <Text style={styles.modalSaveBtnText}>저장</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  container: { flex: 1, backgroundColor: tc.background },
  scroll: { padding: 16, paddingBottom: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: tc.primary },

  /* 요약 카드 */
  summaryCard: { paddingVertical: 18 },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 4,
  },
  calcItem: { alignItems: 'center', minWidth: 64 },
  calcVal: { fontSize: 20, fontWeight: '800', color: tc.text },
  calcLabel: { fontSize: 11, color: tc.textSecondary, marginTop: 2 },
  calcOp: { fontSize: 18, color: tc.textLight, fontWeight: '700', marginHorizontal: 2, paddingBottom: 12 },
  divider: { height: 1, backgroundColor: tc.border, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', marginBottom: 14 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryEmoji: { fontSize: 26, marginBottom: 6 },
  summaryBig: { fontSize: 24, fontWeight: '800' },
  summarySub: { fontSize: 13, color: tc.textSecondary, marginTop: 3 },
  summaryDivider: { width: 1, backgroundColor: tc.border },

  /* 기본 휴가 수정 */
  baseEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: tc.border, paddingTop: 12 },
  baseInput: {
    flex: 1, backgroundColor: tc.background, borderWidth: 1.5,
    borderColor: tc.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: tc.text,
  },
  baseSaveBtn: { backgroundColor: tc.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  baseSaveBtnText: { color: tc.white, fontWeight: '700', fontSize: 15 },
  baseCancelBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  baseCancelBtnText: { color: tc.textSecondary, fontSize: 15 },
  baseEditBtn: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  baseEditBtnText: { fontSize: 14, color: tc.primaryLight, fontWeight: '600' },

  /* 버튼 행 */
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addUseBtn: {
    flex: 1, backgroundColor: tc.primary,
    borderRadius: 12, paddingVertical: 15, alignItems: 'center',
  },
  addUseBtnText: { color: tc.white, fontWeight: '700', fontSize: 15 },
  addBonusBtn: {
    flex: 1, backgroundColor: tc.accent,
    borderRadius: 12, paddingVertical: 15, alignItems: 'center',
  },
  addBonusBtnText: { color: tc.white, fontWeight: '700', fontSize: 15 },

  /* 캘린더 안내 (전역 탭으로 이전) */
  calendarHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: tc.highlightBg, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 16,
  },
  calendarHintText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: tc.primary },

  /* 섹션 헤더 */
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10, marginTop: 6,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: tc.text },
  sectionTotal: { fontSize: 13, color: tc.textSecondary, fontWeight: '600' },

  /* 포상 카드 */
  bonusCard: {
    paddingVertical: 14,
    borderLeftWidth: 4,
    borderLeftColor: tc.accent,
  },

  /* 기록 카드 */
  recordCard: { paddingVertical: 16 },
  recordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recordLeft: { flex: 1 },
  recordDate: { fontSize: 16, fontWeight: '700', color: tc.text },
  recordDays: { fontSize: 14, color: tc.primaryLight, fontWeight: '600', marginTop: 3 },
  recordMemo: { fontSize: 14, color: tc.textSecondary, marginTop: 9, lineHeight: 20 },
  deleteBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: tc.background, alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 13, color: tc.danger, fontWeight: '700' },

  emptyCard: { alignItems: 'center', paddingVertical: 36 },
  emptyEmoji: { fontSize: 42, marginBottom: 12 },
  emptyText: { fontSize: 15, color: tc.textSecondary },

  /* 모달 */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: tc.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 14, paddingBottom: 34,
    maxHeight: '90%',
  },
  modalScroll: { paddingBottom: 10 },
  modalHandle: {
    width: 40, height: 4, backgroundColor: tc.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 19, fontWeight: '800', color: tc.text, marginBottom: 16, textAlign: 'center' },
  calendarBox: { backgroundColor: tc.background, borderRadius: 14, borderWidth: 1.5, borderColor: tc.border, paddingHorizontal: 8, paddingVertical: 6, marginBottom: 14 },
  bonusNotice: {
    backgroundColor: '#FFF8E1', borderRadius: 8, padding: 10,
    marginBottom: 14, borderLeftWidth: 3, borderLeftColor: tc.accent,
  },
  bonusNoticeText: { fontSize: 13, color: '#7A4800', lineHeight: 18 },
  formLabel: { fontSize: 14, fontWeight: '600', color: tc.textSecondary, marginBottom: 9 },
  formInput: {
    backgroundColor: tc.background, borderWidth: 1.5, borderColor: tc.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: tc.text, marginBottom: 14,
  },
  formTextarea: { height: 76, textAlignVertical: 'top' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 15, borderRadius: 12,
    borderWidth: 1.5, borderColor: tc.border, alignItems: 'center',
  },
  modalCancelBtnText: { color: tc.textSecondary, fontWeight: '600', fontSize: 16 },
  modalSaveBtn: {
    flex: 2, paddingVertical: 15, borderRadius: 12,
    backgroundColor: tc.primary, alignItems: 'center',
  },
  modalSaveBtnBonus: { backgroundColor: tc.accent },
  modalSaveBtnText: { color: tc.white, fontWeight: '700', fontSize: 16 },
});
