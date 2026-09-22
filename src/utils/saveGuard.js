/**
 * 저장 실패를 사용자에게 알리는 래퍼.
 *
 * `storage._setField` 는 실패하면 **예외를 그대로 던진다** — 호출부가 알아야
 * 하기 때문이다(그 파일 주석 참고). 그런데 그 계약을 지키던 저장 핸들러는
 * `DischargeScreen.handleSave` 하나뿐이었다.
 *
 * 나머지는 try/catch 없이 await 해서, 저장이 실패하면 예외가 핸들러를 중간에
 * 끊었다. 그 뒤에 오는 성공 햅틱·모달 닫기·목록 갱신이 전부 실행되지 않으니
 * 사용자에게는 "버튼을 눌렀는데 아무 일도 일어나지 않음"으로 보였다.
 * (게다가 unhandled promise rejection 이 남는다.)
 *
 * 사용법:
 *   const res = await guardSave(() => addLeaveRecord(rec));
 *   if (res === SAVE_FAILED) return;
 *   setRecords(res);
 *
 * 훅이 아니라 평범한 모듈이다 — 콜백·Alert onPress 안에서도 그대로 쓸 수 있어야 한다.
 */
import { Alert } from 'react-native';
import { haptic } from './haptics';

/** 저장 실패 센티널. `null`/`undefined` 는 정상 반환값일 수 있어 심볼을 쓴다. */
export const SAVE_FAILED = Symbol('SAVE_FAILED');

const DEFAULT_MESSAGE =
  '변경 내용을 저장하지 못했습니다.\n기기 저장공간을 확인한 뒤 다시 시도해주세요.';

export async function guardSave(fn, message = DEFAULT_MESSAGE, title = '저장 실패') {
  try {
    return await fn();
  } catch (e) {
    if (__DEV__) console.warn('[saveGuard] 저장 실패:', e && e.message ? e.message : e);
    haptic.warning();
    Alert.alert(title, message);
    return SAVE_FAILED;
  }
}

/** 삭제도 같은 저장소를 쓴다. 문구만 다르다. */
export async function guardDelete(fn) {
  return guardSave(
    fn,
    '삭제한 내용을 저장하지 못했습니다.\n기기 저장공간을 확인한 뒤 다시 시도해주세요.',
    '삭제 실패'
  );
}
