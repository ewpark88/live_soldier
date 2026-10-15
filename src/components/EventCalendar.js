import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PressScale from './ui/PressScale';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../theme/tokens';
import { formatDateKo, parseDate, spanDates, daysBetweenInclusive } from '../utils/dateUtils';
import useToday from '../hooks/useToday';

/**
 * 휴가 + 일정 통합 월간 캘린더 (의존성 없는 경량 구현).
 * - 연가 사용: 시작~종료 구간 각 날짜를 채움(primary)
 * - 포상휴가: 부여일 우상단에 별 아이콘
 * - 일정(할 일): 해당 기간 각 날짜 하단에 점
 * 날짜를 탭하면 그 날의 휴가·일정 상세가 아래에 표시된다.
 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function EventCalendar({ records = [], bonusRecords = [], todos = [], fill = false }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  // 캘린더 탭은 언마운트되지 않는다 — 자정을 넘기면 '오늘'도 넘어가야 한다
  const todayStr = useToday();
  const today = parseDate(todayStr);
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(todayStr);

  // 날짜가 바뀌었을 때, 사용자가 '어제(=당시 오늘)'를 보고 있었다면 오늘로 따라간다
  const prevToday = useRef(todayStr);
  useEffect(() => {
    if (prevToday.current === todayStr) return;
    setSelected((sel) => (sel === prevToday.current ? todayStr : sel));
    prevToday.current = todayStr;
  }, [todayStr]);

  /* 날짜별 이벤트 집합/맵 */
  const { usedSet, bonusSet, todoSet } = useMemo(() => {
    const used = new Set();
    records.forEach((rec) => spanDates(rec.date, rec.days).forEach((d) => used.add(d)));
    const bonus = new Set();
    bonusRecords.forEach((rec) => { if (rec.date) bonus.add(rec.date); });
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

  // 주 단위로 잘라 행으로 만든다 — fill 모드에서 각 행이 flex 로 세로를 채운다.
  const rows = useMemo(() => {
    const out = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [cells]);

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
    records.forEach((rec) => {
      if (spanDates(rec.date, rec.days).includes(selected)) {
        out.push({ type: 'leave', label: `연가 ${rec.days}일`, memo: rec.memo, icon: 'airplane-outline', color: tc.primary });
      }
    });
    bonusRecords.forEach((rec) => {
      if (rec.date === selected) {
        out.push({ type: 'bonus', label: `포상휴가 +${rec.days}일`, memo: rec.memo, icon: 'star', color: tc.accentText });
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
    <View style={[s.wrap, fill && s.wrapFill]}>
      {/* 헤더 */}
      <View style={s.header}>
        <PressScale onPress={goPrev} haptic="select" scale={0.88} style={s.navBtn} accessibilityRole="button" accessibilityLabel="이전 달">
          <Ionicons name="chevron-back" size={22} color={tc.primary} />
        </PressScale>
        <PressScale onPress={goToday} haptic="select" style={s.titleBtn} accessibilityRole="button" accessibilityLabel={`${year}년 ${month + 1}월, 오늘로 이동`}>
          <Text style={s.headerTitle} maxFontSizeMultiplier={1.3}>{year}년 {month + 1}월</Text>
        </PressScale>
        <PressScale onPress={goNext} haptic="select" scale={0.88} style={s.navBtn} accessibilityRole="button" accessibilityLabel="다음 달">
          <Ionicons name="chevron-forward" size={22} color={tc.primary} />
        </PressScale>
      </View>

      {/* 요일 */}
      <View style={s.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={w} style={[s.weekday, i === 0 && s.sun, i === 6 && s.sat]} maxFontSizeMultiplier={1.2}>{w}</Text>
        ))}
      </View>

      {/* 날짜 그리드 — 주 단위 행. fill 모드에서 각 행이 세로 공간을 균등 분배 */}
      <View style={[s.grid, fill && s.gridFill]}>
        {rows.map((row, ri) => (
          <View key={ri} style={[s.weekLine, fill && s.weekLineFill]}>
            {row.map((cell, ci) => {
              if (!cell) return <View key={ci} style={s.cell} />;
              const isUsed  = usedSet.has(cell.dateStr);
              const isBonus = bonusSet.has(cell.dateStr);
              const isTodo  = todoSet.has(cell.dateStr);
              const isToday = cell.dateStr === todayStr;
              const isSel   = cell.dateStr === selected;
              const a11y = [
                `${month + 1}월 ${cell.day}일`,
                isToday && '오늘',
                isUsed && '연가',
                isBonus && '포상휴가',
                isTodo && '일정 있음',
              ].filter(Boolean).join(', ');
              return (
                <PressScale
                  key={ci}
                  style={s.cell}
                  haptic="select"
                  onPress={() => setSelected(cell.dateStr)}
                  accessibilityRole="button"
                  accessibilityLabel={a11y}
                  accessibilityState={{ selected: isSel }}
                >
                  <View style={[
                    s.dayBox,
                    isUsed && s.dayUsed,
                    isSel && !isUsed && s.daySel,
                    isToday && !isSel && s.dayToday,
                  ]}>
                    <Text
                      style={[
                        s.dayText,
                        ci === 0 && s.sun,
                        ci === 6 && s.sat,
                        isUsed && s.dayTextUsed,
                        isSel && !isUsed && s.dayTextSel,
                      ]}
                      maxFontSizeMultiplier={1.2}
                    >
                      {cell.day}
                    </Text>
                    {isBonus ? (
                      <View style={s.bonusStar}>
                        <Ionicons name="star" size={11} color={tc.accentText} />
                      </View>
                    ) : null}
                  </View>
                  <View style={[s.todoDot, isTodo && { backgroundColor: isUsed ? tc.primary : tc.accent }]} />
                </PressScale>
              );
            })}
          </View>
        ))}
      </View>

      {/* 범례 */}
      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: tc.primary }]} />
          <Text style={s.legendText}>연가{usedThisMonth > 0 ? ` (${usedThisMonth}일)` : ''}</Text>
        </View>
        <View style={s.legendItem}>
          <Ionicons name="star" size={13} color={tc.accentText} />
          <Text style={s.legendText}>포상</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDotSm, { backgroundColor: tc.accent }]} />
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

