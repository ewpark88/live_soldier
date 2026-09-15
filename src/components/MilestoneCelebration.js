import React, { useEffect, useMemo } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  FadeIn, useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import EmberField from './motion/EmberField';
import { HeroCard, Button, Txt } from './ui';
import { useThemeColors } from '../theme/ThemeContext';
import { useMotion } from '../hooks/useMotion';
import { haptic } from '../utils/haptics';
import { getPhase, PHASE_META } from '../constants/phases';
import { formatDateKo } from '../utils/dateUtils';
import { motion, radius as r, space as sp } from '../theme/tokens';

/**
 * 마일스톤 축하 오버레이.
 *
 * 쇼피스 모션은 정확히 1개다 — 아이콘 원의 celebrate 스프링.
 * tokens.js 가 그 스프링에 대해 "일회성만, 루프 금지"라고 적어둔 바로 그 용도다.
 *
 * m.reduced 처리: 움직임만 뺀다. 모달 자체는 그대로 띄운다 — 동작 줄이기를 켠
 * 사용자도 그 순간을 누릴 자격이 있다.
 *
 * 이 컴포넌트는 앱 전체에서 정확히 한 번만 마운트된다 (TabNavigator).
 * 화면별로 마운트하면 탭 전환마다 이중 발화한다.
 */
export default function MilestoneCelebration({
  visible, milestone, unlockedTheme, daysLeft = 0, onShare, onClose,
}) {
  const tc = useThemeColors();
  const m = useMotion();
  const nav = useNavigation();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const scale = useSharedValue(0);

  useEffect(() => {
    if (!visible) { scale.value = 0; return; }
    haptic.success();
    scale.value = m.reduced ? 1 : withSpring(1, m.spring('celebrate'));
  }, [visible, m.reduced]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!visible || !milestone) return null;

  const stage = getPhase(daysLeft);
  const ph = tc.phase[stage];
  const meta = PHASE_META[stage];

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={m.enter(FadeIn, 0, motion.duration.base)}
        style={[s.backdrop, { backgroundColor: tc.scrimStrong }]}
      >
        <View style={s.center}>
          <HeroCard gradient={ph.gradient} radiusKey="xl" sheen style={s.card}>
            {/* EmberField 는 반드시 overflow:'hidden' 부모 안에 — HeroCard 가 보장한다 */}
            <EmberField density="dense" color={ph.accent} rise={220} />

            <Animated.View style={[s.iconWrap, { backgroundColor: ph.accent }, iconStyle]}>
              <Ionicons name={milestone.icon ?? 'trophy'} size={34} color={tc.onGold} />
            </Animated.View>

            <Txt role="label" tone="heroMuted" style={s.eyebrow}>마일스톤 달성</Txt>
            <Txt role="title" tone="hero" style={s.title}>{milestone.label}</Txt>
            <Txt role="caption" tone="heroMuted">{formatDateKo(milestone.date)}</Txt>

            <Txt role="body" tone="hero" style={s.copy}>
              {meta.text ?? '여기까지 온 것만으로 충분히 대단해요.'}
            </Txt>

            {unlockedTheme ? (
              <View style={[s.unlock, { borderColor: tc.heroBorder }]}>
                <Ionicons name="color-palette" size={16} color={ph.accent} />
                <Txt role="bodySm" tone="hero" style={{ flex: 1 }}>
                  새 테마 <Txt role="bodySm" style={{ color: ph.accent, fontWeight: '800' }}>{unlockedTheme.name}</Txt> 해금!
                </Txt>
              </View>
            ) : null}

            <View style={s.actions}>
              <Button title="자랑하기" icon="share-social" onPress={onShare} full />
              {unlockedTheme ? (
                <Button
                  title="테마 보러가기"
                  variant="accent"
                  icon="color-palette-outline"
                  onPress={() => { onClose(); nav.navigate('theme'); }}
                  full
                />
              ) : null}
              <Button title="닫기" variant="ghost" onPress={onClose} full />
            </View>
          </HeroCard>
        </View>
      </Animated.View>
    </Modal>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    backdrop: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', paddingHorizontal: sp.xl },
    card: { alignItems: 'center' },

    iconWrap: {
      width: 68, height: 68, borderRadius: 34,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: sp.lg,
    },
    eyebrow: { letterSpacing: 2 },
    title: { marginTop: sp.xs, textAlign: 'center' },
    copy: { marginTop: sp.lg, textAlign: 'center' },

    unlock: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.sm,
      marginTop: sp.lg,
      paddingVertical: sp.sm,
      paddingHorizontal: sp.md,
      borderRadius: r.md,
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: tc.heroSheen,
    },

    actions: { alignSelf: 'stretch', gap: sp.sm, marginTop: sp.xl },
  });
