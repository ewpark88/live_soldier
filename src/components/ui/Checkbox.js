import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r } from '../../theme/tokens';
import PressScale from './PressScale';

/**
 * 체크박스 — 할 일 완료 표시.
 *
 * 일정 탭은 네모 24, 홈은 원형 26 아이콘이라 같은 데이터가 두 모양으로 보였다.
 * 하나로 통일하고, 스크린리더에 체크 상태를 알린다.
 * 보이는 크기는 24 지만 누르는 면적은 44 다.
 */
export default function Checkbox({ checked, onPress, label = '완료', size = 24, haptic, style }) {
  const tc = useThemeColors();
  const box = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r.xs,
        borderWidth: checked ? 0 : 2,
        borderColor: tc.border,
        backgroundColor: checked ? tc.success : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked ? <Ionicons name="checkmark" size={size - 6} color={tc.onPrimary} /> : null}
    </View>
  );

  if (!onPress) return <View style={style}>{box}</View>;

  return (
    <PressScale
      onPress={onPress}
      // 호출부가 직접 햅틱을 낼 때는 haptic={null} (두 번 튀지 않게)
      haptic={haptic !== undefined ? haptic : checked ? 'light' : 'success'}
      style={[{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, style]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked }}
      accessibilityLabel={label}
    >
      {box}
    </PressScale>
  );
}
