import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../theme/tokens';

/**
 * 섹션 제목 — 이모지 대신 테마 색이 입혀진 벡터 아이콘 + 텍스트.
 *
 *   <SectionTitle icon="wallet-outline">급여 현황</SectionTitle>
 *   <SectionTitle icon="flag" right={<Txt role="label" tone="primary">더보기</Txt>}>로드맵</SectionTitle>
 *
 * @param tone   아이콘 칩 색조: 'primary' | 'accent' | 'danger' | 'success'
 * @param right  오른쪽 끝에 붙일 노드 (더보기 링크 등)
 */
const TONES = {
  primary: { fg: 'primary', bg: 'primarySoft' },
  accent: { fg: 'accent', bg: 'accentSoft' },
  danger: { fg: 'danger', bg: 'dangerSoft' },
  success: { fg: 'success', bg: 'successSoft' },
};

export default function SectionTitle({
  icon,
  children,
  tone = 'primary',
  color,
  iconColor,
  right,
  style,
}) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const t = TONES[tone] || TONES.primary;

  return (
    <View style={[styles.row, style]}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: tc[t.bg] }]}>
          <Ionicons name={icon} size={17} color={iconColor || tc[t.fg]} />
        </View>
      ) : null}
      <Text style={[styles.text, color && { color }]} numberOfLines={1}>
        {children}
      </Text>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: r.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: { ...ty.section, color: tc.text, flexShrink: 1 },
    right: { marginLeft: 'auto' },
  });
