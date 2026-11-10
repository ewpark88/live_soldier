import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
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

  /* 첫 로드가 끝나기 전에 commit 하면 기본값(무료 1종)을 저장해 광고로 얻은 걸
     지운다. 모든 변경은 첫 로드 → 이전 변경 순서로 줄 세운다 (chain). */
  const chain = useRef(null);
  if (chain.current == null) {
    chain.current = loadSkins()
      .catch(() => DEFAULT_SKINS_STATE)
      .then((s) => {
        ref.current = s;
        setState(s);
        setReady(true);
      });
  }

  /* fn(현재 상태) → 다음 상태. 실패하면 호출자에게 던지되 줄은 끊지 않는다. */
  const commit = useCallback((fn) => {
    const run = chain.current.then(async () => {
      const cur = ref.current;
      const next = fn(cur);
      if (next === cur) return cur;
      const saved = await saveSkins(next);   // 실패하면 여기서 던진다
      ref.current = saved;
      setState(saved);
      return saved;
    });
    chain.current = run.catch(() => {});
    return run;
  }, []);

  const select = useCallback((id) => commit((s) => withSelected(s, id)), [commit]);
  const unlock = useCallback((id) => commit((s) => withUnlocked(s, id)), [commit]);
  const unlockAndSelect = useCallback(
    (id) => commit((s) => withSelected(withUnlocked(s, id), id)),
    [commit]
  );
  const markDexSeen = useCallback(
    () => commit((s) => (s.dexSeen ? s : { ...s, dexSeen: true })),
    [commit]
  );

  /** 백업 복원 직후 */
  const reload = useCallback(() => {
    const run = chain.current.then(async () => {
      const s = await loadSkins();
      ref.current = s;
      setState(s);
    });
    chain.current = run.catch(() => {});
    return run;
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
