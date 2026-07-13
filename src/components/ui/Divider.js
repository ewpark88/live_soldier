import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { space as sp } from '../../theme/tokens';

/**
 * 헤어라인 구분선.
 * @param inset  왼쪽 들여쓰기 (아이콘 있는 행이면 아이콘 폭만큼 밀어준다)
 */
export default function Divider({ inset = 0, vertical = false, spacing = 0, color, style }) {
  const tc = useThemeColors();

  if (vertical) {
    return (
      <View
        style={[
          {
            width: StyleSheet.hairlineWidth,
            alignSelf: 'stretch',
            backgroundColor: color || tc.border,
            marginHorizontal: spacing,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth,
          backgroundColor: color || tc.border,
          marginLeft: inset,
          marginVertical: spacing,
        },
        style,
      ]}
    />
  );
}
