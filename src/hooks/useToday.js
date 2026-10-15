import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { todayStr } from '../utils/daily';

/**
 * 오늘 'YYYY-MM-DD' — 자정을 넘기거나 앱이 포그라운드로 돌아오면 갱신된다.
 *
 * 탭 화면은 언마운트되지 않는다. 예전엔 `useMemo(() => new Date(), [])` 로
 * 마운트 시점의 오늘을 붙잡아서, 밤새 켜 둔 앱의 달력·주간 스트립이 어제를
 * '오늘'로 표시했다.
 */
export default function useToday() {
  const [today, setToday] = useState(() => todayStr());

  useEffect(() => {
    let timer = null;
    const sync = () => setToday((prev) => {
      const now = todayStr();
      return now === prev ? prev : now;
    });
    const arm = () => {
      if (timer) clearTimeout(timer);
      const n = new Date();
      const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 5);
      timer = setTimeout(() => { sync(); arm(); }, Math.max(1000, next - n));
    };
    arm();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') { sync(); arm(); }
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return today;
}
