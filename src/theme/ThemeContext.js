import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import { paletteFor } from '../constants/colors';
import { loadThemeMode, saveThemeMode } from '../utils/storage';

/**
 * 앱 전역 테마.
 *  mode   : 'system' | 'light' | 'dark'   (사용자 선택, 저장됨)
 *  scheme : 'light' | 'dark'              (실제 적용값 — system이면 기기 설정)
 *  colors : 현재 scheme 의 색상 팔레트
 */
const ThemeContext = createContext({
  mode: 'system',
  scheme: 'light',
  colors: paletteFor('light'),
  setMode: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('system');
  const [systemScheme, setSystemScheme] = useState(
    Appearance.getColorScheme() || 'light'
  );

  // 저장된 모드 복원
  useEffect(() => {
    let alive = true;
    loadThemeMode().then((m) => {
      if (alive && m) setModeState(m);
    });
    return () => { alive = false; };
  }, []);

  // 시스템 테마 변화 구독
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || 'light');
    });
    return () => sub.remove();
  }, []);

  const setMode = (m) => {
    setModeState(m);
    saveThemeMode(m).catch(() => {});
  };

  const scheme = mode === 'system' ? systemScheme : mode;
  const colors = useMemo(() => paletteFor(scheme), [scheme]);

  const value = useMemo(
    () => ({ mode, scheme, colors, setMode }),
    [mode, scheme, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** 전체 테마 컨텍스트 */
export function useTheme() {
  return useContext(ThemeContext);
}

/** 현재 테마 색상 팔레트만 필요할 때 */
export function useThemeColors() {
  return useContext(ThemeContext).colors;
}
