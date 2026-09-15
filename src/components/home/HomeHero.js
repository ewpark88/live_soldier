import React, { useMemo } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiveServiceGauge from '../LiveServiceGauge';
import ProfileBar from '../ProfileBar';
import StreakBadge from '../StreakBadge';
import EmberField from '../motion/EmberField';
import { HeroCard, Chip, StatTile, Txt, AnimatedNumber, PressScale } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { useMotion } from '../../hooks/useMotion';
import { formatDateKo } from '../../utils/dateUtils';
import { motion, radius as r, space as sp, type as ty } from '../../theme/tokens';

/**
 * 홈 히어로 — 첫 화면을 통째로 차지한다.
 *
 * v1.0.8 은 히어로와 월간 캘린더를 한 화면에 욱여넣느라 D-Day 가 주인공이 되지
 * 못했다. 이제 캘린더는 캘린더 탭이 갖고, 여기서는 fold(첫 화면) 전체를 쓴다.
 * minHeight 를 화면 높이의 62% 로 잡아 짧은 기기(360×640)에서도 "첫 화면 =
 * 히어로" 계약이 유지된다.
 *
 * ⚠️ D-Day 블록은 <Section entering> 안에 두지 않는다. replayKey 로 리마운트되기
 *    때문에, 감싸면 탭할 때마다 페이드가 같이 재생된다.
 */
export default function HomeHero({
  info,
  rank,
  crest,
  daysLeft,
  servedDays,
  leaveLeft,
  months,
  promo,
  cfg,          // tc.phase[stage] — { gradient, accent, glow }
  meta,         // PHASE_META[stage] — { icon, text, embers }
  angle = 'diagonal',
  streak,       // { count, tier }
  replayKey,
  onTapDday,
  onShare,
  onReloadProfiles,
  onPressStreak,
  onPressPromo,
  onPressLeave,
}) {
  const tc = useThemeColors();
  const m = useMotion();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const ddayText = daysLeft > 0 ? null : daysLeft === 0 ? 'D-Day!' : '전역 완료!';

  return (
    <HeroCard
      fullBleed
      gradient={cfg.gradient}
      angle={angle}
      /* 불티가 뜨는 단계에선 sheen 을 끈다 — 무한 루프 예산(§4)도 아끼고,
         어차피 둘이 같은 영역에서 서로를 잡아먹어 지저분해진다. */
      sheen={!meta.embers}
      contentStyle={[s.pad, { paddingTop: insets.top + sp.sm }]}
      style={[s.hero, { minHeight: Math.round(height * 0.62) }]}
    >
      <EmberField density={meta.embers} color={cfg.accent} />

      <View style={s.topRow}>
        <View style={{ flex: 1 }}>
          <ProfileBar onChange={onReloadProfiles} onDark />
        </View>
        <StreakBadge
          count={streak?.count ?? 0}
          tier={streak?.tier}
          onHero
          onPress={onPressStreak}
        />
      </View>

      {meta.text ? (
        <Animated.View entering={m.enter(FadeIn, 0, motion.duration.slow)}>
          <Chip label={meta.text} icon={meta.icon} tone="accent" style={s.milestone} />
        </Animated.View>
      ) : null}

      <View style={s.main}>
        <View style={{ flex: 1 }}>
          <Txt role="label" tone="heroMuted" style={s.eyebrow}>전역까지</Txt>

          <PressScale onPress={onTapDday} haptic={null} style={s.ddayTap}>
            {ddayText ? (
              <Txt
                role="hero"
                style={[
                  { color: cfg.accent },
                  cfg.glow && s.glow,
                  cfg.glow && { textShadowColor: cfg.accent },
                ]}
              >
                {ddayText}
              </Txt>
            ) : (
              <View style={s.ddayRow}>
                <Txt role="subtitle" tone="heroMuted">D-</Txt>
                <AnimatedNumber
                  value={daysLeft}
                  replayKey={replayKey}
                  style={[
                    ty.display,
                    { color: cfg.accent },
                    cfg.glow && s.glow,
                    cfg.glow && { textShadowColor: cfg.accent },
                  ]}
                />
              </View>
            )}
          </PressScale>

          <View style={s.dateRow}>
            <Txt role="caption" tone="heroMuted">{formatDateKo(info.dischargeDate)}</Txt>
            <PressScale
              onPress={onShare}
              haptic="light"
              style={s.shareBtn}
              accessibilityLabel="전역일 공유"
            >
              <Ionicons name="share-social" size={15} color={tc.heroText} />
              <Txt role="micro" tone="hero">자랑하기</Txt>
            </PressScale>
          </View>
        </View>

        {/* 계급장 */}
        <View style={s.crestWrap}>
          {cfg.glow ? <View style={[s.crestGlow, { backgroundColor: cfg.accent }]} /> : null}
          {crest ? (
            <Image source={crest} style={s.crest} resizeMode="contain" />
          ) : (
            <Ionicons
              name={info.personnelType === 'officer' ? 'star' : 'ribbon'}
              size={36}
              color={cfg.accent}
            />
          )}
          <Txt role="caption" tone="hero" style={{ fontWeight: '700' }}>{rank}</Txt>
        </View>
      </View>

      <View style={s.gauge}>
        <LiveServiceGauge
          enlistDate={info.enlistDate}
          dischargeDate={info.dischargeDate}
          fillColor={cfg.accent}
        />
      </View>

      <View style={s.statRow}>
        <StatTile label="복무 일수" value={servedDays} unit="일" onHero countUp />
        <StatTile label="남은 휴가" value={leaveLeft} unit="일" onHero countUp onPress={onPressLeave} />
        {promo ? (
          <StatTile
            label={`다음 진급 · ${promo.rank}`}
            value={`D-${promo.daysLeft}`}
            onHero
            onPress={onPressPromo}
          />
        ) : (
          <StatTile label="복무 개월" value={months} unit="개월" onHero countUp />
        )}
      </View>
    </HeroCard>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    hero: { justifyContent: 'space-between' },
    pad: { paddingHorizontal: sp.lg, paddingBottom: sp.xl },

    topRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    milestone: { alignSelf: 'flex-start', marginTop: sp.md },

    main: { flexDirection: 'row', alignItems: 'center', gap: sp.md, marginTop: sp.lg },
    eyebrow: { letterSpacing: 2 },
    ddayTap: { alignSelf: 'flex-start' },
    ddayRow: { flexDirection: 'row', alignItems: 'baseline', gap: sp.xxs },
    glow: { textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },

    dateRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md, marginTop: sp.xs },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.xs,
      paddingVertical: sp.xs,
      paddingHorizontal: sp.sm,
      borderRadius: r.pill,
      backgroundColor: tc.heroSheen,
    },

    crestWrap: { alignItems: 'center', gap: sp.xs, width: 72 },
    crest: { width: 56, height: 56 },
    crestGlow: {
      position: 'absolute',
      top: 4,
      width: 48,
      height: 48,
      borderRadius: 24,
      opacity: 0.28,
    },

    gauge: { marginTop: sp.lg },
    statRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
  });
