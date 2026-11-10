import { Platform } from 'react-native';

/**
 * RN <Switch> 공통 props — 설정·알림 설정 화면이 같은 색·접근성 규칙을 쓴다.
 *
 *   <Switch value={on} onValueChange={…} {...switchProps(tc, on, '햅틱 반응')} />
 */
export function switchProps(tc, on, label, disabled) {
  return {
    trackColor: { false: tc.border, true: tc.primaryLight },
    thumbColor: Platform.OS === 'android' ? (on ? tc.primary : tc.card) : undefined,
    accessibilityLabel: label,
    accessibilityRole: 'switch',
    ...(disabled !== undefined ? { disabled } : null),
  };
}
