import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { formatDate } from '../utils/dateUtils';

/**
 * 의존성 없는 경량 월간 휴가 캘린더.
 * - 연가 사용 기록: 시작일~(시작일+일수-1) 구간의 각 날짜를 채움
 * - 포상휴가: 부여일에 별(★) 마커
 */

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/* 'YYYY-MM-DD' 시작일에서 days일 만큼의 날짜 문자열 배열 */
function spanDates(startStr, days) {
  const out = [];
  const d = new Date(startStr);
  if (isNaN(d.getTime())) return out;
  const n = Math.max(1, days || 1);
  for (let i = 0; i < n; i++) {
    out.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export default function LeaveCalendar({ records = [], bonusRecords = [] }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  const today = useMemo(() => new Date(), []);
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0~11

  /* 사용일(연가) 집합, 포상 부여일 집합 */
  const { usedSet, bonusSet } = useMemo(() => {
    const used = new Set();
    records.forEach((r) => spanDates(r.date, r.days).forEach((d) => used.add(d)));
    const bonus = new Set();
    bonusRecords.forEach((r) => { if (r.date) bonus.add(r.date); });
    return { usedSet: used, bonusSet: bonus };
  }, [records, bonusRecords]);

  const todayStr = formatDate(today);

  /* 달력 셀 구성 */
  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();      // 1일의 요일(0~6)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);        // 앞 빈칸
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      arr.push({ day, dateStr: `${year}-${mm}-${dd}` });
    }
    while (arr.length % 7 !== 0) arr.push(null);              // 뒤 빈칸
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
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  /* 이번 달 사용/포상 일수 요약 */
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const usedThisMonth  = [...usedSet].filter((d) => d.startsWith(monthPrefix)).length;
  const bonusThisMonth = [...bonusSet].filter((d) => d.startsWith(monthPrefix)).length;

  return (
    <View style={s.wrap}>
      {/* 헤더: 월 이동 */}
      <View style={s.header}>
        <TouchableOpacity onPress={goPrev} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.navArrow}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToday} activeOpacity={0.7}>
          <Text style={s.headerTitle}>{year}년 {month + 1}월</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.navArrow}>›</Text>
        </TouchableOpacity>
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
          const isToday = cell.dateStr === todayStr;
          const dow = idx % 7;
          return (
            <View key={idx} style={s.cell}>
              <View style={[
                s.dayBox,
                isUsed && s.dayUsed,
                isToday && s.dayToday,
              ]}>
                <Text style={[
                  s.dayText,
                  dow === 0 && s.sun,
                  dow === 6 && s.sat,
                  isUsed && s.dayTextUsed,
                  isToday && s.dayTextToday,
                ]}>
                  {cell.day}
                </Text>
                {isBonus && <Text style={s.bonusStar}>★</Text>}
              </View>
            </View>
          );
        })}
      </View>

      {/* 범례 + 이번 달 요약 */}
      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: tc.primary }]} />
          <Text style={s.legendText}>연가 사용 {usedThisMonth > 0 ? `(${usedThisMonth}일)` : ''}</Text>
        </View>
        <View style={s.legendItem}>
          <Text style={[s.legendStar, { color: tc.accent }]}>★</Text>
          <Text style={s.legendText}>포상 부여 {bonusThisMonth > 0 ? `(${bonusThisMonth})` : ''}</Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  wrap: { paddingVertical: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 12 },
  navArrow: { fontSize: 28, color: tc.primary, fontWeight: '700', paddingHorizontal: 12 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: tc.text },

  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: tc.textSecondary },
  sun: { color: '#E53935' },
  sat: { color: '#1E88E5' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  dayBox: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayUsed: { backgroundColor: tc.primary },
  dayToday: { borderWidth: 1.5, borderColor: tc.accent },
  dayText: { fontSize: 14, color: tc.text, fontWeight: '600' },
  dayTextUsed: { color: tc.white, fontWeight: '800' },
  dayTextToday: { color: tc.accent },
  bonusStar: { position: 'absolute', top: -2, right: -1, fontSize: 11, color: tc.accent },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: tc.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendStar: { fontSize: 14 },
  legendText: { fontSize: 12, color: tc.textSecondary, fontWeight: '600' },
});
