import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { radius as r, space as sp, tabular, type as ty } from '../theme/tokens';

/**
 * 테마 미리보기 카드.
 *
 * ⚠️ 이 컴포넌트는 useThemeColors() 를 부르지 않고 Txt/Chip/StatTile/HeroCard 도
 *    쓰지 않는다. 그것들은 전부 "현재 활성 테마"를 해석하기 때문에, 그대로 쓰면
 *    카드 8장이 전부 같은 색으로 나온다. 색은 오직 prop 으로 받은 palette 에서만
 *    나온다. 생 View/Text/LinearGradient + 토큰만 쓴다.
 *
 * ⚠️ 애니메이션 0개. HeroCard 를 쓰면 sheen 무한 루프가 카드 수만큼 늘어나
 *    "무한 루프는 히어로 안에서만, 최대 2개" 규칙을 정면으로 어긴다.
 *    (안의 진행 바는 정적이므로 width:'%' 를 써도 된다 — 금지 규칙은
 *     *애니메이션* 폭에만 적용된다.)
 */
export default function ThemePreviewCard({
  palette: p,
  name,
  desc,
  badge,
  locked = false,
  lockLabel,
  selected = false,
  onPress,
}) {
  const stage = p.phase.normal;
  const grad = stage.gradient;

  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: locked }}
      accessibilityLabel={`${name}${locked ? ` (${lockLabel ?? '잠김'})` : ''}`}
      style={[
        styles.card,
        { backgroundColor: p.card, borderColor: selected ? p.primary : p.border },
        selected && styles.cardSelected,
        locked && styles.cardLocked,
      ]}
    >
      {/* 히어로 미니 */}
      <View style={styles.hero}>
        <LinearGradient
          colors={grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={[styles.dday, tabular, { color: stage.accent }]}>D-123</Text>
        <View style={[styles.track, { backgroundColor: p.heroTrack }]}>
          <View style={[styles.fill, { backgroundColor: stage.accent }]} />
        </View>
      </View>

      {/* 탭바 + 스와치 미니 */}
      <View style={styles.foot}>
        <View style={styles.dots}>
          <View style={[styles.dot, { backgroundColor: p.tabActive }]} />
          <View style={[styles.dot, { backgroundColor: p.tabInactive }]} />
          <View style={[styles.dot, { backgroundColor: p.tabInactive }]} />
        </View>
        <View style={styles.dots}>
          <View style={[styles.swatch, { backgroundColor: p.primary }]} />
          <View style={[styles.swatch, { backgroundColor: p.accent }]} />
        </View>
      </View>

      {/* 이름 */}
      <View style={styles.meta}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: p.text }]} numberOfLines={1}>{name}</Text>
          {selected ? (
            <Ionicons name="checkmark-circle" size={17} color={p.primary} />
          ) : null}
        </View>
        <Text style={[styles.desc, { color: p.textSecondary }]} numberOfLines={1}>
          {locked ? (lockLabel ?? '잠김') : desc}
        </Text>
      </View>

      {/* 배지 */}
      {badge ? (
        <View style={[styles.badge, { backgroundColor: p.surfaceSunken, borderColor: p.border }]}>
          <Ionicons name="moon" size={9} color={p.textSecondary} />
          <Text style={[styles.badgeText, { color: p.textSecondary }]}>{badge}</Text>
        </View>
      ) : null}

      {locked ? (
        <View style={styles.lockWrap} pointerEvents="none">
          <View style={[styles.lockChip, { backgroundColor: p.card, borderColor: p.border }]}>
            <Ionicons name="lock-closed" size={13} color={p.textSecondary} />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: r.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardSelected: { borderWidth: 2 },
  // 잠긴 카드도 보여준다 — 안 보이는 보상은 아무도 동기부여하지 않는다
  cardLocked: { opacity: 0.62 },

  hero: {
    height: 74,
    justifyContent: 'flex-end',
    paddingHorizontal: sp.sm,
    paddingBottom: sp.sm,
    overflow: 'hidden',
  },
  dday: { ...ty.subtitle, marginBottom: sp.xs },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', width: '62%', borderRadius: 3 },

  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.sm,
    paddingTop: sp.sm,
  },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  swatch: { width: 10, height: 10, borderRadius: 3 },

  meta: { paddingHorizontal: sp.sm, paddingTop: sp.xs, paddingBottom: sp.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { ...ty.label, flexShrink: 1 },
  desc: { ...ty.micro, marginTop: 1 },

  badge: {
    position: 'absolute',
    top: sp.xs,
    right: sp.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: r.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: { ...ty.micro, fontSize: 9, lineHeight: 12 },

  lockWrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  lockChip: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
