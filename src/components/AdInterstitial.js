import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { AD_UNITS } from '../constants/adUnits';

/**
 * 구글 정책 준수 전면 광고 Placeholder
 * - 닫기 버튼은 항상 즉시 표시 (구글 정책: 5초 딜레이 금지)
 * - 광고임을 명확히 표시
 * - 자연스러운 전환 시점에만 표시
 *
 * 실제 AdMob 연동 시:
 *   import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
 *   const ad = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL_TAB.realId);
 */
export default function AdInterstitial({ visible, onClose }) {
  const unit = AD_UNITS.INTERSTITIAL_TAB;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => onClose && onClose());
  };

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.container}>
          {/* 구글 정책: 닫기 버튼 항상 즉시 표시 */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* 광고 레이블 명시 (구글 정책 필수) */}
          <Text style={styles.adLabel}>광고</Text>

          <View style={styles.adBox}>
            <Text style={styles.adEmoji}>📢</Text>
            <Text style={styles.adTitle}>전면 광고 영역</Text>
            <Text style={styles.adSubText}>
              {unit.label}{'\n'}AdMob Interstitial
            </Text>
            <Text style={styles.adUnitId}>#{unit.id}</Text>
          </View>

          <TouchableOpacity style={styles.dismissBtn} onPress={handleClose}>
            <Text style={styles.dismissBtnText}>광고 닫기</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: 14,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  adLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
  },
  adBox: {
    width: '100%',
    backgroundColor: COLORS.adBackground,
    borderRadius: 16,
    paddingVertical: 52,
    alignItems: 'center',
    gap: 10,
  },
  adEmoji: {
    fontSize: 44,
  },
  adTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  adSubText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  adUnitId: {
    fontSize: 10,
    color: COLORS.adBorder,
    marginTop: 6,
    fontFamily: 'monospace',
  },
  dismissBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 48,
    paddingVertical: 15,
    borderRadius: 30,
  },
  dismissBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
