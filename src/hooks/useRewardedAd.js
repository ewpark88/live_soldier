import { useCallback, useEffect, useState } from 'react';
import {
  getRewardedStatus,
  preloadRewarded,
  retryRewarded,
  setRewardedArmed,
  showRewarded,
  subscribeRewarded,
} from '../utils/rewardedManager';

/**
 * 보상형 전면광고 훅 — 막대병 도감 전용.
 *
 *   const { status, show, retry } = useRewardedAd(isFocused);
 *
 * `armed` 가 true 인 동안(도감이 보일 때)만 로드한다. 보이지 않는 광고는 요청하지 않는다.
 * status: 'unavailable' | 'idle' | 'loading' | 'ready' | 'showing' | 'failed'
 */
export default function useRewardedAd(armed = false) {
  const [status, setStatus] = useState(getRewardedStatus);

  useEffect(() => subscribeRewarded(setStatus), []);

  useEffect(() => {
    if (!armed) return undefined;
    setRewardedArmed(true);
    preloadRewarded();
    setStatus(getRewardedStatus());
    return () => setRewardedArmed(false);
  }, [armed]);

  const show = useCallback(() => showRewarded(), []);
  const retry = useCallback(() => retryRewarded(), []);

  return { status, show, retry };
}
