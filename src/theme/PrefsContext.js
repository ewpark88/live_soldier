import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadUIPrefs, saveUIPrefs, DEFAULT_UI_PREFS } from '../utils/storage';
import { setHapticsEnabled } from '../utils/haptics';

/**
 * 앱 UI 환경설정 — 햅틱 / 애니메이션 줄이기.
 * 테마와 마찬가지로 프로필이 아니라 기기에 붙는 설정이다.
 */
const PrefsContext = createContext({
  ...DEFAULT_UI_PREFS,
  setHaptics: () => {},
  setReduceMotion: () => {},
});

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULT_UI_PREFS);

  useEffect(() => {
    let alive = true;
    loadUIPrefs().then((p) => {
      if (!alive) return;
      setPrefs(p);
      setHapticsEnabled(p.haptics);
    });
    return () => { alive = false; };
  }, []);

  const update = (patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      setHapticsEnabled(next.haptics);
      saveUIPrefs(next);
      return next;
    });
  };

  const value = useMemo(
    () => ({
      ...prefs,
      setHaptics: (v) => update({ haptics: v }),
      setReduceMotion: (v) => update({ reduceMotion: v }),
    }),
    [prefs]
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  return useContext(PrefsContext);
}
