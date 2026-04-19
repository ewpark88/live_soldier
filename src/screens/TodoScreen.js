import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import Card from '../components/Card';
import AdBanner from '../components/AdBanner';
import DatePickerField from '../components/DatePickerField';
import { AD_UNITS } from '../constants/adUnits';
import { loadTodos, addTodo, toggleTodo, deleteTodo, loadMilitaryInfo } from '../utils/storage';
import { formatDate, formatDateKo } from '../utils/dateUtils';
import SetupRequired from '../components/SetupRequired';

function getToday() { return formatDate(new Date()); }

function isInRange(todo, filterDate) {
  if (!filterDate) return true;
  if (!todo.endDate) return todo.date === filterDate;
  return todo.date <= filterDate && filterDate <= todo.endDate;
}

function formatRange(startDate, endDate) {
  if (!endDate || endDate === startDate) return formatDateKo(startDate);
  return `${formatDateKo(startDate)} ~ ${formatDateKo(endDate)}`;
}

function calcDuration(startDate, endDate) {
  if (!endDate || endDate === startDate) return null;
  return Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
}

/* 시작일 기준으로 N일 후 날짜 문자열 반환 */
function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n - 1);
  return formatDate(d);
}

/* ─── 훈련 프리셋 ─────────────────────────────────────────── */
const TRAINING_PRESETS = [
  {
    emoji: '❄️',
    name: '혹한기 훈련',
    days: 7,
    color: '#5B9BD5',
    note: '연 1회 동계 필수 훈련',
  },
  {
    emoji: '🏃',
    name: '유격훈련',
    days: 5,
    color: '#70AD47',
    note: '연 1회 전투체력 필수 훈련',
  },
  {
    emoji: '☣️',
    name: '화생방 훈련',
    days: 2,
    color: '#FF7043',
    note: '연 1회 CBRN 방호 훈련',
  },
  {
    emoji: '🎯',
    name: '사격 훈련',
    days: 2,
    color: '#E53935',
    note: '정기 개인화기 사격',
  },
  {
    emoji: '💪',
    name: '체력검정',
    days: 1,
    color: '#8E24AA',
    note: '체력단련 평가 (달리기·팔굽혀펴기·윗몸)',
  },
  {
    emoji: '🌙',
    name: '야간훈련',
    days: 2,
    color: '#37474F',
    note: '야간 전술훈련',
  },
  {
    emoji: '🚨',
    name: '비상소집',
    days: 1,
    color: '#F4511E',
    note: '전시 대비 비상 훈련',
  },
  {
    emoji: '🔫',
    name: '전술훈련',
    days: 3,
    color: '#558B2F',
    note: '소대·중대급 전술 기동훈련',
  },
  {
    emoji: '🏥',
    name: '구급법 교육',
    days: 1,
    color: '#00897B',
    note: '응급처치·심폐소생술 교육',
  },
  {
    emoji: '🖥️',
    name: '사이버 교육',
    days: 1,
    color: '#1E88E5',
    note: '사이버 보안·정보보호 교육',
  },
  {
    emoji: '📚',
    name: '정신교육',
    days: 1,
    color: '#6D4C41',
    note: '정기 정신전력교육',
  },
  {
    emoji: '🛡️',
    name: '대테러 훈련',
    days: 1,
    color: '#546E7A',
    note: '테러 대비 훈련',
  },
];

