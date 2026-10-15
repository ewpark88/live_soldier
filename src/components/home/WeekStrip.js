import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Txt, PressScale } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp, tabular, type as ty } from '../../theme/tokens';
import { spanDates, parseDate } from '../../utils/dateUtils';
import { todayStrOffset } from '../../utils/streak';

const WD = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 이번 주 7일 스트립 (카드 없음 — ThisWeek 가 감싼다).
 *
 * 홈은 "오늘", 캘린더 탭은 "이번 달"이라는 위계다. 월간 그리드를 홈에 두면
 * D-Day 히어로와 세로 공간을 나눠 갖게 되고, 그러면 정작 이 앱을 여는 이유인
 * 전역일이 주인공이 못 된다.
 *
 * '오늘'은 부모가 준다 (StreakContext.today — 자정·포그라운드 복귀 때 갱신).
 * 예전엔 useMemo 안에서 new Date() 를 불러서, 밤새 켜 둔 홈의 '오늘' 테두리가
 * 어제에 머물렀다.
 *
 * 셀은 flex:1 행이다 (퍼센트 폭이 아니라 — Grid 규칙과 같은 이유).
 * 상태는 색만으로 전하지 않는다 — 스크린리더용 라벨을 셀마다 붙인다.
 */
export default function WeekStrip({ today, records = [], bonusRecords = [], todos = [], attendance = [], onPress }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const days = useMemo(() => {
    const dow = parseDate(today)?.getDay() ?? 0;
    // 일요일 시작
    const start = todayStrOffset(today, -dow);

    const used = new Set();
    for (const rec of records) spanDates(rec.date, rec.days || 1).forEach((d) => used.add(d));
    const bonus = new Set();
    // 포상휴가의 date 는 '부여일'이지 사용한 기간이 아니다 — 하루만 표시한다
    for (const rec of bonusRecords) if (rec.date) bonus.add(rec.date);
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

    return Array.from({ length: 7 }, (_, i) => {
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
  }, [today, records, bonusRecords, todos, attendance]);

  return (
    <View style={s.row}>
      {days.map((d) => {
        const label = [
          `${WD[d.dow]}요일 ${d.num}일`,
          d.isToday && '오늘',
          d.used && '휴가',
          d.bonus && '포상휴가 부여',
          d.todo && '일정 있음',
          d.attended && '출석',
        ].filter(Boolean).join(', ');
        return (
          <PressScale
            key={d.date}
            onPress={onPress ? () => onPress(d.date) : undefined}
            haptic="light"
            scale={0.94}
            style={s.cell}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Txt
              role="micro"
              style={[
                s.wd,
                d.dow === 0 && { color: tc.sun },
                d.dow === 6 && { color: tc.sat },
              ]}
              maxFontSizeMultiplier={1.2}
            >
              {WD[d.dow]}
            </Txt>

            <View
              style={[
                s.num,
                d.used && { backgroundColor: tc.primary },
                d.bonus && !d.used && { backgroundColor: tc.accentSoft },
                d.isToday && { borderWidth: 2, borderColor: d.used ? tc.primaryDark : tc.primary },
              ]}
            >
              <Txt
                role="label"
                numeric
                style={[
                  s.numText,
                  d.used && { color: tc.onPrimary },
                  d.bonus && !d.used && { color: tc.accentText },
                ]}
                maxFontSizeMultiplier={1.2}
              >
                {d.num}
              </Txt>
            </View>

            <View style={s.marks}>
              {d.todo ? <View style={[s.dot, { backgroundColor: tc.textSecondary }]} /> : null}
              {d.attended ? <View style={[s.dot, { backgroundColor: tc.accent }]} /> : null}
            </View>
          </PressScale>
        );
      })}
    </View>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    row: { flexDirection: 'row' },
    cell: { flex: 1, alignItems: 'center', gap: sp.xs, minHeight: 44 },
    wd: { color: tc.textLight, fontWeight: '700' },
    num: {
      width: 36,
      height: 36,
      borderRadius: r.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tc.surfaceSunken,
    },
    numText: { ...ty.label, ...tabular, color: tc.text },
    marks: { flexDirection: 'row', gap: 3, height: 5 },
    dot: { width: 4, height: 4, borderRadius: r.pill },
  });
