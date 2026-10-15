import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../Card';
import SectionTitle from '../SectionTitle';
import CircularGauge from '../CircularGauge';
import { Txt, PressScale, Divider, GROUP_INSET } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp, type as ty, tabular } from '../../theme/tokens';
import { formatMoney } from '../../constants/salaryGuide';

/**
 * 다가오는 일정 — 다음 휴가 · 월급날 · 다음 마일스톤 · 적금 만기.
 *
 * 예전 홈은 '다음 마일스톤' 카드 하나만 미래를 보여줬다. 장병이 실제로 세는
 * 날짜는 하나가 아니다 — 휴가, 월급날, 진급. 한 카드 안의 행으로 모아
 * "다음에 뭐가 오지"를 한 번에 답한다. 카드를 여러 장 쌓으면 홈이 다시 길어진다.
 *
 * 행마다 오른쪽 끝에 D-N 을 같은 자리·같은 크기로 둔다 — 눈이 세로로 훑으며
 * 숫자만 비교할 수 있게.
 *
 * @param items [{ key, icon, tone, title, subtitle, dday, ddayLabel?, progress?, onPress }]
 */
export default function Upcoming({ items = [] }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  if (!items.length) return null;

  const TONE = {
    primary: { fg: tc.primary, bg: tc.primarySoft },
    accent: { fg: tc.accentText, bg: tc.accentSoft },
    success: { fg: tc.success, bg: tc.successSoft },
    neutral: { fg: tc.textSecondary, bg: tc.surfaceSunken },
  };

  return (
    <Card pad="none">
      <View style={s.head}>
        <SectionTitle icon="time-outline">다가오는 일정</SectionTitle>
      </View>

      {items.map((it, i) => {
        const t = TONE[it.tone] ?? TONE.primary;
        const ddayText = it.ddayLabel
          ?? (it.dday == null ? null : it.dday <= 0 ? '오늘' : `D-${it.dday}`);
        const icon = (
          <View style={[s.icon, { backgroundColor: t.bg }]}>
            <Ionicons name={it.icon} size={18} color={t.fg} />
          </View>
        );
        return (
          <View key={it.key}>
            <PressScale
              onPress={it.onPress}
              disabled={!it.onPress}
              scale={0.985}
              tint
              tintRadius={r.md}
              style={s.row}
              accessibilityRole={it.onPress ? 'button' : undefined}
              accessibilityLabel={[it.title, it.subtitle, ddayText].filter(Boolean).join(', ')}
            >
              {it.progress != null ? (
                <CircularGauge
                  progress={it.progress}
                  size={36}
                  stroke={3}
                  trackColor={tc.progressBg}
                  fillColor={t.fg}
                  delay={320}
                >
                  <Ionicons name={it.icon} size={16} color={t.fg} />
                </CircularGauge>
              ) : icon}

              <View style={s.text}>
                <Txt role="bodyLg" style={s.title} numberOfLines={1}>{it.title}</Txt>
                {it.subtitle ? (
                  <Txt role="caption" tone="secondary" numberOfLines={2}>{it.subtitle}</Txt>
                ) : null}
              </View>

              {ddayText ? (
                <Txt style={[s.dday, { color: it.ddayMuted ? tc.textSecondary : tc.primary }]} numeric numberOfLines={1}>
                  {ddayText}
                </Txt>
              ) : null}
              {it.onPress ? <Ionicons name="chevron-forward" size={16} color={tc.textLight} /> : null}
            </PressScale>
            {i < items.length - 1 ? <Divider inset={GROUP_INSET} /> : null}
          </View>
        );
      })}
    </Card>
  );
}

/** 금액 → '1,500,000원' */
export const won = (n) => `${formatMoney(n)}원`;

const makeStyles = () =>
  StyleSheet.create({
    head: { paddingHorizontal: sp.lg, paddingTop: sp.lg, paddingBottom: sp.xs },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.md,
      minHeight: 60,
      paddingVertical: sp.md,
      paddingHorizontal: sp.lg,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: r.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: { flex: 1, gap: 1 },
    title: { fontWeight: '700' },
    dday: { ...ty.bodyLg, ...tabular, fontWeight: '800' },
  });
