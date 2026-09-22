import React, { useMemo } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiveServiceGauge from '../LiveServiceGauge';
import ProfileBar from '../ProfileBar';
import StreakBadge from '../StreakBadge';
import EmberField from '../motion/EmberField';
import AuroraWash from '../motion/AuroraWash';
import { HeroCard, Chip, StatTile, Txt, AnimatedNumber, PressScale } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { useMotion } from '../../hooks/useMotion';
import { useDaypart } from '../../hooks/useDaypart';
import { formatDateKo } from '../../utils/dateUtils';
import { motion, radius as r, space as sp, type as ty } from '../../theme/tokens';

/**
 * 홈 히어로 — 첫 화면을 통째로 차지한다.
 *
 * v1.2 에서 중심이 **원형 링**으로 바뀌었다. 예전에는 D-Day 가 왼쪽에, 진행률
 * 바가 그 아래에 따로 있어서 "얼마나 왔는지"와 "얼마나 남았는지"가 서로 다른
 * 곳을 보고 있었다. 이제 링이 차오르고 그 한가운데에 D-Day 가 앉는다.
 *
 * 배경은 고정 그라데이션이 아니라 살아 있다 (`AuroraWash`) — 시각에 따라 색이
 * 바뀌고, 복무가 쌓일수록 광원이 또렷해진다.
 *
 * ⚠️ 무한 루프 예산(§4, 히어로 안 최대 2개):
 *      링 선단 맥박 1 + (AuroraWash 광원 1 | EmberField 1 | HeroCard sheen 1)
 *    불티가 뜨는 단계(done/d3)에서는 sheen 을 끄고, AuroraWash 의 광원도
 *    불티에 자리를 내준다. 세 개가 한 화면에서 겹치면 그냥 지저분하다.
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
  progress = 0,   // 0..1 — 배경 광원 세기 (calcProgress 기준)
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
  const { height, width } = useWindowDimensions();
  const daypart = useDaypart();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const ddayText = daysLeft > 0 ? null : daysLeft === 0 ? 'D-Day!' : '전역 완료!';

  /* 링 지름. 좁은 기기(360dp)에서도 네 자리 D-Day 가 안 잘리도록 하한을 둔다.
     **짧은 변** 기준인 이유: 가로 모드(예: 800×360)에서 width 로 재면 링이
     화면 높이보다 커져서 아래가 잘린다. 방향 제한을 걷어낸 뒤로 가로·태블릿이
     실제 경로가 됐다 (AndroidManifest 의 screenOrientation 제거 참고). */
  const shortSide = Math.min(width, height);
  const ring = Math.max(204, Math.min(272, Math.round(shortSide * 0.64)));

  /* 링 안쪽 폭에 맞춰 D-Day 글자 크기를 정한다.
     ty.display(52) 를 고정으로 쓰면 작은 기기 + 네 자리(D-1000)에서 잘린다.
     inner = 지름 − 링 두께 2줄 − 좌우 여백. 숫자 한 자 폭은 대략 0.58em. */
  const digits = Math.max(2, String(Math.abs(daysLeft)).length);
  const inner = ring - 14 * 2 - sp.md * 2;
  const ddaySize = Math.round(
    Math.max(30, Math.min(ty.display.fontSize, (inner - 26) / (digits * 0.58)))
  );
  const ddayStyle = {
    fontSize: ddaySize,
    lineHeight: Math.round(ddaySize * 1.12),
    fontWeight: ty.display.fontWeight,
    letterSpacing: ty.display.letterSpacing,
    includeFontPadding: false,
  };

  return (
    <HeroCard
      fullBleed
      gradient={cfg.gradient}
      angle={angle}
      /* 불티가 뜨는 단계에선 sheen 을 끈다 — 무한 루프 예산(§4)도 아끼고,
         어차피 둘이 같은 영역에서 서로를 잡아먹어 지저분해진다. */
      sheen={!meta.embers}
      contentStyle={[s.pad, { paddingTop: insets.top + sp.sm }]}
      /* "첫 화면 = 히어로" 계약은 세로에서의 약속이다. 가로에서는 높이가
         짧아 어차피 콘텐츠가 더 크므로 minHeight 를 강요하지 않는다. */
      style={[s.hero, width > height ? null : { minHeight: Math.round(height * 0.62) }]}
    >
      <AuroraWash
        daypart={daypart}
        progress={progress}
        /* 불티가 뜨는 단계에서는 광원을 끈다 (루프 예산 + 시각적 충돌) */
        color={meta.embers ? null : cfg.accent}
      />
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

      <View style={[s.ringWrap, { width: ring }]}>
        <LiveServiceGauge
          enlistDate={info.enlistDate}
          dischargeDate={info.dischargeDate}
          fillColor={cfg.accent}
          size={ring}
          stroke={14}
          glow={cfg.glow}
        >
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
                    ddayStyle,
                    { color: cfg.accent },
                    cfg.glow && s.glow,
                    cfg.glow && { textShadowColor: cfg.accent },
                  ]}
                />
              </View>
            )}
          </PressScale>
        </LiveServiceGauge>

        {/* 계급장 — 링의 빈 우상단 모서리에 앉힌다 */}
        <View style={s.crestWrap} pointerEvents="none">
          {cfg.glow ? <View style={[s.crestGlow, { backgroundColor: cfg.accent }]} /> : null}
          {crest ? (
            <Image source={crest} style={s.crest} resizeMode="contain" />
          ) : (
            <Ionicons
              name={info.personnelType === 'officer' ? 'star' : 'ribbon'}
              size={30}
              color={cfg.accent}
            />
          )}
          <Txt role="micro" tone="hero" style={s.rankText}>{rank}</Txt>
        </View>
      </View>

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
    milestone: { alignSelf: 'center', marginTop: sp.md },

    ringWrap: { alignSelf: 'center', marginTop: sp.lg },
    eyebrow: { letterSpacing: 2, textAlign: 'center' },
    ddayTap: { alignSelf: 'center' },
    ddayRow: { flexDirection: 'row', alignItems: 'baseline', gap: sp.xxs },
    glow: { textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },

    crestWrap: { position: 'absolute', top: -2, right: -10, alignItems: 'center', gap: 1, width: 58 },
    crest: { width: 42, height: 42 },
    crestGlow: {
      position: 'absolute',
      top: 2,
      width: 38,
      height: 38,
      borderRadius: 19,
      opacity: 0.28,
    },
    rankText: { fontWeight: '800' },

    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: sp.md,
      marginTop: sp.lg,
    },
    shareBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.xs,
      paddingVertical: sp.xs,
      paddingHorizontal: sp.sm,
      borderRadius: r.pill,
      backgroundColor: tc.heroSheen,
    },

    statRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
  });
