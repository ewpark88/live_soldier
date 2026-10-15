import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import PressScale from './ui/PressScale';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../theme/tokens';
import { useMotion } from '../hooks/useMotion';
import useToday from '../hooks/useToday';
import { formatDate, formatDateKo, daysBetweenInclusive, parseDate } from '../utils/dateUtils';

/**
 * 기간(from~to) 선택 인라인 캘린더.
 * 하루씩 추가하는 번거로움 없이, 달력에서 시작일과 종료일을 탭해 한 번에 선택한다.
 *
 *  - 1탭: 시작일 지정(단일 일정). 2탭(시작일 이후): 종료일 지정 → 기간.
 *  - 시작일보다 앞 날짜를 탭하면 그 날짜로 시작일을 다시 잡는다.
 *  - 시작일을 다시 탭하면 단일 일정으로 되돌린다.
 *
 * @param {string}   startDate   'YYYY-MM-DD' (없으면 미선택)
 * @param {string}   endDate     'YYYY-MM-DD' (없으면 단일 일정 = 시작일)
 * @param {function} onChange    (start: string, end: string) => void  (end는 단일이면 '')
 * @param {Date}     minimumDate 이 날짜 이전은 선택 불가
 * @param {Date}     maximumDate 이 날짜 이후는 선택 불가
 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateStr(y, m /*0~11*/, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function RangeCalendar({
  startDate = '',
  endDate = '',
  onChange,
  minimumDate,
  maximumDate,
}) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const todayStr = useToday();
  const today = parseDate(todayStr);

  // 보여줄 달: 선택된 시작일 우선, 없으면 오늘
  const initial = parseDate(startDate) ?? today;   // 문자열을 그대로 넘기면 UTC 파싱이라 달이 밀린다
  const [year, setYear]   = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());

  const minStr = minimumDate ? formatDate(minimumDate) : null;
  const maxStr = maximumDate ? formatDate(maximumDate) : null;

  /* 달력 셀 */
  const cells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < firstDow; i++) arr.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      arr.push({ day, dateStr: toDateStr(year, month, day) });
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
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const isDisabled = (dateStr) =>
    (minStr && dateStr < minStr) || (maxStr && dateStr > maxStr);

  const handleTap = (dateStr) => {
    if (isDisabled(dateStr)) return;
    // 시작 미선택, 또는 이미 기간 완성(start+end) → 새 시작일
    if (!startDate || endDate) {
      onChange(dateStr, '');
      return;
    }
    // 시작만 선택된 상태
    if (dateStr === startDate) {
      onChange(dateStr, ''); // 단일 유지
    } else if (dateStr < startDate) {
      onChange(dateStr, ''); // 더 앞 날짜 → 시작일 이동
    } else {
      onChange(startDate, dateStr); // 종료일 확정
    }
  };

  // 효과적 종료일(단일이면 시작일과 동일)
  const effEnd = endDate || startDate;
  const dur = startDate ? daysBetweenInclusive(startDate, effEnd) : 0;

  return (
    <View style={s.wrap}>
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

      {/* 날짜 그리드 */}
      <View style={s.grid}>
        {cells.map((cell, idx) => {
          if (!cell) return <View key={idx} style={s.cell} />;
          const { dateStr, day } = cell;
          const disabled = isDisabled(dateStr);
          const isStart = !!startDate && dateStr === startDate;
          const isEnd   = !!endDate && dateStr === endDate;
          const inRange = !!startDate && !!endDate && dateStr > startDate && dateStr < endDate;
          const isToday = dateStr === todayStr;
          const dow = idx % 7;
          const selected = isStart || isEnd;
          // 양 끝/중간 밴드 처리 (단일 선택이면 밴드 없음)
          const showBand = !!endDate && (isStart || isEnd || inRange);
          return (
            <PressScale
              key={idx}
              style={s.cell}
              haptic={disabled ? null : 'select'}
              onPress={() => handleTap(dateStr)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={`${month + 1}월 ${day}일${isToday ? ', 오늘' : ''}${isStart ? ', 시작일' : ''}${isEnd ? ', 종료일' : ''}`}
              accessibilityState={{ selected, disabled: !!disabled }}
            >
              {showBand && (
                <View style={[
                  s.band,
                  isStart && s.bandStart,
                  isEnd && s.bandEnd,
                ]} />
              )}
              <View style={[
                s.dayBox,
                selected && s.daySelected,
                isToday && !selected && s.dayToday,
              ]}>
                <Text maxFontSizeMultiplier={1.2} style={[
                  s.dayText,
                  dow === 0 && s.sun,
                  dow === 6 && s.sat,
                  inRange && s.dayTextInRange,
                  selected && s.dayTextSelected,
                  isToday && !selected && s.dayTextToday,
                  disabled && s.dayTextDisabled,
                ]}>
                  {day}
                </Text>
              </View>
            </PressScale>
          );
        })}
      </View>

      {/* 선택 요약 */}
      <SummaryBar
        s={s}
        start={startDate}
        end={endDate}
        effEnd={effEnd}
        dur={dur}
      />
    </View>
  );
}

