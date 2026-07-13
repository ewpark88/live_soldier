import React from 'react';
import { Text } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { type as ty, tabular } from '../../theme/tokens';

/**
 * 역할 기반 텍스트.
 *
 *   <Txt role="section">급여 현황</Txt>
 *   <Txt role="caption" tone="secondary">지난달 대비</Txt>
 *
 * 이걸 쓰는 진짜 이유는 lineHeight 다. 안드로이드는 lineHeight 가 모자라면
 * 한글 받침을 잘라먹는데, 40개 makeStyles 팩토리에 일일이 넣다 보면 반드시
 * 어딘가 빠진다. 역할만 고르면 자동으로 따라오게 만든다.
 */
const TONES = {
  default: 'text',
  secondary: 'textSecondary',
  light: 'textLight',
  primary: 'primary',
  accent: 'accent',
  success: 'success',
  danger: 'danger',
  warning: 'warning',
  hero: 'heroText',
  heroMuted: 'heroTextMuted',
  onPrimary: 'onPrimary',
  onGold: 'onGold',
};

export default function Txt({
  role = 'body',
  tone = 'default',
  color,
  numeric = false,
  style,
  children,
  ...rest
}) {
  const tc = useThemeColors();
  const resolved = color || tc[TONES[tone] || 'text'];

  return (
    <Text
      style={[ty[role] || ty.body, { color: resolved }, numeric && tabular, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}
