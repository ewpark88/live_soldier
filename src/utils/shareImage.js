/**
 * 화면의 카드를 이미지로 찍어 공유 시트를 연다.
 *
 * view-shot · expo-sharing 은 네이티브 모듈이라 리빌드 전 빌드(구버전 dev client)에는
 * 없다. 그때는 false 를 돌려주고 호출부가 텍스트 공유로 폴백한다.
 */
let captureRef = null;
let Sharing = null;
try { captureRef = require('react-native-view-shot').captureRef; } catch (e) {}
try { Sharing = require('expo-sharing'); } catch (e) {}

/** 이미지 공유가 가능한 빌드인가 */
export function canShareImage() {
  return !!(captureRef && Sharing);
}

/**
 * @param ref    ShareCard 의 ref
 * @param size   출력 픽셀 (기본 1080×1350 — 4:5)
 * @returns {Promise<boolean>} 공유 시트를 열었는가 (사용자가 취소해도 true)
 */
export async function shareViewAsImage(ref, { width = 1080, height = 1350, dialogTitle = '전역까지 공유' } = {}) {
  if (!canShareImage() || !ref?.current) return false;
  try {
    if (!(await Sharing.isAvailableAsync())) return false;
    const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', width, height });
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle, UTI: 'public.png' });
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[shareImage] 실패:', e && e.message);
    return false;
  }
}
