import React, { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp, type as ty, tabular } from '../../theme/tokens';
import PressScale from './PressScale';

/**
 * − [값] + 스테퍼.
 *
 * 휴가(34×34)와 전역 정보(44×48)가 각자 만들어 크기도 접근성도 달랐다.
 * 버튼은 44 이상으로 고정하고, 스크린리더가 "1 줄이기 / 1 늘리기"로 읽게 한다.
 *
 * @param value     숫자 (입력 중엔 문자열일 수도 있다 — editable 일 때)
 * @param onChange  (next:number|string) => void · 버튼은 숫자, 직접 입력은 숫자만 남긴 문자열
 * @param onHero    히어로 위에 얹을 때 (밝은/어두운 표면 대응 토큰)
 */
export default function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit,
  label = '값',
  editable = false,
  onHero = false,
  style,
}) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc, onHero), [tc, onHero]);
  const n = parseInt(value, 10);
  const cur = Number.isFinite(n) ? n : min;
  const fg = onHero ? tc.heroText : tc.primary;

  const bump = (d) => onChange(Math.max(min, Math.min(max, cur + d)));

  return (
    <View style={[styles.row, style]}>
      <PressScale
        onPress={() => bump(-step)}
        disabled={cur <= min}
        haptic="select"
        style={[styles.btn, cur <= min && styles.dim]}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${step} 줄이기`}
      >
        <Ionicons name="remove" size={20} color={fg} />
      </PressScale>

      {editable ? (
        <TextInput
          style={[styles.value, styles.input]}
          value={String(value ?? '')}
          onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={String(max).length}
          selectTextOnFocus
          accessibilityLabel={label}
          maxFontSizeMultiplier={1.3}
        />
      ) : (
        <View style={styles.input} accessible accessibilityLabel={`${label} ${cur}${unit ?? ''}`}>
          <Text style={styles.value} maxFontSizeMultiplier={1.3}>{`${cur}${unit ?? ''}`}</Text>
        </View>
      )}

      <PressScale
        onPress={() => bump(step)}
        disabled={cur >= max}
        haptic="select"
        style={[styles.btn, cur >= max && styles.dim]}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${step} 늘리기`}
      >
        <Ionicons name="add" size={20} color={fg} />
      </PressScale>
    </View>
  );
}

const SIZE = 44;

const makeStyles = (tc, onHero) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
    btn: {
      width: SIZE,
      height: SIZE,
      borderRadius: r.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: onHero ? tc.heroSheen : tc.primarySoft,
    },
    dim: { opacity: 0.4 },
    input: {
      minWidth: 64,
      height: SIZE,
      borderRadius: r.sm,
      justifyContent: 'center',
      backgroundColor: onHero ? tc.heroSheen : tc.surfaceSunken,
    },
    value: {
      ...ty.bodyLg,
      ...tabular,
      fontWeight: '800',
      textAlign: 'center',
      color: onHero ? tc.heroText : tc.text,
      padding: 0,
      paddingHorizontal: sp.sm,
    },
  });
