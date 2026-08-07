import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import {
  resolvePalette, effectiveScheme, getTheme,
  DEFAULT_THEME_ID, THEME_LIST,
} from './palettes';
import { loadThemeSettings, saveThemeSettings } from '../utils/storage';
import { updateDischargeWidget } from '../widget/updateWidget';

/**
 * 앱 전역 테마.
 *  themeId      : 팔레트 테마 ('nightvision' | 'forest' | ...)
 *  mode         : 'system' | 'light' | 'dark'  (사용자가 고른 밝기, 저장됨)
 *  scheme       : 'light' | 'dark'             (실제 적용값)
 *  schemeForced : 테마가 다크 전용이라 mode 를 무시하고 있는지
 *  colors       : 현재 테마 × scheme 팔레트
 *
 * 다크 전용 테마를 골라도 저장된 mode 는 덮어쓰지 않는다. 렌더 시점에만
 * effectiveScheme 으로 강제해서, 양쪽 지원 테마로 돌아오면 원래 밝기가
 * 그대로 복원된다.
 */
const bootPalette = resolvePalette(DEFAULT_THEME_ID, 'dark');

const ThemeContext = createContext({
  themeId: DEFAULT_THEME_ID,
  mode: 'system',
  scheme: 'dark',
  schemeForced: false,
  colors: bootPalette,
  themes: THEME_LIST,
  unlocked: [],
  introSeen: true,
  setMode: () => {},
  setThemeId: () => {},
  markThemeIntroSeen: () => {},
});

export function ThemeProvider({ children }) {
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME_ID);
  const [mode, setModeState] = useState('system');
  const [unlocked, setUnlocked] = useState([]);
  const [introSeen, setIntroSeen] = useState(true);
  const [ready, setReady] = useState(false);
  const [systemScheme, setSystemScheme] = useState(
    Appearance.getColorScheme() || 'light'
  );

  // 저장된 설정 복원 (기존 사용자는 포레스트로 남는다 — storage 마이그레이션 참고)
  useEffect(() => {
    let alive = true;
    loadThemeSettings().then((s) => {
      if (!alive) return;
      setThemeIdState(s.themeId);
      setModeState(s.mode);
      setUnlocked(s.unlocked);
      setIntroSeen(s.introSeen);
      setReady(true);
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
    saveThemeSettings({ mode: m }).catch(() => {});
  };

  const setThemeId = (id) => {
    setThemeIdState(id);
    saveThemeSettings({ themeId: id }).catch(() => {});
    // 위젯도 같이 갈아입는다 (fire-and-forget — 자체 try/catch 를 갖고 있다)
    updateDischargeWidget();
  };

  const markThemeIntroSeen = () => {
    if (introSeen) return;
    setIntroSeen(true);
    saveThemeSettings({ introSeen: true }).catch(() => {});
  };

  const requested = mode === 'system' ? systemScheme : mode;
  const scheme = effectiveScheme(themeId, requested);
  const schemeForced = scheme !== requested;

  const colors = useMemo(() => resolvePalette(themeId, requested), [themeId, requested]);

  const value = useMemo(
    () => ({
      themeId, mode, scheme, schemeForced, colors,
      themes: THEME_LIST, unlocked, introSeen, ready,
      theme: getTheme(themeId),
      setMode, setThemeId, markThemeIntroSeen, setUnlocked,
    }),
    [themeId, mode, scheme, schemeForced, colors, unlocked, introSeen, ready]
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
