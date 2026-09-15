/**
 * 훈련 프리셋 — 일정 화면의 "훈련 빠른 추가".
 *
 * emoji 는 남겨둔다 (공유 텍스트·알림 문구에서 쓴다). UI 는 icon 을 쓴다.
 * 색은 고정 hex 가 아니라 tone 키로 둔다. 예전엔 라이트 테마에 맞춰 고른
 * 중간 채도 hex 를 그대로 썼는데, 다크 테마에서는 카드 배경 대비가 4.5:1 에
 * 못 미쳤다(#3D4E56 야간훈련, #55707C 대테러). 실제 색은 화면이 팔레트에서
 * 뽑아 쓴다 — TodoScreen 의 PRESET_TONE 참고.
 */
export const TRAINING_PRESETS = [
  { emoji: '❄️', icon: 'snow', name: '혹한기 훈련', days: 7, tone: 'primary', note: '연 1회 동계 필수 훈련' },
  { emoji: '🏃', icon: 'walk', name: '유격훈련', days: 5, tone: 'success', note: '연 1회 전투체력 필수 훈련' },
  { emoji: '☣️', icon: 'skull', name: '화생방 훈련', days: 2, tone: 'warning', note: '연 1회 CBRN 방호 훈련' },
  { emoji: '🎯', icon: 'locate', name: '사격 훈련', days: 2, tone: 'danger',  note: '정기 개인화기 사격' },
  { emoji: '💪', icon: 'barbell', name: '체력검정', days: 1, tone: 'accent',  note: '체력단련 평가 (달리기·팔굽혀펴기·윗몸)' },
  { emoji: '🌙', icon: 'moon', name: '야간훈련', days: 2, tone: 'neutral', note: '야간 전술훈련' },
  { emoji: '🚨', icon: 'alarm', name: '비상소집', days: 1, tone: 'danger',  note: '전시 대비 비상 훈련' },
  { emoji: '🔫', icon: 'map', name: '전술훈련', days: 3, tone: 'success', note: '소대·중대급 전술 기동훈련' },
  { emoji: '🏥', icon: 'medkit', name: '구급법 교육', days: 1, tone: 'primary', note: '응급처치·심폐소생술 교육' },
  { emoji: '🖥️', icon: 'desktop', name: '사이버 교육', days: 1, tone: 'primary', note: '사이버 보안·정보보호 교육' },
  { emoji: '📚', icon: 'book', name: '정신교육', days: 1, tone: 'neutral', note: '정기 정신전력교육' },
  { emoji: '🛡️', icon: 'shield-checkmark', name: '대테러 훈련', days: 1, tone: 'neutral', note: '테러 대비 훈련' },
];

/**
 * 프리셋 tone 키 → 실제 색. 테마 색은 런타임에 결정되므로 tc 를 받아 푼다.
 * (QuickActions 의 TONE 맵과 같은 방식)
 */
export function presetTone(tc, tone) {
  const map = {
    primary: { fg: tc.primary,       bg: tc.primarySoft },
    accent:  { fg: tc.accentText,    bg: tc.accentSoft },
    success: { fg: tc.success,       bg: tc.successSoft },
    warning: { fg: tc.warning,       bg: tc.warningSoft },
    danger:  { fg: tc.danger,        bg: tc.dangerSoft },
    neutral: { fg: tc.textSecondary, bg: tc.surfaceSunken },
  };
  return map[tone] ?? map.neutral;
}
