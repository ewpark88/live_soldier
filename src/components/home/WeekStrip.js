import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Card from '../Card';
import SectionTitle from '../SectionTitle';
import { Txt, PressScale } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp, tabular, type as ty } from '../../theme/tokens';
import { spanDates, formatDate } from '../../utils/dateUtils';
import { todayStrOffset } from '../../utils/streak';

const WD = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 이번 주 7일 스트립 — 홈에서 월간 캘린더를 대신한다.
 *
 * 홈은 "오늘", 캘린더 탭은 "이번 달"이라는 위계다. 월간 그리드를 홈에 두면
 * D-Day 히어로와 세로 공간을 나눠 갖게 되고, 그러면 정작 이 앱을 여는 이유인
 * 전역일이 주인공이 못 된다.
 *
 * 셀은 flex:1 행이다 (퍼센트 폭이 아니라 — Grid 규칙과 같은 이유).
 */
export default function WeekStrip({ records = [], bonusRecords = [], todos = [], attendance = [], onPress }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const { days, rangeLabel } = useMemo(() => {
    const now = new Date();
    const today = formatDate(now);
    // 일요일 시작
    const start = todayStrOffset(today, -now.getDay());

    const used = new Set();
    for (const rec of records) spanDates(rec.date, rec.days || 1).forEach((d) => used.add(d));
    const bonus = new Set();
    for (const rec of bonusRecords) spanDates(rec.date, rec.days || 1).forEach((d) => bonus.add(d));
    const todoDays = new Set();
    for (const t of todos) {
      if (!t.date) continue;
      if (!t.endDate || t.endDate <= t.date) { todoDays.add(t.date); continue; }
      // 기간 일정 — 최대 60일까지만 (잘못 입력된 종료일이 루프를 잡아먹지 않게)
      let cur = t.date;
      for (let i = 0; i < 60 && cur <= t.endDate; i += 1) {
        todoDays.add(cur);
        cur = todayStrOffset(cur, 1);
      }
    }
    const present = new Set(attendance.filter((a) => a.present).map((a) => a.date));

    const list = Array.from({ length: 7 }, (_, i) => {
      const date = todayStrOffset(start, i);
      return {
        date,
        dow: i,
        num: Number(date.slice(8, 10)),
        isToday: date === today,
        used: used.has(date),
        bonus: bonus.has(date),
        todo: todoDays.has(date),
        attended: present.has(date),
      };
    });

    const a = list[0].date.replace(/^\d{4}-/, '').replace('-', '.');
    const b = list[6].date.replace(/^\d{4}-/, '').replace('-', '.');
    return { days: list, rangeLabel: `${a} – ${b}` };
  }, [records, bonusRecords, todos, attendance]);

  return (
    <Card>
      <SectionTitle
        icon="calendar-outline"
        right={<Txt role="caption" tone="light" numeric>{rangeLabel}</Txt>}
      >
        이번 주
      </SectionTitle>

      <View style={s.row}>
        {days.map((d) => (
          <PressScale
            key={d.date}
            onPress={onPress ? () => onPress(d.date) : undefined}
            haptic="light"
            scale={0.94}
            style={s.cell}
          >
            <Txt
              role="micro"
              style={[
                s.wd,
                d.dow === 0 && { color: tc.sun },
                d.dow === 6 && { color: tc.sat },
              ]}
            >
              {WD[d.dow]}
            </Txt>

            <View
              style={[
                s.num,
                d.used && { backgroundColor: tc.primary },
                d.bonus && { backgroundColor: tc.accent },
                d.isToday && { borderWidth: 2, borderColor: tc.primary },
              ]}
            >
              <Txt
                role="label"
                numeric
                style={[
                  s.numText,
                  (d.used || d.bonus) && { color: d.bonus ? tc.onGold : tc.onPrimary },
                ]}
              >
                {d.num}
              </Txt>
            </View>

            <View style={s.marks}>
              {d.todo ? <View style={[s.dot, { backgroundColor: tc.textSecondary }]} /> : null}
              {d.attended ? <View style={[s.dot, { backgroundColor: tc.accent }]} /> : null}
            </View>
          </PressScale>
        ))}
      </View>
    </Card>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    row: { flexDirection: 'row', marginTop: sp.md },
    cell: { flex: 1, alignItems: 'center', gap: 4 },
    wd: { color: tc.textLight, fontWeight: '700' },
    num: {
      width: 32,
      height: 32,
      borderRadius: r.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tc.surfaceSunken,
    },
    numText: { ...ty.label, ...tabular, color: tc.text },
    marks: { flexDirection: 'row', gap: 3, height: 5 },
    dot: { width: 4, height: 4, borderRadius: 2 },
  });
