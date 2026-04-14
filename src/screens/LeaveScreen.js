import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import Card from '../components/Card';
import AdBanner from '../components/AdBanner';
import DatePickerField from '../components/DatePickerField';
import { AD_UNITS } from '../constants/adUnits';
import {
  loadLeaveRecords, addLeaveRecord, deleteLeaveRecord,
  loadLeaveTotal, saveLeaveTotal,
} from '../utils/storage';
import { formatDateKo } from '../utils/dateUtils';

export default function LeaveScreen() {
  const [records, setRecords]           = useState([]);
  const [leaveTotal, setLeaveTotal]     = useState(21);
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput]     = useState('21');
  const [modalVisible, setModalVisible] = useState(false);

  // 폼 상태
  const [formDate, setFormDate] = useState('');
  const [formDays, setFormDays] = useState('');
  const [formMemo, setFormMemo] = useState('');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const r = await loadLeaveRecords();
    setRecords(r);
    const lt = await loadLeaveTotal();
    setLeaveTotal(lt);
    setTotalInput(String(lt));
  };

  const usedDays = records.reduce((s, r) => s + (r.days || 0), 0);
  const leftDays = leaveTotal - usedDays;

  const handleSaveTotal = async () => {
    const val = parseInt(totalInput, 10);
    if (isNaN(val) || val < 1 || val > 100) {
      Alert.alert('오류', '1~100 사이의 숫자를 입력해주세요.');
      return;
    }
    await saveLeaveTotal(val);
    setLeaveTotal(val);
    setEditingTotal(false);
  };

  const handleAddRecord = async () => {
    if (!formDate) {
      Alert.alert('오류', '휴가 시작일을 선택해주세요.');
      return;
    }
    const days = parseInt(formDays, 10);
    if (isNaN(days) || days < 1) {
      Alert.alert('오류', '사용 일수를 올바르게 입력해주세요.');
      return;
    }
    const updated = await addLeaveRecord({ date: formDate, days, memo: formMemo.trim() });
    setRecords(updated);
    setFormDate('');
    setFormDays('');
    setFormMemo('');
    setModalVisible(false);
  };

  const handleDelete = (id, date) => {
    Alert.alert('삭제', `${formatDateKo(date)} 휴가 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => setRecords(await deleteLeaveRecord(id)) },
    ]);
  };

  const closeModal = () => {
    setModalVisible(false);
    setFormDate('');
    setFormDays('');
    setFormMemo('');
  };

  // 광고를 3번째 항목 뒤에 삽입
  const listData = [];
  records.forEach((r, i) => {
    listData.push(r);
    if (i === 2) listData.push({ _isAd: true, id: 'ad_mid' });
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>휴가 관리</Text>

        {/* 휴가 요약 */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            {[
              { emoji: '🏖️', val: leaveTotal, label: '총 휴가', color: COLORS.primary },
              { emoji: '✅', val: usedDays,   label: '사용',    color: COLORS.primary },
              { emoji: '📋', val: leftDays,   label: '잔여',    color: leftDays < 0 ? COLORS.danger : COLORS.primary },
            ].map((item) => (
              <View key={item.label} style={styles.summaryItem}>
                <Text style={styles.summaryEmoji}>{item.emoji}</Text>
                <Text style={[styles.summaryBig, { color: item.color }]}>{item.val}일</Text>
                <Text style={styles.summarySub}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totalEditRow}>
            {editingTotal ? (
              <>
                <TextInput
                  style={styles.totalInput}
                  value={totalInput}
                  onChangeText={setTotalInput}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <TouchableOpacity style={styles.totalSaveBtn} onPress={handleSaveTotal}>
                  <Text style={styles.totalSaveBtnText}>저장</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.totalCancelBtn} onPress={() => { setTotalInput(String(leaveTotal)); setEditingTotal(false); }}>
                  <Text style={styles.totalCancelBtnText}>취소</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.totalEditBtn} onPress={() => setEditingTotal(true)}>
                <Text style={styles.totalEditBtnText}>총 휴가 수정 ({leaveTotal}일) ✏️</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ 휴가 기록 추가</Text>
        </TouchableOpacity>

        {/* 기록 리스트 */}
        {records.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>아직 휴가 기록이 없어요.</Text>
          </Card>
        ) : (
          listData.map((item) =>
            item._isAd ? (
              <AdBanner key="ad_mid" unit={AD_UNITS.LEAVE_MIDDLE} />
            ) : (
              <Card key={item.id} style={styles.recordCard}>
                <View style={styles.recordTop}>
                  <View style={styles.recordLeft}>
                    <Text style={styles.recordDate}>{formatDateKo(item.date)}</Text>
                    <Text style={styles.recordDays}>{item.days}일 사용</Text>
                  </View>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.date)}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
                {!!item.memo && <Text style={styles.recordMemo}>📝 {item.memo}</Text>}
              </Card>
            )
          )
        )}

        <AdBanner unit={AD_UNITS.LEAVE_BOTTOM} style={{ marginBottom: 12 }} />
      </ScrollView>

      {/* 추가 모달 */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>휴가 기록 추가</Text>

            {/* 캘린더 날짜 선택 */}
            <DatePickerField
              label="휴가 시작일"
              value={formDate}
              onChange={setFormDate}
              placeholder="날짜를 선택하세요"
            />

            <Text style={styles.formLabel}>사용 일수</Text>
            <TextInput
              style={styles.formInput}
              value={formDays}
              onChangeText={setFormDays}
              placeholder="숫자만 입력 (예: 5)"
              placeholderTextColor={COLORS.textLight}
              keyboardType="number-pad"
              maxLength={3}
            />

            <Text style={styles.formLabel}>메모 (선택)</Text>
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              value={formMemo}
              onChangeText={setFormMemo}
              placeholder="예) 1박 2일 여행"
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={closeModal}>
                <Text style={styles.modalCancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddRecord}>
                <Text style={styles.modalSaveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.primary, marginBottom: 18, marginTop: 6 },
  summaryCard: { paddingVertical: 20 },
  summaryRow: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 16 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryEmoji: { fontSize: 28, marginBottom: 7 },
  summaryBig: { fontSize: 24, fontWeight: '800' },
  summarySub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  totalEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalInput: {
    flex: 1, backgroundColor: COLORS.background, borderWidth: 1.5,
    borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: COLORS.text,
  },
  totalSaveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  totalSaveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  totalCancelBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  totalCancelBtnText: { color: COLORS.textSecondary, fontSize: 15 },
  totalEditBtn: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  totalEditBtnText: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '600' },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  emptyCard: { alignItems: 'center', paddingVertical: 36 },
  emptyEmoji: { fontSize: 42, marginBottom: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
  recordCard: { paddingVertical: 16 },
  recordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recordLeft: { flex: 1 },
  recordDate: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  recordDays: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '600', marginTop: 3 },
  recordMemo: { fontSize: 14, color: COLORS.textSecondary, marginTop: 9, lineHeight: 20 },
  deleteBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 13, color: COLORS.danger, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: COLORS.text, marginBottom: 20, textAlign: 'center' },
  formLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 9 },
  formInput: {
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: COLORS.text, marginBottom: 14,
  },
  formTextarea: { height: 76, textAlignVertical: 'top' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  modalCancelBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 16 },
  modalSaveBtn: { flex: 2, paddingVertical: 15, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalSaveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
