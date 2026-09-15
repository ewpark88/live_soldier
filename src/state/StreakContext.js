import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { AppState } from 'react-native';
import { loadStreak, saveStreak } from '../utils/storage';
import { checkIn, EMPTY_STREAK, tierOf, recentDays, freezeActive } from '../utils/streak';
import { todayStr } from '../utils/daily';

/**
 * 출석 스트릭 + 앱 전역 "오늘".
 *
 * 체크인을 HomeScreen 의 useFocusEffect 에 두지 않는 이유: 그건 탭을 옮길
 * 때마다 도는 자리라 세션당 10회 넘게 실행된다. 여기서 마운트 1회 +
 * AppState 'active' 전이에서만 (멱등하게) 돌린다.
 *
 * 이 컨텍스트의 `today` 가 앱 전체의 "오늘" 단일 진실 원천이다. 데일리 히어로도
 * 여기서 날짜를 받으므로, 앱을 켜둔 채 자정을 넘겨도 화면이 같이 따라온다
 * (각자 new Date() 를 부르면 화면마다 날짜가 어긋난다).
 */
const StreakContext = createContext({
  streak: EMPTY_STREAK,
  today: todayStr(),
  ready: false,
  checkedToday: false,
  tier: tierOf(0),
  days: [],
  usedFreeze: false,
  justIncremented: false,
  refresh: () => {},
});

export function StreakProvider({ children, onCheckIn }) {
  const [streak, setStreak] = useState(EMPTY_STREAK);
  const [today, setToday] = useState(() => todayStr());
  const [ready, setReady] = useState(false);
  const [justIncremented, setJustIncremented] = useState(false);
  const busy = useRef(false);

  const run = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const stored = (await loadStreak()) ?? EMPTY_STREAK;
      const now = new Date();
      const { next, changed, event } = checkIn(stored, now);
      setToday(todayStr(now));
      setStreak(next);
      if (changed) {
        await saveStreak(next);
        setJustIncremented(event === 'continue' || event === 'freeze' || event === 'first');
        // 스트릭이 실제로 움직였을 때만 알림을 다시 잡는다.
        // 예전 형태 onCheckIn(...).catch?.() 는 메서드만 보호해서, 콜백이
        // Promise 를 안 돌려주면 TypeError 가 났고 try 에 catch 가 없어
        // setReady(true) 까지 건너뛰어 스트릭 UI 가 영영 로딩에 머물렀다.
        if (onCheckIn) {
          try { await Promise.resolve(onCheckIn(next, event)); } catch { /* 알림 재예약 실패는 무시 */ }
        }
      }
    } catch (e) {
      if (__DEV__) console.warn('[Streak] 체크인 실패:', e && e.message);
    } finally {
      setReady(true);   // 실패해도 UI 를 로딩 상태로 붙잡아두지 않는다
      busy.current = false;
    }
  }, [onCheckIn]);

  useEffect(() => { run(); }, [run]);

  // 백그라운드에서 돌아올 때마다 재확인 — 자정을 넘겼을 수 있다
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') run();
    });
    return () => sub.remove();
  }, [run]);

  const value = useMemo(() => ({
    streak,
    today,
    ready,
    checkedToday: streak.last === today,
    tier: tierOf(streak.current),
    days: recentDays(streak, 7, today),
    usedFreeze: freezeActive(streak, today),
    justIncremented,
    refresh: run,
  }), [streak, today, ready, justIncremented, run]);

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

export function useStreak() {
  return useContext(StreakContext);
}
