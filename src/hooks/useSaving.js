import { useCallback, useRef, useState } from 'react';

/**
 * 저장 연타 방지 — 같은 기록이 두 건 들어가거나 전면광고·햅틱이 두 번 도는 것을 막는다.
 *
 *   const { saving, savingRef, run } = useSaving();
 *   const next = await run(() => guardSave(() => addTodo(rec)));
 *
 * - ref 는 같은 프레임의 두 번째 탭까지 막고, `saving` state 는 버튼 로딩 표시용이다.
 * - 이미 저장 중이면 run 은 fn 을 부르지 않고 undefined 를 돌려준다.
 * - `savingRef.current` 로 '저장 중엔 시트 닫기 금지' 같은 판단을 한다.
 *
 * 예전엔 휴가·일정·급여·전역 정보 화면이 같은 ref+state 쌍을 각자 복사해 갖고 있었다.
 */
export function useSaving() {
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const run = useCallback(async (fn) => {
    if (savingRef.current) return undefined;
    savingRef.current = true;
    setSaving(true);
    try {
      return await fn();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, []);

  return { saving, savingRef, run };
}
