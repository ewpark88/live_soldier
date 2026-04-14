import { useEffect, useRef } from 'react';
import { AD_UNITS } from '../constants/adUnits';

// Expo Go에서는 네이티브 모듈 없음 → 스킵
let InterstitialAd = null;
let AdEventType = null;

try {
  const ads = require('react-native-google-mobile-ads');
  InterstitialAd = ads.InterstitialAd;
  AdEventType = ads.AdEventType;
} catch (e) {
  // Expo Go 환경 → 전면 광고 비활성화
}

// 전면 광고 인스턴스 (네이티브 모듈 있을 때만 생성)
const interstitial =
  InterstitialAd && AdEventType
    ? InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL_TAB.realId, {
        requestNonPersonalizedAdsOnly: false,
      })
    : null;

/**
 * AdMob 전면 광고 컴포넌트
 * - 개발 빌드 : 실제 전면 광고 표시
 * - Expo Go  : 광고 없이 onClose 바로 호출 (스킵)
 */
export default function AdInterstitial({ visible, onClose }) {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!interstitial) return; // Expo Go → 아무것도 안 함

    const unsubLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => { loadedRef.current = true; }
    );
    const unsubClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        loadedRef.current = false;
        onClose && onClose();
        interstitial.load(); // 다음 광고 미리 로드
      }
    );
    const unsubError = interstitial.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.warn('[AdInterstitial] 로드 실패:', error.message);
        loadedRef.current = false;
        onClose && onClose();
      }
    );

    interstitial.load();

    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    if (!interstitial) {
      // Expo Go → 광고 없이 바로 통과
      onClose && onClose();
      return;
    }

    if (loadedRef.current) {
      interstitial.show();
    } else {
      onClose && onClose(); // 아직 로드 안 됐으면 스킵
    }
  }, [visible]);

  return null;
}
