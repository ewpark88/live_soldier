import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { AppState } from 'react-native';
import {
  loadMilitaryInfo, loadRankPromotions, loadCelebrated, markCelebrated, unlockTheme,
} from '../utils/storage';
import { buildRoadmap } from '../utils/roadmapUtils';
import { dueMilestone, unlockedBy } from '../utils/celebration';
import { THEME_LIST } from '../theme/palettes';

/**
 * 마일스톤 축하 오케스트레이션.
 *
 * 홈 포커스가 아니라 마운트 + AppState 'active' 에서 평가한다. 탭을 옮길
 * 때마다 재평가할 이유가 없고, 자정을 넘겨 새 마일스톤에 도달하는 경우는
 * 백그라운드 복귀 시점에 잡힌다.
 */
const CelebrationContext = createContext({
  pending: null,
  unlockedTheme: null,
  dismiss: () => {},
  recheck: () => {},
});

export function CelebrationProvider({ children }) {
  const [pending, setPending] = useState(null);
  const [unlockedTheme, setUnlockedTheme] = useState(null);
  const busy = useRef(false);

  const evaluate = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const info = await loadMilitaryInfo();
      if (!info) return;
      const promos = await loadRankPromotions(info.enlistDate);
      const roadmap = buildRoadmap(info, promos);
      const celebrated = await loadCelebrated();

      const { seed, show } = dueMilestone(roadmap, celebrated);
      if (seed.length) {
        // 축하는 "열 때" 기록한다. 축하 도중 강제종료 → 무한 재발화보다,
        // 강제종료한 사용자가 한 번 놓치는 쪽이 낫다.
        await markCelebrated(seed);
      }
      if (!show) return;

      const theme = unlockedBy(show.key, THEME_LIST);
      if (theme) await unlockTheme(theme.id);
      setUnlockedTheme(theme);
      setPending(show);
    } catch (e) {
      // 여기서 던지면 markCelebrated 는 이미 기록된 뒤라 축하가 영영 사라진다.
      if (__DEV__) console.warn('[Celebration] 판정 실패:', e && e.message);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => { evaluate(); }, [evaluate]);   // evaluate 내부에서 모든 예외를 처리한다

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') evaluate();
    });
    return () => sub.remove();
  }, [evaluate]);

  const value = useMemo(() => ({
    pending,
    unlockedTheme,
    dismiss: () => { setPending(null); setUnlockedTheme(null); },
    recheck: evaluate,
  }), [pending, unlockedTheme, evaluate]);

  return (
    <CelebrationContext.Provider value={value}>{children}</CelebrationContext.Provider>
  );
}

export function useCelebration() {
  return useContext(CelebrationContext);
}
