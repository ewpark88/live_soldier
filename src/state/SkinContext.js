import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadSkins, saveSkins } from '../utils/storage';
import { DEFAULT_SKINS_STATE, withSelected, withUnlocked } from '../utils/skins';

/**
 * 막대병 보유·장착 상태 — 홈 히어로와 도감이 함께 본다.
 *
 * 홈 탭은 포커스가 그대로라 `useFocusEffect` 만으로는 도감에서 바꾼 걸 다시
 * 읽지 않는다. 그래서 컨텍스트로 둔다.
 *
 * select/unlock/markDexSeen 은 저장에 실패하면 **던진다** — 호출부가 guardSave 로
 * 감싼다. 상태는 저장이 성공한 뒤에만 바뀐다 (광고 보상이 화면에만 있고 저장은
 * 안 된 상태를 만들지 않는다).
 */
const SkinContext = createContext({
  ...DEFAULT_SKINS_STATE,
  ready: false,
  select: async () => {},
  unlock: async () => {},
  unlockAndSelect: async () => {},
  markDexSeen: async () => {},
  reload: async () => {},
});

export function SkinProvider({ children }) {
  const [state, setState] = useState(DEFAULT_SKINS_STATE);
  const [ready, setReady] = useState(false);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    let alive = true;
    loadSkins().then((s) => {
      if (!alive) return;
      ref.current = s;
      setState(s);
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  const commit = useCallback(async (next) => {
    const saved = await saveSkins(next);   // 실패하면 여기서 던진다
    ref.current = saved;
    setState(saved);
    return saved;
  }, []);

  const select = useCallback((id) => commit(withSelected(ref.current, id)), [commit]);
  const unlock = useCallback((id) => commit(withUnlocked(ref.current, id)), [commit]);
  const unlockAndSelect = useCallback(
    (id) => commit(withSelected(withUnlocked(ref.current, id), id)),
    [commit]
  );
  const markDexSeen = useCallback(
    () => (ref.current.dexSeen ? Promise.resolve(ref.current) : commit({ ...ref.current, dexSeen: true })),
    [commit]
  );

  /** 백업 복원 직후 */
  const reload = useCallback(async () => {
    const s = await loadSkins();
    ref.current = s;
    setState(s);
  }, []);

  const value = useMemo(
    () => ({ ...state, ready, select, unlock, unlockAndSelect, markDexSeen, reload }),
    [state, ready, select, unlock, unlockAndSelect, markDexSeen, reload]
  );

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkins() {
  return useContext(SkinContext);
}
