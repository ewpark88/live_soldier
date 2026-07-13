/**
 * 햅틱 — 설정의 "햅틱 반응" 토글 하나로 전역 차단된다.
 *
 * 훅이 아니라 평범한 모듈이라 어디서든(콜백/유틸 안에서도) 부를 수 있다.
 * 활성 여부는 PrefsProvider 가 setHapticsEnabled() 로 동기화한다.
 *
 * expo-haptics 네이티브 모듈이 없는 환경(일부 Expo Go/에뮬레이터)에서도
 * 앱이 죽지 않도록 모든 호출을 삼킨다. 햅틱은 실패해도 되는 부가 기능이다.
 */
import * as Haptics from 'expo-haptics';

let enabled = true;

export function setHapticsEnabled(v) {
  enabled = !!v;
}

const safe = (fn) => {
  if (!enabled) return;
  try {
    fn();
  } catch {
    // 무시 — 햅틱 실패가 사용자 동작을 막아선 안 된다
  }
};

export const haptic = {
  /** 칩·라디오·달력일·필터 등 "선택" */
  select: () => safe(() => Haptics.selectionAsync()),
  /** 카드/행 누름, 할일 완료 해제, 당겨서 새로고침 */
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** 할일 완료, FAB, 홈 D-N 탭 */
  medium: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** 전역일 축하 — 일회성 */
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  /** 저장 완료, 기록 추가 */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** 입력 검증 실패 */
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
