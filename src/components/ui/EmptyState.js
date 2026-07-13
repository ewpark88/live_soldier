import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../../theme/tokens';
import Button from './Button';

/**
 * 빈 상태 — "아직 기록이 없어요", "입대 정보를 먼저 등록해주세요".
 *
 * 예전엔 화면마다 제각각이었고, 로드맵은 아예 아무것도 안 그리고 빈 스크롤뷰만
 * 남기기도 했다. 하나로 모은다.
 */
export default function EmptyState({
  icon = 'file-tray-outline',
  title,
  desc,
  action, // { label, onPress, icon }
  compact = false,
  style,
}) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);

  return (
    <View style={[styles.wrap, compact && styles.compact, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={compact ? 26 : 32} color={tc.primary} />
      </View>

      <Text style={styles.title}>{title}</Text>
      {desc ? <Text style={styles.desc}>{desc}</Text> : null}

      {action ? (
        <Button
          title={action.label}
          icon={action.icon}
          onPress={action.onPress}
          size="md"
          style={styles.btn}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: sp.xxxl,
      paddingHorizontal: sp.xl,
      gap: sp.sm,
    },
    compact: { paddingVertical: sp.xl },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: r.lg,
      backgroundColor: tc.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: sp.xs,
    },
    title: { ...ty.subtitle, color: tc.text, textAlign: 'center' },
    desc: {
      ...ty.body,
      color: tc.textSecondary,
      textAlign: 'center',
      maxWidth: 280,
    },
    btn: { marginTop: sp.md },
  });
