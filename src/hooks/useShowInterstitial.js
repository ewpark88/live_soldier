import { useState } from 'react';
import { canShowInterstitial, recordAdShown } from '../utils/adManager';

/**
 * 전면광고 훅
 * - show()  : 빈도 조건 충족 시 광고 표시
 * - adVisible, handleClose : AdInterstitial 컴포넌트에 전달
 */
export default function useShowInterstitial() {
  const [adVisible, setAdVisible] = useState(false);

  const show = async () => {
    const ok = await canShowInterstitial();
    if (!ok) return;
    await recordAdShown();   // 카운트 선점 (중복 방지)
    setAdVisible(true);
  };

  const handleClose = () => {
    setAdVisible(false);
  };

  return { adVisible, show, handleClose };
}
