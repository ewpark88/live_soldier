import { useEffect, useRef } from 'react';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { AD_UNITS } from '../constants/adUnits';

/**
 * AdMob 전면 광고 컴포넌트
 * - InterstitialAd가 자체 UI를 처리하므로 Modal 불필요
 * - visible=true 시 광고 로드 후 자동 표시
 * - onClose: 광고 닫힌 뒤 호출
 */

// 앱 실행 시 광고 인스턴스 1회 생성 후 재사용
const interstitial = InterstitialAd.createForAdRequest(
  AD_UNITS.INTERSTITIAL_TAB.realId,
  { requestNonPersonalizedAdsOnly: false }
);

export default function AdInterstitial({ visible, onClose }) {
  const loadedRef = useRef(false);

  useEffect(() => {
    // 광고 로드 완료
    const unsubLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
    });

    // 광고 닫힘 → 콜백 호출 + 다음 광고 미리 로드
    const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      loadedRef.current = false;
      onClose && onClose();
      interstitial.load(); // 다음 전환을 위해 미리 로드
    });

    // 광고 로드 실패
    const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('[AdInterstitial] 로드 실패:', error.message);
      loadedRef.current = false;
      onClose && onClose(); // 광고 없으면 그냥 통과
    });

    // 최초 로드 시작
    interstitial.load();

    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    if (loadedRef.current) {
      interstitial.show();
    } else {
      // 아직 로드 안 됐으면 스킵
      onClose && onClose();
    }
  }, [visible]);

  // 전면광고는 자체 UI → 렌더링 없음
  return null;
}
