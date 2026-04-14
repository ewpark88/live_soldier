import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

/**
 * 배너 광고 Placeholder
 *
 * @param {object} unit  - adUnits.js 에서 가져온 AD_UNITS.XXX 객체
 *                         (id, label, testId 포함)
 * @param {object} style - 추가 스타일
 *
 * 실제 AdMob 연동 시:
 *   import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
 *   <BannerAd unitId={unit.realId ?? unit.testId} size={BannerAdSize.BANNER} />
 */
export default function AdBanner({ unit, style }) {
  const label = unit?.label ?? '광고';
  const unitId = unit?.id ?? 'unknown';

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.adTag}>광고</Text>
      <View style={styles.container}>
        <View style={styles.inner}>
          <Text style={styles.icon}>📢</Text>
          <View>
            <Text style={styles.mainText}>배너 광고</Text>
            <Text style={styles.unitText}>{label}</Text>
          </View>
        </View>
        <Text style={styles.unitId}>#{unitId}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  adTag: {
    fontSize: 10,
    color: COLORS.textLight,
    marginBottom: 3,
    marginLeft: 2,
  },
  container: {
    height: 62,
    backgroundColor: COLORS.adBackground,
    borderWidth: 1,
    borderColor: COLORS.adBorder,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    fontSize: 20,
  },
  mainText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  unitText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  unitId: {
    fontSize: 10,
    color: COLORS.adBorder,
    fontFamily: 'monospace' ,
  },
});