/* 선택 결과 요약 — 변경 시 살짝 페이드 (useMotion 을 거친다 — 동작 줄이기면 즉시) */
function SummaryBar({ s, start, end, effEnd, dur }) {
  const m = useMotion();

  if (!start) {
    return (
      <View style={s.summary}>
        <Text style={s.summaryHint}>시작일을 탭하세요 · 종료일까지 한 번 더 탭하면 기간 선택</Text>
      </View>
    );
  }
  return (
    <Animated.View key={`${start}|${end}`} entering={m.enter(FadeIn, 0, 220)} style={s.summary}>
      <Text style={s.summaryDate}>
        {end ? `${formatDateKo(start)}  ~  ${formatDateKo(effEnd)}` : formatDateKo(start)}
      </Text>
      <View style={s.summaryBadge}>
        <Text style={s.summaryBadgeText}>{dur}일</Text>
      </View>
    </Animated.View>
  );
}

const DAY = 36;

const makeStyles = (tc) => StyleSheet.create({
  wrap: { paddingVertical: sp.xs },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: sp.sm },
  // EventCalendar 와 같은 탭 영역 (44)
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleBtn: { minHeight: 44, paddingHorizontal: sp.md, justifyContent: 'center' },
  headerTitle: { ...ty.bodyLg, fontWeight: '800', color: tc.text },

  weekRow: { flexDirection: 'row', marginBottom: sp.xs },
  weekday: { flex: 1, textAlign: 'center', ...ty.caption, fontWeight: '700', color: tc.textSecondary },
  sun: { color: tc.sun },
  sat: { color: tc.sat },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // 7칸 고정 그리드 — 정적 퍼센트라 자투리 문제(Grid 규칙)와 무관하다
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },

  /* 기간 밴드 (셀 배경) */
  band: {
    position: 'absolute',
    top: (44 - DAY) / 2, bottom: (44 - DAY) / 2, left: 0, right: 0,
    backgroundColor: tc.primarySoft,
  },
  bandStart: { left: '50%' },
  bandEnd: { right: '50%' },

  dayBox: { width: DAY, height: DAY, borderRadius: DAY / 2, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: tc.primary },
  dayToday: { borderWidth: 1.5, borderColor: tc.accentText },

  dayText: { ...ty.bodySm, fontWeight: '600', color: tc.text },
  dayTextInRange: { color: tc.primary, fontWeight: '700' },
  // tc.white 가 아니라 onPrimary — 다크 테마의 primary 는 밝아서 흰 글자가 사라진다
  dayTextSelected: { color: tc.onPrimary, fontWeight: '800' },
  // tc.accent 는 라이트에서 2.2:1 — 글자에는 accentText 를 쓴다
  dayTextToday: { color: tc.accentText, fontWeight: '800' },
  dayTextDisabled: { color: tc.textLight, opacity: 0.5 },

  /* 요약 */
  summary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sp.sm,
    marginTop: sp.md, paddingTop: sp.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tc.border,
    minHeight: 32,
  },
  summaryHint: { ...ty.caption, fontWeight: '500', color: tc.textSecondary, textAlign: 'center' },
  summaryDate: { ...ty.body, fontWeight: '800', color: tc.text },
  summaryBadge: { backgroundColor: tc.primary, borderRadius: r.pill, paddingHorizontal: sp.md, paddingVertical: sp.xxs },
  summaryBadgeText: { ...ty.label, fontWeight: '800', color: tc.onPrimary },
});
