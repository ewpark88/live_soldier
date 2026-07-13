import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../../theme/ThemeContext';
import { space as sp } from '../../theme/tokens';
import AdFooter from './AdFooter';

/**
 * 화면 껍데기. 모든 화면은 이걸로 시작한다.
 *
 * 이 하나가 없애는 것들:
 *  - 9개 화면에 흩어져 있던 `paddingTop: insets.top + 10` (값도 제각각이었다)
 *  - 9개 화면의 로컬 adFooter 스타일 + <AdBanner> 호출
 *  - 9개 화면의 `scroll: { padding: 16, paddingBottom: 24 }`
 *
 * 규칙:
 *  - insets.top 은 정확히 한 번만 소비한다. 헤더가 있으면 헤더가, 없으면 본문이.
 *  - 광고 푸터는 ScrollView 의 형제로 아래에 깐다 (absolute 아님).
 *    탭바가 그 아래 깔리므로 하단 safe area 는 탭바가 책임진다.
 *  - 안드로이드가 edge-to-edge 라(gradle.properties: edgeToEdgeEnabled=true)
 *    풀블리드 배경은 상태바 밑까지 그려진다. 그래서 배경이 아니라 "콘텐츠"에만
 *    inset 을 준다.
 *
 * @param header          <AppHeader/> — 스크롤 위에 고정된다
 * @param headerInScroll  true 면 헤더가 콘텐츠와 함께 스크롤돼 올라간다 (홈)
 * @param padded          좌우 16px 거터. false 면 풀블리드 (홈 히어로)
 * @param ad              AD_UNITS.X — 주면 하단 광고 푸터를 그린다
 */
export default function Screen({
  children,
  scroll = true,
  header,
  headerInScroll = false,
  padded = true,
  background,
  ad,
  onScroll,
  scrollRef,
  refreshControl,
  contentContainerStyle,
  style,
}) {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();

  const bg = background || tc.background;

  // 고정 헤더가 있으면 헤더가 상단 inset 을 먹는다. 없으면 콘텐츠가 먹는다.
  const fixedHeader = header && !headerInScroll;
  const contentTop = fixedHeader ? sp.xs : insets.top + sp.sm;

  const content = (
    <>
      {headerInScroll ? header : null}
      {children}
    </>
  );

  const pad = {
    paddingTop: contentTop,
    paddingHorizontal: padded ? sp.lg : 0,
    paddingBottom: sp.xxl,
  };

  return (
    <View style={[styles.root, { backgroundColor: bg }, style]}>
      {fixedHeader ? (
        <View style={{ paddingTop: insets.top }}>{header}</View>
      ) : null}

      {scroll ? (
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[pad, contentContainerStyle]}
        >
          {content}
        </Animated.ScrollView>
      ) : (
        <View style={[styles.root, pad, contentContainerStyle]}>{content}</View>
      )}

      {ad ? <AdFooter unit={ad} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
