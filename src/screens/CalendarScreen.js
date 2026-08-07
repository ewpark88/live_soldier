import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LeaveScreen from './LeaveScreen';
import TodoScreen from './TodoScreen';
import Card from '../components/Card';
import EventCalendar from '../components/EventCalendar';
import SetupRequired from '../components/SetupRequired';
import { AppHeader, Chip, AdFooter } from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import {
  loadMilitaryInfo, loadLeaveRecords, loadLeaveBonusRecords, loadTodos,
} from '../utils/storage';
import { useThemeColors } from '../theme/ThemeContext';
import { space as sp } from '../theme/tokens';

const SECTIONS = [
  { key: 'month', label: '달력', icon: 'calendar-outline' },
  { key: 'leave', label: '휴가', icon: 'airplane-outline' },
  { key: 'todo', label: '일정', icon: 'checkbox-outline' },
];

/**
 * 캘린더 탭 — 월간 달력 + 휴가 + 일정을 세그먼트로 합친 화면.
 *
 * 홈이 "오늘"을 맡고 여기가 "이번 달"을 맡는다. v1.0.8 에서 홈에 있던 월간
 * 달력이 이리로 왔고, 덕분에 홈의 첫 화면 전체를 D-Day 히어로가 쓴다.
 *
 * 휴가/일정 본문 로직은 손대지 않았다. 각자 `embedded` 모드로 자기 <Screen>
 * (스크롤·광고 푸터·바텀시트·FAB)을 그대로 유지하고, 껍데기(헤더·세그먼트)만
 * 여기서 소유한다. 520줄 + 490줄을 잘라 붙이는 것보다 회귀 위험이 훨씬 낮다.
 *
 * 진입 파라미터:
 *   navigation.navigate('calendar', { section: 'month' | 'leave' | 'todo' })
 * 같은 탭에 다시 들어와도 params 가 갱신되므로 key 가 아니라 effect 로 받는다.
 */
export default function CalendarScreen({ navigation, route }) {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [section, setSection] = useState(route?.params?.section ?? 'month');
  const [info, setInfo] = useState(undefined);
  const [records, setRecords] = useState([]);
  const [bonus, setBonus] = useState([]);
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    const next = route?.params?.section;
    if (next && next !== section) setSection(next);
  }, [route?.params?.section, route?.params?.ts]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const mi = await loadMilitaryInfo();
        if (!alive) return;
        setInfo(mi);
        setRecords(await loadLeaveRecords());
        setBonus(await loadLeaveBonusRecords());
        setTodos(await loadTodos());
      })();
      return () => { alive = false; };
    }, [])
  );

  const header = (
    <View style={{ paddingTop: insets.top }}>
      <AppHeader title="캘린더" />
      <View style={s.segments}>
        {SECTIONS.map((sec) => (
          <Chip
            key={sec.key}
            label={sec.label}
            icon={sec.icon}
            size="md"
            selected={section === sec.key}
            onPress={() => setSection(sec.key)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: tc.background }]}>
      {header}

      <View style={s.body}>
        {section === 'month' ? (
          info === undefined ? null : !info ? (
            <SetupRequired />
          ) : (
            <>
              <View style={s.monthPad}>
                <Card style={s.calCard}>
                  <View style={s.calInner}>
                    <EventCalendar
                      fill
                      records={records}
                      bonusRecords={bonus}
                      todos={todos}
                    />
                  </View>
                </Card>
              </View>
              <AdFooter unit={AD_UNITS.LEAVE_BOTTOM} />
            </>
          )
        ) : section === 'leave' ? (
          <LeaveScreen navigation={navigation} embedded />
        ) : (
          <TodoScreen navigation={navigation} embedded />
        )}
      </View>
    </View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    root: { flex: 1 },
    segments: {
      flexDirection: 'row',
      gap: sp.sm,
      paddingHorizontal: sp.lg,
      paddingBottom: sp.sm,
    },
    body: { flex: 1 },
    // 달력은 남은 공간을 flex 로 꽉 채운다 (EventCalendar fill 모드)
    monthPad: { flex: 1, paddingHorizontal: sp.lg, paddingBottom: sp.md },
    calCard: { flex: 1, overflow: 'hidden' },
    calInner: { flex: 1, marginTop: sp.sm },
  });
