import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeContext';
import { formatDate, formatDateKo, spanDates, daysBetweenInclusive } from '../utils/dateUtils';

/**
 * 휴가 + 일정 통합 월간 캘린더 (의존성 없는 경량 구현).
 * - 연가 사용: 시작~종료 구간 각 날짜를 채움(primary)
 * - 포상휴가: 부여일에 별(★)
 * - 일정(할 일): 해당 기간 각 날짜 하단에 점(accent)
 * 날짜를 탭하면 그 날의 휴가·일정 상세가 아래에 표시된다.
 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function EventCalendar({ records = [], bonusRecords = [], todos = [] }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  const today = useMemo(() => new Date(), []);
  const todayStr = formatDate(today);
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(todayStr);

  /* 날짜별 이벤트 집합/맵 */
  const { usedSet, bonusSet, todoSet } = useMemo(() => {
    const used = new Set();
    records.forEach((r) => spanDates(r.date, r.days).forEach((d) => used.add(d)));
    const bonus = new Set();
    bonusRecords.forEach((r) => { if (r.date) bonus.add(r.date); });
    const todo = new Set();
    todos.forEach((t) => {
      if (!t.date) return;
      const end = t.endDate && t.endDate > t.date ? t.endDate : t.date;
      const n = daysBetweenInclusive(t.date, end) || 1;
      spanDates(t.date, n).forEach((d) => todo.add(d));
    });
    return { usedSet: used, bonusSet: bonus, todoSet: todo };
  }, [records, bonusRecords, todos]);

  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      arr.push({ day, dateStr: `${year}-${mm}-${dd}` });
    }
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const goPrev = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(todayStr); };

  /* 선택일 상세 이벤트 */
  const selectedEvents = useMemo(() => {
    if (!selected) return [];
    const out = [];
    records.forEach((r) => {
      if (spanDates(r.date, r.days).includes(selected)) {
        out.push({ type: 'leave', label: `연가 ${r.days}일`, memo: r.memo, icon: 'airplane-outline', color: tc.primary });
      }
    });
    bonusRecords.forEach((r) => {
      if (r.date === selected) {
        out.push({ type: 'bonus', label: `포상휴가 ＋${r.days}일`, memo: r.memo, icon: 'star', color: tc.accent });
      }
    });
    todos.forEach((t) => {
      if (!t.date) return;
      const end = t.endDate && t.endDate > t.date ? t.endDate : t.date;
      const n = daysBetweenInclusive(t.date, end) || 1;
      if (spanDates(t.date, n).includes(selected)) {
        out.push({ type: 'todo', label: t.title, memo: t.note, done: t.done, icon: t.done ? 'checkmark-circle' : 'ellipse-outline', color: tc.primaryLight });
      }
    });
    return out;
  }, [selected, records, bonusRecords, todos, tc]);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const usedThisMonth = [...usedSet].filter((d) => d.startsWith(monthPrefix)).length;

  return (
    <View style={s.wrap}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity onPress={goPrev} hitSlop={HIT}><Text style={s.navArrow}>‹</Text></TouchableOpacity>
        <TouchableOpacity onPress={goToday} activeOpacity={0.7}>
          <Text style={s.headerTitle}>{year}년 {month + 1}월</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} hitSlop={HIT}><Text style={s.navArrow}>›</Text></TouchableOpacity>
      </View>

      {/* 요일 */}
      <View style={s.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={w} style={[s.weekday, i === 0 && s.sun, i === 6 && s.sat]}>{w}</Text>
        ))}
      </View>

      {/* 날짜 그리드 */}
      <View style={s.grid}>
        {cells.map((cell, idx) => {
          if (!cell) return <View key={idx} style={s.cell} />;
          const isUsed  = usedSet.has(cell.dateStr);
          const isBonus = bonusSet.has(cell.dateStr);
          const isTodo  = todoSet.has(cell.dateStr);
          const isToday = cell.dateStr === todayStr;
          const isSel   = cell.dateStr === selected;
          const dow = idx % 7;
          return (
            <TouchableOpacity key={idx} style={s.cell} activeOpacity={0.7} onPress={() => setSelected(cell.dateStr)}>
              <View style={[
                s.dayBox,
                isUsed && s.dayUsed,
                isSel && !isUsed && s.daySel,
                isToday && !isSel && s.dayToday,
              ]}>
                <Text style={[
                  s.dayText,
                  dow === 0 && s.sun,
                  dow === 6 && s.sat,
                  isUsed && s.dayTextUsed,
                  isSel && !isUsed && s.dayTextSel,
                ]}>
                  {cell.day}
                </Text>
                {isBonus && <Text style={s.bonusStar}>★</Text>}
              </View>
              {isTodo && <View style={[s.todoDot, { backgroundColor: isUsed ? tc.white : tc.accent }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 범례 */}
      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: tc.primary }]} />
          <Text style={s.legendText}>연가 {usedThisMonth > 0 ? `(${usedThisMonth}일)` : ''}</Text>
        </View>
        <View style={s.legendItem}>
          <Text style={[s.legendStar, { color: tc.accent }]}>★</Text>
          <Text style={s.legendText}>포상</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: tc.accent, width: 7, height: 7, borderRadius: 4 }]} />
          <Text style={s.legendText}>일정</Text>
        </View>
      </View>

      {/* 선택일 상세 */}
      <View style={s.detail}>
        <Text style={s.detailDate}>{formatDateKo(selected)}</Text>
        {selectedEvents.length === 0 ? (
          <Text style={s.detailEmpty}>이 날은 등록된 휴가·일정이 없어요.</Text>
        ) : (
          selectedEvents.map((e, i) => (
            <View key={i} style={s.eventRow}>
              <Ionicons name={e.icon} size={16} color={e.color} />
              <Text style={[s.eventLabel, e.done && s.eventDone]} numberOfLines={1}>{e.label}</Text>
              {!!e.memo && <Text style={s.eventMemo} numberOfLines={1}>· {e.memo}</Text>}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

const makeStyles = (tc) => StyleSheet.create({
  wrap: { paddingVertical: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 10 },
  navArrow: { fontSize: 28, color: tc.primary, fontWeight: '700', paddingHorizontal: 12 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: tc.text },

  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: tc.textSecondary },
  sun: { color: '#E53935' },
  sat: { color: '#1E88E5' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 1 },
  dayBox: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayUsed: { backgroundColor: tc.primary },
  daySel: { backgroundColor: tc.highlightBg, borderWidth: 1.5, borderColor: tc.primary },
  dayToday: { borderWidth: 1.5, borderColor: tc.accent },
  dayText: { fontSize: 14, color: tc.text, fontWeight: '600' },
  dayTextUsed: { color: tc.white, fontWeight: '800' },
  dayTextSel: { color: tc.primary, fontWeight: '800' },
  bonusStar: { position: 'absolute', top: -2, right: -1, fontSize: 11, color: tc.accent },
  todoDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: tc.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendStar: { fontSize: 14 },
  legendText: { fontSize: 12, color: tc.textSecondary, fontWeight: '600' },

  detail: { marginTop: 12, backgroundColor: tc.background, borderRadius: 12, padding: 14 },
  detailDate: { fontSize: 14, fontWeight: '800', color: tc.text, marginBottom: 8 },
  detailEmpty: { fontSize: 13, color: tc.textSecondary },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5 },
  eventLabel: { fontSize: 14, fontWeight: '600', color: tc.text, flexShrink: 1 },
  eventDone: { textDecorationLine: 'line-through', color: tc.textSecondary },
  eventMemo: { fontSize: 12.5, color: tc.textSecondary, flexShrink: 1 },
});
