import { useEffect, useRef } from 'react';

/**
 * 앱 내부 신호 — 화면 사이에 '무언가 바뀌었다'를 알린다. (라이브러리 없음)
 *
 *   profiles  : 프로필이 추가·전환·복원됐다. 홈은 탭 포커스가 그대로라
 *               useFocusEffect 가 다시 돌지 않는다 — 이 신호로 다시 읽는다.
 *   shareImport : 공유 코드 가져오기 시트를 연다. payload = 코드 문자열 | null
 *               (딥링크·QR·프로필 바의 '코드로 추가'가 모두 이 한 경로로 모인다)
 */
const listeners = { profiles: new Set(), shareImport: new Set() };
let pendingImport;   // 시트가 마운트되기 전에 들어온 딥링크 (콜드 스타트)

export function emitProfilesChanged() {
  listeners.profiles.forEach((cb) => { try { cb(); } catch (e) {} });
}

export function requestShareImport(code = null) {
  if (listeners.shareImport.size === 0) { pendingImport = code; return; }
  listeners.shareImport.forEach((cb) => { try { cb(code); } catch (e) {} });
}

function useEvent(name, cb) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const fn = (arg) => ref.current && ref.current(arg);
    listeners[name].add(fn);
    if (name === 'shareImport' && pendingImport !== undefined) {
      const code = pendingImport;
      pendingImport = undefined;
      fn(code);
    }
    return () => { listeners[name].delete(fn); };
  }, [name]);
}

export const useProfilesChanged = (cb) => useEvent('profiles', cb);
export const useShareImportRequest = (cb) => useEvent('shareImport', cb);
