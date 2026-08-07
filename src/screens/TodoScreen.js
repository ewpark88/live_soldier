import React, { useState, useCallback, useMemo } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, FadeOutRight, LinearTransition, ZoomIn,
  useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import RangeCalendar from '../components/RangeCalendar';
import DatePickerField from '../components/DatePickerField';
import SetupRequired from '../components/SetupRequired';
import AdInterstitial from '../components/AdInterstitial';
import {
  Screen, AppHeader, Section, Grid, Button, Chip, StatTile,
  Divider, EmptyState, Txt, BottomSheet, PressScale,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { TRAINING_PRESETS } from '../constants/trainingPresets';
import {
  loadTodos, addTodo, toggleTodo, deleteTodo, loadMilitaryInfo,
} from '../utils/storage';
import {
  formatDate, formatDateKo, endDateFromSpan, daysBetweenInclusive,
} from '../utils/dateUtils';
import useShowInterstitial from '../hooks/useShowInterstitial';
import { useMotion } from '../hooks/useMotion';
import { haptic } from '../utils/haptics';
import { refreshScheduledNotifications } from '../utils/notifications';
import { motion, radius as r, space as sp, type as ty } from '../theme/tokens';

function getToday() {
  return formatDate(new Date());
}

/** 시작~종료 포함 일수 (단일이면 1) */
function calcDuration(startDate, endDate) {
  if (!endDate || endDate === startDate) return 1;
  return daysBetweenInclusive(startDate, endDate);
}

/** 필터 날짜가 일정 기간에 포함되는지 */
function isInRange(t, filterDate) {
  if (!filterDate) return true;
  const start = t.date;
  const end = t.endDate || t.date;
  return filterDate >= start && filterDate <= end;
}

/* ─── 할 일 한 줄 ─────────────────────────────────────────── */
function TodoItem({ item, onToggle, onDelete, last }) {
  const tc = useThemeColors();
  const m = useMotion();
  const s = useMemo(() => makeItemStyles(tc), [tc]);

  const duration = calcDuration(item.date, item.endDate);
  const pop = useSharedValue(1);

  const handleToggle = () => {
    if (!m.reduced) {
      pop.value = withSequence(
        withTiming(0.8, { duration: 90 }),
        withSpring(1, m.spring('pop'))
      );
    }
    // 완료는 묵직하게, 해제는 가볍게 — 촉감으로 방향을 구분한다
    if (item.done) haptic.light();
    else haptic.medium();
    onToggle();
  };

  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <Animated.View
      entering={m.enter(FadeInDown, 0, motion.duration.base)}
      exiting={m.exit(FadeOutRight)}
      layout={m.layout(LinearTransition.springify().damping(20).stiffness(200))}
    >
      <View style={s.row}>
        <PressScale onPress={handleToggle} haptic={null} style={s.checkTap}>
          <Animated.View style={[s.checkbox, item.done && s.checkboxDone, boxStyle]}>
            {item.done ? <Ionicons name="checkmark" size={16} color={tc.onPrimary} /> : null}
          </Animated.View>
        </PressScale>

        <PressScale onPress={handleToggle} haptic={null} style={s.body}>
          <Txt
            role="bodyLg"
            style={[
              { fontWeight: '700' },
              item.done && { color: tc.textLight, textDecorationLine: 'line-through' },
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Txt>

          <View style={s.metaRow}>
            {duration > 1 ? (
              <Txt role="caption" tone="primary">
                {formatDateKo(item.date)} ~ {formatDateKo(item.endDate)} · {duration}일
              </Txt>
            ) : null}
            {item.note ? (
              <Txt role="caption" tone="secondary" numberOfLines={1}>
                {item.note}
              </Txt>
            ) : null}
          </View>
        </PressScale>

        <PressScale
          onPress={() => onDelete(item.id, item.title)}
          haptic="light"
          style={s.trash}
          accessibilityLabel="삭제"
        >
          <Ionicons name="trash-outline" size={17} color={tc.textLight} />
        </PressScale>
      </View>

      {!last ? <Divider inset={40} /> : null}
    </Animated.View>
  );
}

/**
 * 일정 관리. embedded 설명은 LeaveScreen 헤더 주석 참고.
 */
export default function TodoScreen({ navigation, embedded = false }) {
  const tc = useThemeColors();
  const m = useMotion();
  const s = useMemo(() => makeStyles(tc), [tc]);
  const today = getToday();

  const { adVisible, show: showAd, handleClose: closeAd } = useShowInterstitial();

  const [militaryInfo, setMilitaryInfo] = useState(undefined);
  const [todos, setTodos] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [sheet, setSheet] = useState(null); // 'add' | 'presets' | null

  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(today);
  const [formEndDate, setFormEndDate] = useState('');
  const [formNote, setFormNote] = useState('');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const mi = await loadMilitaryInfo();
    setMilitaryInfo(mi);
    if (!mi) return;
    setTodos(await loadTodos());
  };

  const handlePreset = (preset) => {
    setFormTitle(preset.name);
    setFormNote(preset.note);
    setFormDate(today);
    setFormEndDate(preset.days > 1 ? endDateFromSpan(today, preset.days) : '');
    setSheet('add');
  };

  const handleAdd = async () => {
    if (!formTitle.trim()) { haptic.warning(); Alert.alert('오류', '할 일 내용을 입력해주세요.'); return; }
    if (!formDate) { haptic.warning(); Alert.alert('오류', '날짜를 선택해주세요.'); return; }
    const endDate = formEndDate && formEndDate > formDate ? formEndDate : '';
    setTodos(await addTodo({
      title: formTitle.trim(),
      date: formDate,
      endDate,
      note: formNote.trim(),
    }));
    haptic.success();
    refreshScheduledNotifications().catch(() => {});
    closeSheet();
    showAd();
  };

  const handleToggle = async (id) => {
    setTodos(await toggleTodo(id));
    refreshScheduledNotifications().catch(() => {});
  };

  const handleDelete = (id, title) => {
    Alert.alert('삭제', `"${title}"을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setTodos(await deleteTodo(id));
          refreshScheduledNotifications().catch(() => {});
        },
      },
    ]);
  };

  const openAdd = () => {
    setFormTitle('');
    setFormDate(today);
    setFormEndDate('');
    setFormNote('');
    setSheet('add');
  };

  const closeSheet = () => {
    setSheet(null);
    setFormTitle('');
    setFormDate(today);
    setFormEndDate('');
    setFormNote('');
  };

  const filtered = todos.filter((t) => isInRange(t, filterDate));

  const grouped = filtered.reduce((acc, t) => {
    const key = t.date || today;
    (acc[key] = acc[key] || []).push(t);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === today) return -1;
    if (b === today) return 1;
    return a < b ? -1 : 1;
  });

  const totalCount = todos.length;
  const doneCount = todos.filter((t) => t.done).length;

  if (militaryInfo === undefined) return <Screen scroll={false} />;
  if (!militaryInfo) return <SetupRequired />;

  return (
    <>
      <Screen
        ad={AD_UNITS.TODO_BOTTOM}
        contentContainerStyle={{ paddingBottom: 96, ...(embedded ? { paddingTop: sp.xs } : null) }}
        header={
          embedded ? undefined : (
            <AppHeader
              title="일정 관리"
              right={
                <Chip
                  label="훈련 추가"
                  icon="flash"
                  size="sm"
                  onPress={() => setSheet('presets')}
                />
              }
            />
          )
        }
      >
        {/* 헤더가 없는 임베드 모드에선 훈련 추가 버튼이 갈 곳이 없다 */}
        {embedded ? (
          <View style={{ alignItems: 'flex-end', marginBottom: sp.sm }}>
            <Chip label="훈련 추가" icon="flash" size="sm" onPress={() => setSheet('presets')} />
          </View>
        ) : null}
        {/* 요약 + 날짜 필터 */}
        <Section index={0}>
          <Card>
            <View style={s.statRow}>
              <StatTile label="전체" value={totalCount} tone="primary" countUp />
              <StatTile label="완료" value={doneCount} tone="success" countUp />
              <StatTile label="미완료" value={totalCount - doneCount} tone="accent" countUp />
            </View>

            {/* DatePickerField 가 더 이상 자체 마진을 갖지 않아서
                예전의 marginBottom:14 정렬 핵 없이 그냥 나란히 놓인다. */}
            <View style={s.filterRow}>
              <View style={{ flex: 1 }}>
                <DatePickerField
                  value={filterDate}
                  onChange={setFilterDate}
                  placeholder="날짜로 일정 찾기"
                />
              </View>
              {filterDate ? (
                <Button
                  title="전체"
                  variant="ghost"
                  size="md"
                  onPress={() => { setFilterDate(''); haptic.select(); }}
                />
              ) : null}
            </View>
          </Card>
        </Section>

        {/* 날짜별 그룹 — 그룹 하나당 카드 하나, 안에서 헤어라인으로 나눈다 */}
        {sortedDates.length === 0 ? (
          <Section index={1}>
            <Card>
              <EmptyState
                icon="calendar-outline"
                title={filterDate ? '이 날짜엔 일정이 없어요' : '아직 등록된 일정이 없어요'}
                desc={
                  filterDate
                    ? '다른 날짜를 보거나 필터를 해제해보세요.'
                    : '훈련 일정이나 할 일을 등록해두면 알림으로 미리 알려드려요.'
                }
                action={{ label: '일정 추가', icon: 'add', onPress: openAdd }}
                compact
              />
            </Card>
          </Section>
        ) : (
          sortedDates.map((date, idx) => {
            const items = grouped[date];
            const done = items.filter((t) => t.done).length;
            return (
              <Section key={date} index={idx + 1}>
                <Card>
                  <SectionTitle
                    icon={date === today ? 'today-outline' : 'calendar-outline'}
                    tone={date === today ? 'accent' : 'primary'}
                    right={
                      <Txt role="caption" tone="secondary">
                        {done}/{items.length} 완료
                      </Txt>
                    }
                  >
                    {date === today ? `오늘 · ${formatDateKo(date)}` : formatDateKo(date)}
                  </SectionTitle>

                  <View style={{ marginTop: sp.xs }}>
                    {items.map((item, i) => (
                      <TodoItem
                        key={item.id}
                        item={item}
                        onToggle={() => handleToggle(item.id)}
                        onDelete={handleDelete}
                        last={i === items.length - 1}
                      />
                    ))}
                  </View>
                </Card>
              </Section>
            );
          })
        )}
      </Screen>

      {/* FAB — 광고 푸터 위에 뜬다 (탭바는 푸터 아래라 여기서 셈하지 않는다) */}
      <Animated.View
        entering={m.enter(ZoomIn, 0, motion.duration.slow)}
        style={s.fabWrap}
        pointerEvents="box-none"
      >
        <PressScale onPress={openAdd} haptic="medium" style={s.fab} accessibilityLabel="일정 추가">
          <Ionicons name="add" size={28} color={tc.onPrimary} />
        </PressScale>
      </Animated.View>

      <AdInterstitial visible={adVisible} onClose={closeAd} />

      {/* 훈련 프리셋 시트 — 예전엔 화면 중간에서 펼쳐지며 아래 목록을 통째로
          밀어냈다. 시트로 빼면 레이아웃 이동이 0이 된다. */}
      <BottomSheet visible={sheet === 'presets'} onClose={closeSheet}>
        <Txt role="subtitle" style={{ marginBottom: sp.xs }}>훈련 빠른 추가</Txt>
        <Txt role="caption" tone="secondary" style={{ marginBottom: sp.lg }}>
          누르면 오늘 날짜로 기간이 자동 지정돼요
        </Txt>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Grid columns={3} gap={sp.sm}>
            {TRAINING_PRESETS.map((p) => (
              <PressScale
                key={p.name}
                onPress={() => handlePreset(p)}
                haptic="select"
                style={s.preset}
              >
                <View style={[s.presetIcon, { backgroundColor: `${p.color}22` }]}>
                  <Ionicons name={p.icon} size={20} color={p.color} />
                </View>
                <Txt role="caption" style={{ textAlign: 'center' }} numberOfLines={2}>
                  {p.name}
                </Txt>
                <Chip label={`${p.days}일`} size="sm" />
              </PressScale>
            ))}
          </Grid>
        </ScrollView>
      </BottomSheet>

      {/* 추가 시트 */}
      <BottomSheet visible={sheet === 'add'} onClose={closeSheet}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Txt role="subtitle" style={{ marginBottom: sp.lg }}>일정 추가</Txt>

            <Txt role="label" tone="secondary" style={s.formLabel}>할 일 내용 *</Txt>
            <TextInput
              style={s.input}
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder="예) 혹한기 훈련, 면회 신청..."
              placeholderTextColor={tc.textLight}
            />

            <Txt role="label" tone="secondary" style={s.formLabel}>날짜 · 기간</Txt>
            <View style={s.calendarBox}>
              <RangeCalendar
                startDate={formDate}
                endDate={formEndDate}
                onChange={(start, end) => { setFormDate(start); setFormEndDate(end); }}
              />
            </View>

            <Txt role="label" tone="secondary" style={s.formLabel}>메모 (선택)</Txt>
            <TextInput
              style={[s.input, s.textarea]}
              value={formNote}
              onChangeText={setFormNote}
              placeholder="추가 메모..."
              placeholderTextColor={tc.textLight}
              multiline
              numberOfLines={2}
            />

            <View style={s.sheetBtns}>
              <Button title="취소" variant="ghost" onPress={closeSheet} style={{ flex: 1 }} />
              <Button title="추가" onPress={handleAdd} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>
    </>
  );
}

const makeItemStyles = (tc) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: sp.md, paddingVertical: sp.md },
    checkTap: { padding: sp.xxs },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: r.xs,
      borderWidth: 2,
      borderColor: tc.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxDone: { backgroundColor: tc.primary, borderColor: tc.primary },
    body: { flex: 1, gap: 2 },
    metaRow: { gap: 1 },
    trash: { padding: sp.xs },
  });

const makeStyles = (tc) =>
  StyleSheet.create({
    statRow: { flexDirection: 'row', gap: sp.sm },
    filterRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: sp.lg },

    fabWrap: { position: 'absolute', right: sp.lg, bottom: 96 },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: tc.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: tc.shadowStrong,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 8,
    },

    preset: {
      alignItems: 'center',
      gap: sp.xs + 2,
      paddingVertical: sp.md,
      paddingHorizontal: sp.xs,
      borderRadius: r.md,
      backgroundColor: tc.surfaceSunken,
    },
    presetIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
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
    textarea: { minHeight: 64, textAlignVertical: 'top' },
    calendarBox: { backgroundColor: tc.surfaceSunken, borderRadius: r.md, padding: sp.sm },
    sheetBtns: { flexDirection: 'row', gap: sp.sm, marginTop: sp.xl },
  });
