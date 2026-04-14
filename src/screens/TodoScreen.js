import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import Card from '../components/Card';
import AdBanner from '../components/AdBanner';
import DatePickerField from '../components/DatePickerField';
import { AD_UNITS } from '../constants/adUnits';
import { loadTodos, addTodo, toggleTodo, deleteTodo } from '../utils/storage';
import { formatDate, formatDateKo } from '../utils/dateUtils';

const today = formatDate(new Date());

export default function TodoScreen() {
  const [todos, setTodos]               = useState([]);
  const [filterDate, setFilterDate]     = useState('');
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formTitle, setFormTitle]       = useState('');
  const [formDate, setFormDate]         = useState(today);
  const [formNote, setFormNote]         = useState('');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => setTodos(await loadTodos());

  const handleAdd = async () => {
    if (!formTitle.trim()) { Alert.alert('오류', '할 일 내용을 입력해주세요.'); return; }
    setTodos(await addTodo({ title: formTitle.trim(), date: formDate || today, note: formNote.trim() }));
    setFormTitle('');
    setFormDate(today);
    setFormNote('');
    setModalVisible(false);
  };

  const handleToggle = async (id) => setTodos(await toggleTodo(id));

  const handleDelete = (id, title) => {
    Alert.alert('삭제', `"${title}"을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => setTodos(await deleteTodo(id)) },
    ]);
  };

  const closeModal = () => {
    setModalVisible(false);
    setFormTitle('');
    setFormDate(today);
    setFormNote('');
  };

  const filtered = todos.filter((t) => !filterDate || t.date === filterDate);

  const grouped = filtered.reduce((acc, t) => {
    const key = t.date || today;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === today) return -1;
    if (b === today) return 1;
    return a < b ? -1 : 1;
  });

  const totalCount = todos.length;
  const doneCount  = todos.filter((t) => t.done).length;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>일정 관리</Text>

        {/* 요약 */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            {[
              { val: totalCount,              label: '전체',   color: COLORS.primary },
              { val: doneCount,               label: '완료',   color: COLORS.success },
              { val: totalCount - doneCount,  label: '미완료', color: COLORS.accent },
            ].map((item) => (
              <View key={item.label} style={styles.summaryItem}>
                <Text style={[styles.summaryBig, { color: item.color }]}>{item.val}</Text>
                <Text style={styles.summarySub}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* 날짜 필터 (캘린더) */}
          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <DatePickerField
                value={filterDate}
                onChange={setFilterDate}
                placeholder="날짜로 필터링"
              />
            </View>
            {filterDate ? (
              <TouchableOpacity style={styles.filterClearBtn} onPress={() => setFilterDate('')}>
                <Text style={styles.filterClearText}>전체</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Card>

        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ 할 일 추가</Text>
        </TouchableOpacity>

        {/* 날짜별 그룹 */}
        {sortedDates.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>
              {filterDate ? `${formatDateKo(filterDate)}에 일정이 없어요.` : '할 일을 추가해보세요!'}
            </Text>
          </Card>
        ) : (
          sortedDates.map((date, idx) => (
            <View key={date}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>
                  {date === today ? '📅 오늘' : `📅 ${formatDateKo(date)}`}
                </Text>
                <Text style={styles.dateHeaderCount}>
                  {grouped[date].filter((t) => t.done).length}/{grouped[date].length}
                </Text>
              </View>

              {grouped[date].map((item) => (
                <TodoItem
                  key={item.id}
                  item={item}
                  onToggle={() => handleToggle(item.id)}
                  onDelete={() => handleDelete(item.id, item.title)}
                />
              ))}

              {idx === 1 && <AdBanner unit={AD_UNITS.TODO_MIDDLE} />}
            </View>
          ))
        )}

        <AdBanner unit={AD_UNITS.TODO_BOTTOM} style={{ marginBottom: 12 }} />
      </ScrollView>

      {/* 추가 모달 */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>할 일 추가</Text>

            <Text style={styles.formLabel}>할 일 내용 *</Text>
            <TextInput
              style={styles.formInput}
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder="예) 내무반 청소, 면회 신청..."
              placeholderTextColor={COLORS.textLight}
              autoFocus
            />

            {/* 캘린더 날짜 선택 */}
            <DatePickerField
              label="날짜"
              value={formDate}
              onChange={setFormDate}
              placeholder="날짜 선택"
            />

            <Text style={styles.formLabel}>메모 (선택)</Text>
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              value={formNote}
              onChangeText={setFormNote}
              placeholder="추가 메모..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={2}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={closeModal}>
                <Text style={styles.modalCancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAdd}>
                <Text style={styles.modalSaveBtnText}>추가</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function TodoItem({ item, onToggle, onDelete }) {
  return (
    <Card style={[styles.todoCard, item.done && styles.todoCardDone]}>
      <TouchableOpacity style={styles.todoRow} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
          {item.done && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.todoContent}>
          <Text style={[styles.todoTitle, item.done && styles.todoTitleDone]} numberOfLines={2}>
            {item.title}
          </Text>
          {!!item.note && <Text style={styles.todoNote} numberOfLines={1}>{item.note}</Text>}
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.primary, marginBottom: 18, marginTop: 6 },
  summaryCard: { paddingVertical: 16 },
  summaryRow: { flexDirection: 'row', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 14 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryBig: { fontSize: 26, fontWeight: '800' },
  summarySub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterClearBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.background, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.primaryLight,
    marginBottom: 14,
  },
  filterClearText: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '600' },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  emptyCard: { alignItems: 'center', paddingVertical: 36 },
  emptyEmoji: { fontSize: 38, marginBottom: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  dateHeaderText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  dateHeaderCount: { fontSize: 13, color: COLORS.textSecondary },
  todoCard: { paddingVertical: 14, paddingHorizontal: 14 },
  todoCardDone: { opacity: 0.55, backgroundColor: COLORS.background },
  todoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.white, fontSize: 14, fontWeight: '900' },
  todoContent: { flex: 1 },
  todoTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, lineHeight: 22 },
  todoTitleDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  todoNote: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  deleteBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 12, color: COLORS.danger, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: COLORS.text, marginBottom: 22, textAlign: 'center' },
  formLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 9 },
  formInput: {
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: COLORS.text, marginBottom: 14,
  },
  formTextarea: { height: 76, textAlignVertical: 'top' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  modalCancelBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 16 },
  modalSaveBtn: { flex: 2, paddingVertical: 15, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalSaveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
