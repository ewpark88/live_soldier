import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeContext';

/**
 * 섹션 제목 — 이모지 대신 테마 색이 입혀진 벡터 아이콘 + 텍스트.
 *  <SectionTitle icon="wallet-outline">급여 현황</SectionTitle>
 *
 *  props
 *   - icon       : Ionicons 이름 (생략 시 아이콘 없음)
 *   - size       : 텍스트 크기(px). 아이콘은 +2px (기본 16)
 *   - color      : 텍스트 색 (기본 tc.text)
 *   - iconColor  : 아이콘 색 (기본 tc.primary)
 *   - style      : 컨테이너 추가 스타일(주로 margin)
 */
export default function SectionTitle({
  icon,
  children,
  size = 16,
  color,
  iconColor,
  style,
}) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  return (
    <View style={[styles.row, style]}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: tc.highlightBg }]}>
          <Ionicons name={icon} size={size} color={iconColor || tc.primary} />
        </View>
      ) : null}
      <Text style={[styles.text, { fontSize: size, color: color || tc.text }]}>
        {children}
      </Text>
    </View>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: { fontWeight: '800', letterSpacing: -0.2 },
  });
