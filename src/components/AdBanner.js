import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../theme/tokens';

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
 * AdMob 배너 광고.
 * - 개발/릴리즈 빌드 : 실제 AdMob 배너
 * - Expo Go          : 플레이스홀더
 *
 * 바깥 여백(marginVertical)은 더 이상 갖지 않는다 — 간격은 AdFooter 가 준다.
 * "광고" 라벨은 AdMob 정책상 유지한다.
 */
export default function AdBanner({ unit, style }) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  if (!unit?.realId) return null;

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

  // Expo Go 플레이스홀더 — 실제 배너와 같은 320x50 규격으로 맞춰둔다.
  // (예전엔 여기만 풀폭 62px 이라 Expo Go 에서 보던 레이아웃과 실제 출시본이 달랐다)
  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.adTag}>광고</Text>
      <View style={styles.placeholderBox}>
        <Ionicons name="megaphone-outline" size={18} color={tc.textSecondary} />
        <View>
          <Text style={styles.placeholderText}>배너 광고</Text>
          <Text style={styles.placeholderUnit}>{unit.label}</Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    wrapper: { alignItems: 'center' },
    adTag: {
      ...ty.micro,
      color: tc.textLight,
      letterSpacing: 0.4,
      alignSelf: 'flex-start',
      marginBottom: sp.xxs,
    },
    placeholderBox: {
      width: 320,
      height: 50,
      backgroundColor: tc.adBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tc.adBorder,
      borderRadius: r.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: sp.md,
      gap: sp.sm,
    },
    placeholderText: { ...ty.bodySm, fontWeight: '600', color: tc.textSecondary },
    placeholderUnit: { ...ty.micro, color: tc.textLight },
  });
