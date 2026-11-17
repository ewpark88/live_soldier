import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 가이드 안내 플래그 (기기 범위).
 *
 * 홈의 '처음이세요? 사용 가이드' 카드를 닫았거나 가이드를 한 번이라도 열었으면
 * 다시 띄우지 않는다. 프로필 데이터가 아니라서 백업·'모든 데이터 삭제' 대상이 아니다.
 */
const KEY = '@guide_intro_seen_v1';

export async function isGuideIntroSeen() {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return true;   // 읽을 수 없으면 띄우지 않는다 — 매번 뜨는 카드가 더 나쁘다
  }
}

export async function markGuideIntroSeen() {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch { /* 다음에 다시 뜰 뿐이다 */ }
}
