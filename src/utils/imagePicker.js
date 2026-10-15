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

/* ─── 프로필 사진 영구 보관 ─────────────────────────────────────────────
 * image-picker 가 돌려주는 uri 는 앱 **캐시** 폴더의 파일이다. 안드로이드는
 * 저장공간이 모자라거나 사용자가 '캐시 삭제'를 누르면 그 폴더를 비우고, 그러면
 * 프로필 아바타가 깨진 이미지가 된다. 저장 전에 문서 폴더로 복사한다.
 */
const PHOTO_DIR = 'profile-photos/';
let _seq = 0;

function _fs() {
  try { return require('expo-file-system/legacy'); } catch { return null; }
}

/** 이미 앱 문서 폴더에 있는 사진인가 (지울 수 있는 우리 파일인가) */
export function isOwnedPhoto(uri) {
  const FS = _fs();
  return !!(FS && FS.documentDirectory && typeof uri === 'string'
    && uri.startsWith(FS.documentDirectory + PHOTO_DIR));
}

/**
 * 고른 사진을 문서 폴더로 복사하고 새 uri 를 돌려준다.
 * 복사에 실패하면 원래 uri 를 그대로 돌려준다 (사진 없음보다는 낫다).
 */
export async function persistProfilePhoto(uri) {
  if (!uri) return null;
  const FS = _fs();
  if (!FS || !FS.documentDirectory || isOwnedPhoto(uri)) return uri;
  try {
    const dir = FS.documentDirectory + PHOTO_DIR;
    const info = await FS.getInfoAsync(dir);
    if (!info.exists) await FS.makeDirectoryAsync(dir, { intermediates: true });
    const ext = (uri.match(/\.(jpe?g|png|webp|heic)(\?|$)/i) || [, 'jpg'])[1].toLowerCase();
    // 같은 밀리초에 여러 장을 옮기면(구버전 사진 이전 루프) 이름이 겹친다 — 순번을 붙인다
    _seq = (_seq + 1) % 100000;
    const to = `${dir}${Date.now().toString(36)}_${_seq.toString(36)}.${ext}`;
    await FS.copyAsync({ from: uri, to });
    return to;
  } catch {
    return uri;
  }
}

/** 우리가 복사해 둔 사진 파일 삭제 (프로필 삭제·사진 교체 시). 실패는 조용히. */
export async function removeProfilePhoto(uri) {
  if (!isOwnedPhoto(uri)) return;
  const FS = _fs();
  try { await FS.deleteAsync(uri, { idempotent: true }); } catch {}
}
