import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../theme/ThemeContext';
import { space as sp } from '../../theme/tokens';
import AdBanner from '../AdBanner';
import { getAdUnitId } from '../../constants/adUnits';

/**
 * 광고 푸터 — <Screen ad={...}> 이 알아서 그린다. 화면이 직접 쓸 일은 없다.
 *
 * 예전엔 배경이 tc.card + borderTop 1px 이라, 탭바(역시 card + borderTop)와
 * 나란히 붙어 하단에 두 겹짜리 흰 띠가 생겼다. 배경을 화면색으로 낮추고
 * 헤어라인 한 줄만 남긴다.
 *
 * 그림자도 없다 — 탭바가 이미 elevation:8 을 갖고 있어서, 둘이 겹치면
 * 얼룩처럼 보인다.
 *
 * insets.bottom 패딩도 주지 않는다. 아래에 탭바가 깔려 있고 safe area 는
 * 탭바가 책임진다.
 *
 * 단 스택으로 띄운 화면(<Screen standalone>)엔 탭바가 없다. 그땐 safeBottom
 * 으로 제스처 바만큼 띄워야 배너 아래가 잘리지 않는다.
 */
export default function AdFooter({ unit, safeBottom = false }) {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  if (!getAdUnitId(unit, 'banner')) return null;

  return (
    <View
      style={[
        styles.footer,
        { backgroundColor: tc.background, borderTopColor: tc.border },
        safeBottom && { paddingBottom: insets.bottom + sp.xs },
      ]}
    >
      <AdBanner unit={unit} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: sp.lg,
    paddingTop: sp.sm,
    paddingBottom: sp.xs,
  },
});
