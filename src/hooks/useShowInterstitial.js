import { useCallback, useEffect, useRef } from 'react';
import { showInterstitial, preloadInterstitial } from '../utils/adManager';

/**
 * 전면광고 훅.
 *
 * 인스턴스와 이벤트 처리는 adManager 가 전담한다 — 화면에 렌더링할 컴포넌트가
 * 없으므로 JSX 에 아무것도 넣지 않는다.
 *
 *   const { show: showAd } = useShowInterstitial();
 *   ... 저장/추가 등 주요 동작을 마친 뒤 showAd();
 */
export default function useShowInterstitial() {
  const inFlight = useRef(false);

  useEffect(() => { preloadInterstitial(); }, []);

  const show = useCallback(async () => {
    if (inFlight.current) return false;   // 중복 호출 방지
    inFlight.current = true;
    try {
      return await showInterstitial();
    } finally {
      inFlight.current = false;
    }
  }, []);

  return { show };
}
