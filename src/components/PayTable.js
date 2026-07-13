import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp, tabular, type as ty } from '../theme/tokens';
import { useMotion } from '../hooks/useMotion';
import ProgressBar from './ProgressBar';
import Chip from './ui/Chip';

/**
 * 봉급표 — 병사(SalaryGuideScreen)와 간부(OfficerPayScreen)가 같이 쓴다.
 *
 * 두 화면이 85% 똑같은 코드였다. 라우트는 그대로 두되(대상이 다르다) 표만 합친다.
 *
 * 계급장은 이미 있는 PNG 를 쓴다 — 이모지(🪖⭐👑)보다 훨씬 낫고 에셋 비용이 0이다.
 *
 * @param rows        [{ key, title, sub, amount, image? }]
 * @param currentKey  "현재" 배지를 붙일 행의 key
 * @param note        표 아래 주의 문구
 */
export default function PayTable({ rows = [], currentKey, note }) {
  const tc = useThemeColors();
  const m = useMotion();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const max = Math.max(...rows.map((x) => x.amount || 0), 1);

  return (
    <View>
      {rows.map((row, i) => {
        const isCurrent = row.key === currentKey;
        return (
          <Animated.View
            key={row.key}
            entering={m.enter(FadeInDown, i)}
            style={[s.row, isCurrent && s.rowCurrent]}
          >
            {row.image ? (
              <Image source={row.image} style={s.crest} resizeMode="contain" />
            ) : null}

            <View style={s.left}>
              <View style={s.titleRow}>
                <Text style={[s.rank, isCurrent && { color: tc.primary }]} numberOfLines={1}>
                  {row.title}
                </Text>
                {isCurrent ? (
                  <Chip label="현재" size="sm" tone="accent" style={s.badge} />
                ) : null}
              </View>
              {row.sub ? <Text style={s.sub}>{row.sub}</Text> : null}
            </View>

            <View style={s.right}>
              <Text style={[s.amount, isCurrent && { color: tc.primary }]} numberOfLines={1}>
                {formatMoney(row.amount)}원
              </Text>
              <ProgressBar
                progress={(row.amount || 0) / max}
                height={6}
                delay={140 + i * 70}
                tone={isCurrent ? 'primary' : 'accent'}
                fillColor={isCurrent ? tc.primary : tc.textLight}
                style={s.bar}
              />
            </View>
          </Animated.View>
        );
      })}

      {note ? <Text style={s.note}>{note}</Text> : null}
    </View>
  );
}

function formatMoney(n) {
  return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const makeStyles = (tc) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.md,
      paddingVertical: sp.md,
      paddingHorizontal: sp.md,
      borderRadius: r.md,
      marginBottom: sp.sm,
      backgroundColor: tc.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'transparent',
    },
    // 하드코딩 '#E8F3F0' 대신 팔레트 값 — 다크모드에서도 제대로 나온다
    rowCurrent: {
      backgroundColor: tc.primarySoft,
      borderColor: tc.primaryLight,
    },
    crest: { width: 34, height: 34 },
    left: { flex: 1, gap: 2 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
    rank: { ...ty.bodyLg, fontWeight: '700', color: tc.text },
    badge: { paddingHorizontal: sp.sm },
    sub: { ...ty.caption, color: tc.textSecondary },
    right: { width: 122, alignItems: 'flex-end', gap: sp.xs + 2 },
    amount: { ...ty.body, ...tabular, fontWeight: '800', color: tc.text },
    bar: { width: 110 },
    note: {
      ...ty.caption,
      color: tc.textLight,
      textAlign: 'right',
      marginTop: sp.sm,
    },
  });
