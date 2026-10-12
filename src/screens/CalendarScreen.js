import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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

/* 달력을 남은 공간에 꽉 채우는(fill) 데 필요한 최소 높이.
   헤더 ~46 + 요일 20 + 6주 × 38 + 범례 ~41 + 선택일 상세 ~60 + 카드 패딩·여백 ~80.
   이보다 짧은 화면(360×640 등)에서 fill 로 두면 overflow:hidden 에 마지막 주·범례·
   상세가 잘린다 — 그땐 자연 높이로 그리고 스크롤시킨다. */
const CAL_FILL_MIN = 480;

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
  const [bodyH, setBodyH] = useState(0);
  const fillCal = bodyH === 0 || bodyH >= CAL_FILL_MIN;

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

      <View style={s.body} onLayout={(e) => setBodyH(e.nativeEvent.layout.height)}>
        {section === 'month' ? (
          info === undefined ? null : !info ? (
            <SetupRequired />
          ) : (
            <>
              <ScrollView
                scrollEnabled={!fillCal}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={fillCal ? s.flex : null}
              >
                <View style={[s.monthPad, fillCal && s.flex]}>
                  <Card style={[s.calCard, fillCal && s.flex]}>
                    <View style={[s.calInner, fillCal && s.flex]}>
                      <EventCalendar
                        fill={fillCal}
                        records={records}
                        bonusRecords={bonus}
                        todos={todos}
                      />
                    </View>
                  </Card>
                </View>
              </ScrollView>
            </>
          )
        ) : section === 'leave' ? (
          <LeaveScreen navigation={navigation} embedded />
        ) : (
          <TodoScreen navigation={navigation} embedded />
        )}
      </View>

      {/* 광고는 세그먼트 밖에 하나만 둔다. 예전엔 달력/휴가/일정이 각자 푸터를
          가져서 칩을 누를 때마다 배너가 새로 마운트됐다 — 받은 광고를 보여주기도
          전에 버리고 다시 요청하니 노출률만 깎였다. */}
      {info ? <AdFooter unit={AD_UNITS.LEAVE_BOTTOM} /> : null}
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
    // 화면이 충분히 길면 달력이 남은 공간을 flex 로 꽉 채운다 (EventCalendar fill 모드).
    // 짧으면 flex 를 빼고 자연 높이 + 스크롤 (CAL_FILL_MIN 참고).
    flex: { flexGrow: 1 },
    monthPad: { paddingHorizontal: sp.lg, paddingBottom: sp.md },
    calCard: { overflow: 'hidden' },
    calInner: { marginTop: sp.sm },
  });
