import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolate,
  useAnimatedStyle,
  Extrapolation,
} from 'react-native-reanimated';
import { useThemeColors } from '../../theme/ThemeContext';
import { space as sp, type as ty } from '../../theme/tokens';
import MenuButton from '../MenuButton';

/**
 * 화면 상단 바.
 *
 * 11개 화면이 각자 손으로 그리던 topRow 를 대체한다. 로드맵 빈 상태에서
 * 제목이 x=0 에 딱 붙던 버그는 "빈 상태만 패딩 있는 ScrollView 밖에서
 * 그려져서" 생긴 건데, 이제 모든 상태가 같은 컴포넌트를 지나므로
 * 구조적으로 재발할 수 없다.
 *
 * @param scrollY  Reanimated SharedValue — 주면 스크롤에 따라 제목이 줄고
 *                 아래 헤어라인이 서서히 나타난다
 */
export default function AppHeader({
  title,
  subtitle,
  icon,
  navigation,
  current,
  menu = true,
  right,
  left,
  scrollY,
  collapsible = false,
  style,
}) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);

  const titleStyle = useAnimatedStyle(() => {
    if (!collapsible || !scrollY) return {};
    const s = interpolate(scrollY.value, [0, 60], [1, 0.86], Extrapolation.CLAMP);
    const y = interpolate(scrollY.value, [0, 60], [0, -4], Extrapolation.CLAMP);
    return { transform: [{ scale: s }, { translateY: y }] };
  });

  const ruleStyle = useAnimatedStyle(() => {
    if (!collapsible || !scrollY) return { opacity: 0 };
    return {
      opacity: interpolate(scrollY.value, [8, 40], [0, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        {left}

        <Animated.View style={[styles.titleWrap, titleStyle]}>
          <View style={styles.titleRow}>
            {icon ? <Ionicons name={icon} size={22} color={tc.primary} /> : null}
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </Animated.View>

        <View style={styles.actions}>
          {right}
          {menu ? <MenuButton navigation={navigation} current={current} /> : null}
        </View>
      </View>

      <Animated.View style={[styles.rule, { backgroundColor: tc.border }, ruleStyle]} />
    </View>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    wrap: { backgroundColor: 'transparent' },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      paddingHorizontal: sp.lg,
      gap: sp.md,
    },
    titleWrap: { flex: 1, transformOrigin: 'left center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
    title: { ...ty.title, color: tc.text, flexShrink: 1 },
    subtitle: { ...ty.caption, color: tc.textSecondary, marginTop: 1 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    rule: { height: StyleSheet.hairlineWidth, width: '100%' },
  });
