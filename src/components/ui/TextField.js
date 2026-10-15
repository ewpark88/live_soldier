import React, { forwardRef, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../../theme/tokens';

/**
 * 표준 입력 필드 — 라벨 + 입력 + (선택) 단위 + 에러/힌트.
 *
 * 예전엔 휴가·일정·급여·적금·전역 화면이 거의 같은 input 스타일을 각자 복붙해서
 * 높이(46~53)·반경·에러 표현이 조금씩 달랐다. 에러는 헤어라인 빨간 테두리뿐이라
 * 눈에 잘 안 띄었다 — 이제 테두리 + 문구로 함께 알린다.
 *
 * 바깥 마진은 갖지 않는다. 폼 안의 간격은 부모(FormSheet 의 gap)가 준다.
 *
 * @param label   위에 붙는 라벨
 * @param suffix  입력 오른쪽 단위 텍스트 ('원', '개월' 등)
 * @param error   문자열이면 에러 상태 + 문구, true 면 테두리만
 * @param hint    에러가 없을 때 아래에 붙는 보조 문구
 */
const TextField = forwardRef(function TextField(
  { label, suffix, error, hint, multiline = false, style, inputStyle, onFocus, onBlur, ...rest },
  ref
) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const [focused, setFocused] = useState(false);

  const borderColor = error ? tc.danger : focused ? tc.primary : tc.surfaceSunkenBorder;
  const msg = typeof error === 'string' && error ? error : null;

  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <Text style={styles.label} maxFontSizeMultiplier={1.3}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.box,
          multiline && styles.boxMulti,
          { borderColor, borderWidth: error || focused ? 1.5 : StyleSheet.hairlineWidth },
        ]}
      >
        <TextInput
          ref={ref}
          style={[styles.input, multiline && styles.inputMulti, inputStyle]}
          // textLight 는 가라앉은 표면 위에서 3:1 미만인 테마가 있다 (contrastPairs 참고)
          placeholderTextColor={tc.textSecondary}
          multiline={multiline}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          maxFontSizeMultiplier={1.4}
          {...rest}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      {msg ? (
        <View style={styles.msgRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={14} color={tc.danger} />
          <Text style={[styles.msg, { color: tc.danger }]}>{msg}</Text>
        </View>
      ) : hint ? (
        <Text style={[styles.msg, { color: tc.textLight }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

export default TextField;

/** 입력류 공통 높이 — DatePickerField 등 '입력처럼 보이는' 필드가 같이 쓴다 */
export const FIELD_HEIGHT = 48;

const makeStyles = (tc) =>
  StyleSheet.create({
    wrap: { gap: sp.sm },
    label: { ...ty.label, color: tc.textSecondary },
    box: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: FIELD_HEIGHT,
      paddingHorizontal: sp.md,
      backgroundColor: tc.surfaceSunken,
      borderRadius: r.sm,
    },
    boxMulti: { alignItems: 'flex-start', paddingVertical: sp.sm },
    input: {
      flex: 1,
      ...ty.bodyLg,
      color: tc.text,
      paddingVertical: sp.sm,
      paddingHorizontal: 0,
    },
    inputMulti: { minHeight: 56, textAlignVertical: 'top' },
    suffix: { ...ty.body, fontWeight: '700', color: tc.textSecondary, marginLeft: sp.sm },
    msgRow: { flexDirection: 'row', alignItems: 'center', gap: sp.xs },
    msg: { ...ty.caption, flexShrink: 1 },
  });
