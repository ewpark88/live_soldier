import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  LAST_SHOWN:  '@ad_last_shown',   // 마지막 표시 timestamp
  COUNT_TODAY: '@ad_count_today',  // 오늘 표시 횟수
  COUNT_DATE:  '@ad_count_date',   // 횟수 기준 날짜
};

const MAX_PER_DAY    = 2;                  // 하루 최대 2회
const MIN_INTERVAL   = 30 * 60 * 1000;    // 최소 30분 간격

/**
 * 전면광고를 보여줄 수 있는 상태인지 확인
 */
export async function canShowInterstitial() {
  try {
    const now   = Date.now();
    const today = new Date().toDateString();

    const [lastShown, countStr, countDate] = await Promise.all([
      AsyncStorage.getItem(KEYS.LAST_SHOWN),
      AsyncStorage.getItem(KEYS.COUNT_TODAY),
      AsyncStorage.getItem(KEYS.COUNT_DATE),
    ]);

    // 날짜가 바뀌면 카운트 초기화
    const count = countDate === today ? (parseInt(countStr, 10) || 0) : 0;

    if (count >= MAX_PER_DAY) return false;
    if (lastShown && now - parseInt(lastShown, 10) < MIN_INTERVAL) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * 광고 표시 후 기록 (호출 즉시 카운트 소모)
 */
export async function recordAdShown() {
  try {
    const today = new Date().toDateString();
    const [countStr, countDate] = await Promise.all([
      AsyncStorage.getItem(KEYS.COUNT_TODAY),
      AsyncStorage.getItem(KEYS.COUNT_DATE),
    ]);
    const count = countDate === today ? (parseInt(countStr, 10) || 0) : 0;

    await Promise.all([
      AsyncStorage.setItem(KEYS.LAST_SHOWN,  String(Date.now())),
      AsyncStorage.setItem(KEYS.COUNT_TODAY, String(count + 1)),
      AsyncStorage.setItem(KEYS.COUNT_DATE,  today),
    ]);
  } catch {}
}
