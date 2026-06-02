import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';

// Expo Go에서는 네이티브 모듈 없음 → 플레이스홀더로 대체
let BannerAd = null;
let BannerAdSize = null;

try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
} catch (e) {
  // Expo Go 환경 → 플레이스홀더 사용
}

/**
 * AdMob 배너 광고 컴포넌트
 * - 개발 빌드(expo run:android) : 실제 AdMob 광고 표시
 * - Expo Go : 플레이스홀더 표시
 */
export default function AdBanner({ unit, style }) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  if (!unit?.realId) return null;

  // 실제 AdMob 광고 (개발 빌드 / 릴리즈 빌드)
  if (BannerAd && BannerAdSize) {
    return (
      <View style={[styles.wrapper, style]}>
        <Text style={styles.adTag}>광고</Text>
        <BannerAd
          unitId={unit.realId}
          size={BannerAdSize.BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
          onAdFailedToLoad={(error) =>
            console.warn(`[AdBanner] ${unit.id} 실패:`, error.message)
          }
        />
      </View>
    );
  }

  // Expo Go 플레이스홀더
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.adTag}>광고</Text>
      <View style={styles.placeholderBox}>
        <Text style={styles.placeholderIcon}>📢</Text>
        <View>
          <Text style={styles.placeholderText}>배너 광고</Text>
          <Text style={styles.placeholderUnit}>{unit.label}</Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  wrapper: {
    marginVertical: 8,
    alignItems: 'center',
  },
  adTag: {
    fontSize: 10,
    color: tc.textLight,
    alignSelf: 'flex-start',
    marginBottom: 3,
    marginLeft: 2,
  },
  placeholder: {
    marginVertical: 8,
  },
  placeholderBox: {
    height: 62,
    backgroundColor: tc.adBackground,
    borderWidth: 1,
    borderColor: tc.adBorder,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  placeholderIcon: {
    fontSize: 20,
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '600',
    color: tc.textSecondary,
  },
  placeholderUnit: {
    fontSize: 11,
    color: tc.textLight,
    marginTop: 2,
  },
});
