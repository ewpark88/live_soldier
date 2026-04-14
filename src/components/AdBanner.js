import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { COLORS } from '../constants/colors';

/**
 * AdMob 배너 광고 컴포넌트
 * @param {object} unit  - AD_UNITS.XXX (realId 포함)
 * @param {object} style - 추가 스타일
 */
export default function AdBanner({ unit, style }) {
  if (!unit?.realId) return null;

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.adTag}>광고</Text>
      <BannerAd
        unitId={unit.realId}
        size={BannerAdSize.BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdFailedToLoad={(error) => {
          console.warn(`[AdBanner] ${unit.id} 로드 실패:`, error.message);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
    alignItems: 'center',
  },
  adTag: {
    fontSize: 10,
    color: COLORS.textLight,
    alignSelf: 'flex-start',
    marginBottom: 3,
    marginLeft: 2,
  },
});
