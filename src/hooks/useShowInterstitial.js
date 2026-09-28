import { useCallback, useEffect, useRef } from 'react';
import { showInterstitial, preloadInterstitial } from '../utils/adManager';

/**
 * 전면광고 훅.
 *
 * 인스턴스와 이벤트 처리는 adManager 가 전담한다 — 화면에 렌더링할 컴포넌트가
 * 없으므로 JSX 에 아무것도 넣지 않는다.
 *
 *   const { show: showAd } = useShowInterstitial(modalOpen);
 *   ... 저장/추가 등 주요 동작을 마친 뒤 showAd();
 *
 * `armed` — 저장 폼/모달이 열려 있는 동안 true. 그 순간에만 프리로드한다.
 * 마운트 시 무조건 로드하면 저장을 안 하는 대다수 세션에서 광고를 받아놓고
 * 버리게 되고, AdMob 에는 '일치했지만 노출 안 됨' 으로 잡혀 노출률이 떨어진다.
 * 폼을 열고 저장을 누르기까지 보통 수 초~수십 초라 로드 시간은 충분하다.
 */
export default function useShowInterstitial(armed = false) {
  const inFlight = useRef(false);

  useEffect(() => { if (armed) preloadInterstitial(); }, [armed]);

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