export default function TodoScreen() {
  const today = getToday();

  const insets = useSafeAreaInsets();
  const [militaryInfo, setMilitaryInfo] = useState(undefined);
  const [todos,        setTodos]        = useState([]);
  const [filterDate,   setFilterDate]   = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [showPresets,  setShowPresets]  = useState(false); // 프리셋 패널 토글

  // 폼 상태
  const [formTitle,   setFormTitle]   = useState('');
  const [formDate,    setFormDate]    = useState(today);
  const [formEndDate, setFormEndDate] = useState('');
  const [formNote,    setFormNote]    = useState('');
  const [useRange,    setUseRange]    = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const mi = await loadMilitaryInfo();
    setMilitaryInfo(mi);
    if (!mi) return;
    setTodos(await loadTodos());
  };

  /* ─── 프리셋 선택 → 모달 열기 ─────────────────────────────── */
  const handlePreset = (preset) => {
    setFormTitle(preset.name);
    setFormNote(preset.note);
    setFormDate(today);
    if (preset.days > 1) {
      setUseRange(true);
      setFormEndDate(addDays(today, preset.days));
    } else {
      setUseRange(false);
      setFormEndDate('');
    }
    setShowPresets(false);
    setModalVisible(true);
  };

  /* ─── 할 일 추가 ─────────────────────────────────────────── */
  const handleAdd = async () => {
    if (!formTitle.trim()) { Alert.alert('오류', '할 일 내용을 입력해주세요.'); return; }
    const endDate = useRange && formEndDate && formEndDate > formDate ? formEndDate : '';
    if (useRange && formEndDate && formEndDate < formDate) {
      Alert.alert('오류', '종료일은 시작일보다 이후여야 합니다.');
      return;
    }
    setTodos(await addTodo({
      title: formTitle.trim(),
      date: formDate || today,
      endDate,
      note: formNote.trim(),
    }));
    closeModal();
  };

  const handleToggle = async (id) => setTodos(await toggleTodo(id));

  const handleDelete = (id, title) => {
    Alert.alert('삭제', `"${title}"을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => setTodos(await deleteTodo(id)) },
    ]);
  };

  const openModal = () => {
    setFormTitle('');
    setFormDate(today);
    setFormEndDate('');
    setFormNote('');
    setUseRange(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setFormTitle('');
    setFormDate(today);
    setFormEndDate('');
    setFormNote('');
    setUseRange(false);
  };

  /* ─── 필터링 & 그룹핑 ─────────────────────────────────────── */
  const filtered = todos.filter((t) => isInRange(t, filterDate));

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

  if (militaryInfo === undefined) return null;
  if (!militaryInfo) return <SetupRequired />;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>일정 관리</Text>

        {/* 요약 */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            {[
              { val: totalCount,             label: '전체',   color: COLORS.primary },
              { val: doneCount,              label: '완료',   color: COLORS.success },
              { val: totalCount - doneCount, label: '미완료', color: COLORS.accent },
            ].map((item) => (
              <View key={item.label} style={styles.summaryItem}>
                <Text style={[styles.summaryBig, { color: item.color }]}>{item.val}</Text>
                <Text style={styles.summarySub}>{item.label}</Text>
              </View>
            ))}
          </View>
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

        {/* ── 버튼 행 ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.addBtn} onPress={openModal}>
            <Text style={styles.addBtnText}>＋ 직접 추가</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.presetToggleBtn, showPresets && styles.presetToggleBtnOn]}
            onPress={() => setShowPresets((v) => !v)}
          >
            <Text style={[styles.presetToggleBtnText, showPresets && styles.presetToggleBtnTextOn]}>
              🎖 훈련 빠른 추가
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── 훈련 프리셋 패널 ── */}
        {showPresets && (
          <Card style={styles.presetCard}>
            <Text style={styles.presetCardTitle}>군 훈련 빠른 추가</Text>
            <Text style={styles.presetCardSub}>탭하면 날짜·기간이 자동 입력돼요</Text>
            <View style={styles.presetGrid}>
              {TRAINING_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.name}
                  style={[styles.presetChip, { borderColor: p.color }]}
                  onPress={() => handlePreset(p)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.presetChipTop, { backgroundColor: p.color }]}>
                    <Text style={styles.presetEmoji}>{p.emoji}</Text>
                    {p.days > 1 && (
                      <View style={styles.presetDaysBadge}>
                        <Text style={styles.presetDaysText}>{p.days}일</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.presetName} numberOfLines={2}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

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

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── 추가 모달 ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>할 일 추가</Text>

            <Text style={styles.formLabel}>할 일 내용 *</Text>
            <TextInput
              style={styles.formInput}
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder="예) 혹한기 훈련, 면회 신청..."
              placeholderTextColor={COLORS.textLight}
              autoFocus
            />

            <DatePickerField
              label={useRange ? '시작일' : '날짜'}
              value={formDate}
              onChange={(d) => {
                setFormDate(d);
                if (formEndDate && d > formEndDate) setFormEndDate('');
              }}
              placeholder="날짜 선택"
            />

            {/* 기간 설정 토글 */}
            <TouchableOpacity
              style={styles.rangeToggle}
              onPress={() => { setUseRange((v) => !v); if (useRange) setFormEndDate(''); }}
            >
              <View style={[styles.rangeCheckbox, useRange && styles.rangeCheckboxOn]}>
                {useRange && <Text style={styles.rangeCheckmark}>✓</Text>}
              </View>
              <Text style={styles.rangeToggleText}>기간 설정 (혹한기·훈련 등 여러 날)</Text>
            </TouchableOpacity>

            {useRange && (
              <DatePickerField
                label="종료일"
                value={formEndDate}
                onChange={setFormEndDate}
                minimumDate={formDate ? new Date(formDate) : undefined}
                placeholder="종료일 선택"
              />
            )}

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

/* ─── 할 일 아이템 ───────────────────────────────────────── */
function TodoItem({ item, onToggle, onDelete }) {
  const duration = calcDuration(item.date, item.endDate);

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
          {item.endDate && item.endDate !== item.date && (
            <View style={styles.durationRow}>
              <Text style={styles.durationIcon}>📆</Text>
              <Text style={styles.durationText}>
                {formatRange(item.date, item.endDate)}
                {duration ? `  (${duration}일)` : ''}
              </Text>
            </View>
          )}
          {!!item.note && <Text style={styles.todoNote} numberOfLines={1}>{item.note}</Text>}
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Card>
  );
}

/* ─── 스타일 ─────────────────────────────────────────────── */
const CHIP_W = '30%';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: COLORS.primary, marginBottom: 18 },

  summaryCard: { paddingVertical: 16 },
  summaryRow: { flexDirection: 'row', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 14 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryBig: { fontSize: 26, fontWeight: '800' },
  summarySub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterClearBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.background, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.primaryLight, marginBottom: 14,
  },
  filterClearText: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '600' },

  /* 버튼 행 */
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  addBtn: {
    flex: 1, backgroundColor: COLORS.primary,
    borderRadius: 12, paddingVertical: 15, alignItems: 'center',
  },
  addBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
  presetToggleBtn: {
    flex: 1, borderRadius: 12, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.card,
  },
  presetToggleBtnOn: { backgroundColor: COLORS.primary },
  presetToggleBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  presetToggleBtnTextOn: { color: COLORS.white },

  /* 훈련 프리셋 패널 */
  presetCard: { marginBottom: 14, paddingBottom: 16 },
  presetCardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 3 },
  presetCardSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 14 },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetChip: {
    width: CHIP_W,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  presetChipTop: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  presetEmoji: { fontSize: 26 },
  presetDaysBadge: {
    position: 'absolute',
    top: 4,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  presetDaysText: { fontSize: 10, color: '#FFF', fontWeight: '700' },
  presetName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingVertical: 7,
    lineHeight: 16,
  },

  /* 할 일 목록 */
  emptyCard: { alignItems: 'center', paddingVertical: 36 },
  emptyEmoji: { fontSize: 38, marginBottom: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
  dateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  dateHeaderText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  dateHeaderCount: { fontSize: 13, color: COLORS.textSecondary },
  todoCard: { paddingVertical: 14, paddingHorizontal: 14, marginBottom: 8 },
  todoCardDone: { opacity: 0.55, backgroundColor: COLORS.background },
  todoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: COLORS.white, fontSize: 14, fontWeight: '900' },
  todoContent: { flex: 1 },
  todoTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, lineHeight: 22 },
  todoTitleDone: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  durationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  durationIcon: { fontSize: 12 },
  durationText: { fontSize: 12, color: COLORS.primaryLight, fontWeight: '600' },
  todoNote: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  deleteBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 12, color: COLORS.danger, fontWeight: '800' },

  /* 모달 */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 19, fontWeight: '800', color: COLORS.text, marginBottom: 22, textAlign: 'center' },
  formLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 9 },
  formInput: {
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: COLORS.text, marginBottom: 14,
  },
  formTextarea: { height: 76, textAlignVertical: 'top' },
  rangeToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, paddingVertical: 4 },
  rangeCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  rangeCheckboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rangeCheckmark: { color: COLORS.white, fontSize: 12, fontWeight: '900' },
  rangeToggleText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalCancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  modalCancelBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 16 },
  modalSaveBtn: { flex: 2, paddingVertical: 15, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  modalSaveBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
