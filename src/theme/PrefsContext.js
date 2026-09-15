import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

  // 업데이터는 순수해야 한다 — React 는 업데이터를 두 번 호출할 수 있고
  // (StrictMode·동시 렌더), 그러면 AsyncStorage 쓰기가 중복된다.
  // 다음 상태를 ref 로 붙잡아 계산한 뒤, 부수효과는 바깥에서 한 번만 돌린다.
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const update = (patch) => {
    const next = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    setPrefs(next);
    setHapticsEnabled(next.haptics);
    saveUIPrefs(next);
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
