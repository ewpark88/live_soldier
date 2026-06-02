/**
 * 프로필 사진 선택 (expo-image-picker 방어적 래퍼)
 * 네이티브 모듈이 없는 환경(예: 일부 Expo Go/빌드)에서도 앱이 죽지 않도록
 * lazy-require + try/catch로 감싼다.
 *
 * @returns {Promise<{uri:string}|{error:'unavailable'|'permission'|'fail'}|null>}
 *   - { uri }            : 선택 성공
 *   - null               : 사용자가 취소
 *   - { error: ... }     : 모듈 없음 / 권한 거부 / 실패
 */
export async function pickProfilePhoto() {
  let ImagePicker;
  try {
    ImagePicker = require('expo-image-picker');
  } catch {
    return { error: 'unavailable' };
  }

  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { error: 'permission' };

    // v16부터 mediaTypes는 배열(['images']) 권장. 구버전 호환 위해 분기.
    const mediaTypes = ImagePicker.MediaTypeOptions
      ? ImagePicker.MediaTypeOptions.Images
      : ['images'];

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (result.canceled) return null;
    const uri = result.assets?.[0]?.uri;
    return uri ? { uri } : { error: 'fail' };
  } catch {
    return { error: 'fail' };
  }
}
