import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  Alert, ScrollView, StyleSheet, View,
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
import {
  Screen, AppHeader, Section, Grid, Button, Chip, StatTile,
  Divider, EmptyState, Txt, BottomSheet, PressScale,
  Checkbox, TextField, FormSheet,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { TRAINING_PRESETS, presetTone } from '../constants/trainingPresets';
import {
  loadTodos, addTodo, toggleTodo, deleteTodo, loadMilitaryInfo,
} from '../utils/storage';
import {
  formatDateKo, endDateFromSpan, daysBetweenInclusive,
} from '../utils/dateUtils';
import useToday from '../hooks/useToday';
import useShowInterstitial from '../hooks/useShowInterstitial';
import { useMotion } from '../hooks/useMotion';
import { haptic } from '../utils/haptics';
import { guardSave, guardDelete, SAVE_FAILED } from '../utils/saveGuard';
import { refreshScheduledNotifications } from '../utils/notifications';
import { motion, radius as r, space as sp, type as ty } from '../theme/tokens';

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
        {/* 홈의 '오늘 할 일'과 같은 체크박스 (예전엔 여기는 네모, 홈은 원이었다) */}
        <Animated.View style={boxStyle}>
          <Checkbox
            checked={!!item.done}
            onPress={handleToggle}
            haptic={null}
            label={`${item.title} ${item.done ? '완료 해제' : '완료'}`}
          />
        </Animated.View>

        <PressScale onPress={handleToggle} haptic={null} style={s.body} accessibilityRole="checkbox" accessibilityState={{ checked: !!item.done }}>
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
          accessibilityRole="button"
          accessibilityLabel={`${item.title} 삭제`}
        >
          <Ionicons name="trash-outline" size={18} color={tc.textLight} />
        </PressScale>
      </View>

      {!last ? <Divider inset={44} /> : null}
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
  // 캘린더 탭은 언마운트되지 않는다 — 자정을 넘기면 '오늘' 그룹도 넘어가야 한다
  const today = useToday();

  const [militaryInfo, setMilitaryInfo] = useState(undefined);
  const [todos, setTodos] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [sheet, setSheet] = useState(null); // 'add' | 'presets' | null
  // 추가 시트가 열려 있을 때만 전면광고를 프리로드한다 (프리셋 시트도 곧 'add' 로 이어진다)
  const { show: showAd } = useShowInterstitial(sheet !== null);

  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(today);
  const [formEndDate, setFormEndDate] = useState('');
  const [formNote, setFormNote] = useState('');
  // 연타 차단 — 예전엔 '추가'를 두 번 누르면 같은 일정·알림이 두 개 생겼다
  // (휴가·급여 저장과 같은 방식: ref 는 같은 프레임의 두 번째 탭, state 는 로딩 표시)
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

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
    if (savingRef.current) return;
    if (!formTitle.trim()) { haptic.warning(); Alert.alert('오류', '할 일 내용을 입력해주세요.'); return; }
    if (!formDate) { haptic.warning(); Alert.alert('오류', '날짜를 선택해주세요.'); return; }
    const endDate = formEndDate && formEndDate > formDate ? formEndDate : '';
    savingRef.current = true;
    setSaving(true);
    let next;
    try {
      next = await guardSave(() => addTodo({
        title: formTitle.trim(),
        date: formDate,
        endDate,
        note: formNote.trim(),
      }));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    if (next === SAVE_FAILED) return;   // 시트를 닫지 않는다 — 입력을 날리지 않기 위해
    setTodos(next);
    haptic.success();
    refreshScheduledNotifications().catch(() => {});
    closeSheet();
    showAd();
  };

  const handleToggle = async (id) => {
    const next = await guardSave(() => toggleTodo(id));
    if (next === SAVE_FAILED) return;
    setTodos(next);
    refreshScheduledNotifications().catch(() => {});
  };

  const handleDelete = (id, title) => {
    Alert.alert('삭제', `"${title}"을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const next = await guardDelete(() => deleteTodo(id));
          if (next === SAVE_FAILED) return;
          setTodos(next);
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
    if (savingRef.current) return;
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
        /* 임베디드면 광고는 CalendarScreen 이 세그먼트 밖에 하나만 그린다 */
        ad={embedded ? undefined : AD_UNITS.TODO_BOTTOM}
        /* 마지막 카드가 FAB 에 가리지 않도록 FAB 높이 + 여백만큼 비운다 */
        contentContainerStyle={{ paddingBottom: FAB_SIZE + FAB_GAP * 2, ...(embedded ? { paddingTop: sp.xs } : null) }}
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
        {/* 요약 + 날짜 필터
            임베드 모드엔 헤더가 없어 '훈련 추가'가 갈 곳이 없었다 — 예전엔 카드 위에
            자기 마진을 가진 칩이 떠 있었다(세로 간격 규칙 위반). 카드 제목 줄로 옮긴다. */}
        <Section index={0}>
          <Card>
            {embedded ? (
              <SectionTitle
                icon="checkbox-outline"
                right={<Chip label="훈련 추가" icon="flash" size="sm" onPress={() => setSheet('presets')} />}
                style={s.summaryTitle}
              >
                일정 요약
              </SectionTitle>
            ) : null}
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

      {/* FAB — 광고 푸터 위에 뜬다 (탭바는 푸터 아래라 여기서 셈하지 않는다).
          임베디드면 푸터가 부모(CalendarScreen) 쪽이라 이 영역 밖에 있다 → 푸터
          높이(~76)를 뺀 만큼만 띄운다. */}
      <Animated.View
        entering={m.enter(ZoomIn, 0, motion.duration.slow)}
        style={[s.fabWrap, { bottom: embedded ? FAB_GAP : FAB_BOTTOM }]}
        pointerEvents="box-none"
      >
        <PressScale onPress={openAdd} haptic="medium" style={s.fab} accessibilityLabel="일정 추가">
          <Ionicons name="add" size={28} color={tc.onPrimary} />
        </PressScale>
      </Animated.View>


      {/* 훈련 프리셋 시트 — 예전엔 화면 중간에서 펼쳐지며 아래 목록을 통째로
          밀어냈다. 시트로 빼면 레이아웃 이동이 0이 된다. */}
      <BottomSheet visible={sheet === 'presets'} onClose={closeSheet}>
        <Txt role="subtitle" style={{ marginBottom: sp.xs }}>훈련 빠른 추가</Txt>
        <Txt role="caption" tone="secondary" style={{ marginBottom: sp.lg }}>
          누르면 오늘 날짜로 기간이 자동 지정돼요
        </Txt>

        <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
          <Grid columns={3} gap={sp.sm}>
            {TRAINING_PRESETS.map((p) => (
              <PressScale
                key={p.name}
                onPress={() => handlePreset(p)}
                haptic="select"
                style={s.preset}
              >
                <View style={[s.presetIcon, { backgroundColor: presetTone(tc, p.tone).bg }]}>
                  <Ionicons name={p.icon} size={20} color={presetTone(tc, p.tone).fg} />
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
      <FormSheet
        visible={sheet === 'add'}
        onClose={closeSheet}
        title="일정 추가"
        submitLabel="추가"
        onSubmit={handleAdd}
        saving={saving}
      >
        <TextField
          label="할 일 내용 *"
          value={formTitle}
          onChangeText={setFormTitle}
          placeholder="예) 혹한기 훈련, 면회 신청..."
          maxLength={40}
        />

        <View style={{ gap: sp.sm }}>
          <Txt role="label" tone="secondary">날짜 · 기간</Txt>
          <View style={s.calendarBox}>
            <RangeCalendar
              startDate={formDate}
              endDate={formEndDate}
              onChange={(start, end) => { setFormDate(start); setFormEndDate(end); }}
            />
          </View>
        </View>

        <TextField
          label="메모 (선택)"
          value={formNote}
          onChangeText={setFormNote}
          placeholder="추가 메모..."
          multiline
          numberOfLines={2}
          maxLength={80}
        />
      </FormSheet>
    </>
  );
}

/* FAB 자리 — 독립 화면에선 광고 푸터(~76) 위로, 임베드면 부모가 푸터를 갖는다 */
const FAB_SIZE = 56;
const FAB_GAP = sp.xl;
const FAB_BOTTOM = 76 + FAB_GAP;

const makeItemStyles = (tc) =>
  StyleSheet.create({
    // 체크박스(44)·휴지통(40) 누름 영역이 행 높이를 정한다 — 세로 패딩은 최소로
    row: { flexDirection: 'row', alignItems: 'center', gap: sp.xs, paddingVertical: sp.xs },
    body: { flex: 1, gap: sp.xxs, paddingVertical: sp.sm },
    metaRow: { gap: 1 },
    trash: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  });

const makeStyles = (tc) =>
  StyleSheet.create({
    summaryTitle: { marginBottom: sp.md },
    statRow: { flexDirection: 'row', gap: sp.sm },
    filterRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginTop: sp.lg },

    fabWrap: { position: 'absolute', right: sp.lg },
    fab: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: r.pill,
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
      borderRadius: r.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },

    calendarBox: { backgroundColor: tc.surfaceSunken, borderRadius: r.md, padding: sp.sm },
  });
