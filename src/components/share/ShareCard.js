import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Txt } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp, type as ty, tabular } from '../../theme/tokens';
import { formatDateKo } from '../../utils/dateUtils';
import { getPhase } from '../../constants/phases';

/**
 * 공유용 이미지 카드 — 4:5 (인스타 피드·카톡 미리보기에서 안 잘리는 비율).
 *
 * 화면에 보이는 그대로를 view-shot 으로 찍는다 (utils/shareImage). 그래서:
 *   · 애니메이션이 없다 — 찍는 순간 중간 프레임이 박히면 안 된다
 *   · 색은 전부 토큰 — 사용자 테마 그대로 나간다 (라이트 히어로는 밝다)
 *   · collapsable={false} — 안드로이드가 뷰를 최적화로 지우면 캡처가 빈다
 *
 * @param kind  'dday' | 'milestone' | 'streak'
 */
export const CARD_W = 300;
export const CARD_H = 375;

const ShareCard = forwardRef(function ShareCard({ kind = 'dday', data = {} }, ref) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  const phase = getPhase(data.daysLeft ?? 1);
  const cfg = tc.phase[phase] || tc.phase.normal;

  const who = [data.name, data.branchLabel, data.rank].filter(Boolean).join(' · ');
  const pct = Math.max(0, Math.min(100, Math.round(data.progress ?? 0)));

  let eyebrow = '전역까지';
  let big = null;
  let unit = null;
  let caption = null;
  let icon = null;

  if (kind === 'milestone') {
    eyebrow = '마일스톤 달성';
    icon = data.milestone?.icon ?? 'trophy';
    big = data.milestone?.label ?? '';
    caption = data.milestone?.date ? formatDateKo(data.milestone.date) : null;
  } else if (kind === 'streak') {
    eyebrow = '연속 출석';
    icon = 'flame';
    big = String(data.streak?.current ?? 0);
    unit = '일';
    caption = `최고 ${data.streak?.best ?? 0}일 · 누적 ${data.streak?.total ?? 0}일`;
  } else {
    const left = data.daysLeft ?? 0;
    big = left > 0 ? `D-${left}` : left === 0 ? 'D-Day' : '전역 완료';
    caption = data.dischargeDate ? `${formatDateKo(data.dischargeDate)} 전역` : null;
  }

  const bigLen = String(big).length;
  const bigSize = kind === 'milestone'
    ? (bigLen > 8 ? 30 : 36)
    : bigLen > 6 ? 56 : 72;

  return (
    <View ref={ref} collapsable={false} style={s.frame}>
      <LinearGradient
        colors={cfg.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={s.top}>
        <View style={s.brand}>
          <Ionicons name="shield-checkmark" size={14} color={tc.heroText} />
          <Txt role="label" tone="hero">전역까지</Txt>
        </View>
        {who ? <Txt role="caption" tone="heroMuted" numberOfLines={1} style={s.who}>{who}</Txt> : null}
      </View>

      <View style={s.center}>
        {icon ? (
          <View style={[s.iconWrap, { backgroundColor: tc.heroSheen, borderColor: tc.heroBorder }]}>
            <Ionicons name={icon} size={30} color={cfg.accent} />
          </View>
        ) : null}
        <Txt role="label" tone="heroMuted" style={s.eyebrow}>{eyebrow}</Txt>
        <View style={s.bigRow}>
          <Txt
            style={[
              s.big,
              { fontSize: bigSize, lineHeight: Math.round(bigSize * 1.12), color: cfg.accent },
            ]}
            numberOfLines={2}
            allowFontScaling={false}
          >
            {big}
          </Txt>
          {unit ? <Txt role="subtitle" tone="hero" allowFontScaling={false}>{unit}</Txt> : null}
        </View>
        {caption ? <Txt role="bodySm" tone="hero" style={s.caption} allowFontScaling={false}>{caption}</Txt> : null}
      </View>

      <View style={s.bottom}>
        {kind !== 'streak' && data.progress != null ? (
          <>
            <View style={s.progressHead}>
              <Txt role="caption" tone="heroMuted" allowFontScaling={false}>복무 진행률</Txt>
              <Txt role="caption" tone="hero" numeric allowFontScaling={false}>{pct}%</Txt>
            </View>
            {/* 정적 막대 — 애니메이션이 아니므로 flex 두 칸으로 나눈다 */}
            <View style={[s.track, { backgroundColor: tc.heroTrack }]}>
              {pct > 0 ? <View style={{ flex: pct, backgroundColor: cfg.accent, borderRadius: r.pill }} /> : null}
              {pct < 100 ? <View style={{ flex: 100 - pct }} /> : null}
            </View>
          </>
        ) : null}
        <Txt role="micro" tone="heroMuted" style={s.footer} allowFontScaling={false}>
          Google Play · '전역까지' 에서 함께 카운트다운
        </Txt>
      </View>
    </View>
  );
});

export default ShareCard;

const makeStyles = (tc) =>
  StyleSheet.create({
    frame: {
      width: CARD_W,
      height: CARD_H,
      borderRadius: r.xl,
      overflow: 'hidden',
      padding: sp.xl,
      justifyContent: 'space-between',
      backgroundColor: tc.heroFrom,
    },
    top: { gap: sp.xs },
    brand: { flexDirection: 'row', alignItems: 'center', gap: sp.xs },
    who: { maxWidth: '100%' },
    center: { alignItems: 'center' },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: r.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      marginBottom: sp.md,
    },
    eyebrow: { letterSpacing: 2 },
    bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: sp.xs, marginTop: sp.xs },
    big: { ...ty.display, ...tabular, textAlign: 'center' },
    caption: { marginTop: sp.sm, fontWeight: '700' },
    bottom: { gap: sp.sm },
    progressHead: { flexDirection: 'row', justifyContent: 'space-between' },
    track: { height: 8, borderRadius: r.pill, flexDirection: 'row', overflow: 'hidden' },
    footer: { textAlign: 'center', marginTop: sp.xs },
  });