const DAY = 36;

const makeStyles = (tc) => StyleSheet.create({
  wrap: { paddingVertical: sp.xs },
  wrapFill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp.sm },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleBtn: { minHeight: 44, paddingHorizontal: sp.md, justifyContent: 'center' },
  headerTitle: { ...ty.section, color: tc.text },

  weekRow: { flexDirection: 'row', marginBottom: sp.xs },
  weekday: { flex: 1, textAlign: 'center', ...ty.caption, fontWeight: '700', color: tc.textSecondary },
  sun: { color: tc.sun },
  sat: { color: tc.sat },

  grid: {},
  gridFill: { flex: 1 },
  weekLine: { flexDirection: 'row' },
  weekLineFill: { flex: 1, minHeight: 44 },
  // 셀 자체는 44 — 보이는 원(36)보다 누르는 면적이 크다
  cell: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: sp.xxs },
  dayBox: { width: DAY, height: DAY, borderRadius: DAY / 2, alignItems: 'center', justifyContent: 'center' },
  dayUsed: { backgroundColor: tc.primary },
  daySel: { backgroundColor: tc.highlightBg, borderWidth: 1.5, borderColor: tc.primary },
  dayToday: { borderWidth: 1.5, borderColor: tc.accentText },
  dayText: { ...ty.bodySm, fontWeight: '600', color: tc.text },
  // tc.white 가 아니라 onPrimary — 다크 테마의 primary 는 밝은 민트/블루라
  // 그 위에 흰 글자를 얹으면 읽히지 않는다 (대비 검증이 보는 페어도 이쪽이다)
  dayTextUsed: { color: tc.onPrimary, fontWeight: '800' },
  dayTextSel: { color: tc.primary, fontWeight: '800' },
  bonusStar: { position: 'absolute', top: -3, right: -3 },
  // 점은 항상 자리를 차지한다 — 일정 유무에 따라 행 높이가 흔들리지 않게
  todoDot: { width: 5, height: 5, borderRadius: r.pill, marginTop: sp.xxs, backgroundColor: 'transparent' },

  legendRow: {
    flexDirection: 'row', justifyContent: 'center', gap: sp.lg,
    marginTop: sp.md, paddingTop: sp.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: sp.xs },
  legendDot: { width: 12, height: 12, borderRadius: r.pill },
  legendDotSm: { width: 7, height: 7, borderRadius: r.pill },
  legendText: { ...ty.caption, color: tc.textSecondary },

  detail: { marginTop: sp.md, backgroundColor: tc.surfaceSunken, borderRadius: r.md, padding: sp.md },
  detailDate: { ...ty.bodySm, fontWeight: '800', color: tc.text, marginBottom: sp.sm },
  detailEmpty: { ...ty.label, fontWeight: '500', color: tc.textSecondary },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, paddingVertical: sp.xs },
  eventLabel: { ...ty.bodySm, fontWeight: '600', color: tc.text, flexShrink: 1 },
  eventDone: { textDecorationLine: 'line-through', color: tc.textSecondary },
  eventMemo: { ...ty.caption, fontWeight: '500', color: tc.textSecondary, flexShrink: 1 },
});
