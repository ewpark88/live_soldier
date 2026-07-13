/**
 * 훈련 프리셋 — 일정 화면의 "훈련 빠른 추가".
 *
 * emoji 는 남겨둔다 (공유 텍스트·알림 문구에서 쓴다). UI 는 icon 을 쓴다.
 * 색은 원래 값보다 채도를 낮췄다 — 12개가 한 화면에 깔리면 원색은 시끄럽다.
 */
export const TRAINING_PRESETS = [
  { emoji: '❄️', icon: 'snow', name: '혹한기 훈련', days: 7, color: '#4A90D9', note: '연 1회 동계 필수 훈련' },
  { emoji: '🏃', icon: 'walk', name: '유격훈련', days: 5, color: '#4E9C57', note: '연 1회 전투체력 필수 훈련' },
  { emoji: '☣️', icon: 'skull', name: '화생방 훈련', days: 2, color: '#D9773F', note: '연 1회 CBRN 방호 훈련' },
  { emoji: '🎯', icon: 'locate', name: '사격 훈련', days: 2, color: '#C9504A', note: '정기 개인화기 사격' },
  { emoji: '💪', icon: 'barbell', name: '체력검정', days: 1, color: '#8256A8', note: '체력단련 평가 (달리기·팔굽혀펴기·윗몸)' },
  { emoji: '🌙', icon: 'moon', name: '야간훈련', days: 2, color: '#3D4E56', note: '야간 전술훈련' },
  { emoji: '🚨', icon: 'alarm', name: '비상소집', days: 1, color: '#DC6039', note: '전시 대비 비상 훈련' },
  { emoji: '🔫', icon: 'map', name: '전술훈련', days: 3, color: '#5C8C3A', note: '소대·중대급 전술 기동훈련' },
  { emoji: '🏥', icon: 'medkit', name: '구급법 교육', days: 1, color: '#1A8377', note: '응급처치·심폐소생술 교육' },
  { emoji: '🖥️', icon: 'desktop', name: '사이버 교육', days: 1, color: '#2E77C2', note: '사이버 보안·정보보호 교육' },
  { emoji: '📚', icon: 'book', name: '정신교육', days: 1, color: '#7A5A4A', note: '정기 정신전력교육' },
  { emoji: '🛡️', icon: 'shield-checkmark', name: '대테러 훈련', days: 1, color: '#55707C', note: '테러 대비 훈련' },
];
