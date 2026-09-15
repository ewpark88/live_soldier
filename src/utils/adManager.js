import AsyncStorage from '@react-native-async-storage/async-storage';
import { AD_UNITS, getAdUnitId } from '../constants/adUnits';

/**
 * 전면광고 — 앱 전체에서 인스턴스 하나만 소유한다.
 *
 * 예전에는 AdInterstitial 컴포넌트가 모듈 최상위에서 인스턴스를 만들고
 * 화면 4곳이 각자 마운트되면서 같은 객체에 리스너를 중복 등록하고 load() 를
 * 중복 호출했다. 게다가 loadedRef 가 인스턴스별이라, LOADED 이후에 마운트된
 * 화면은 영원히 '로드 안 됨' 으로 남아 광고 없이 하루 한도만 소진했다.
 */

const KEYS = {
  LAST_SHOWN:  '@ad_last_shown',   // 마지막 표시 timestamp
  COUNT_TODAY: '@ad_count_today',  // 오늘 표시 횟수
  COUNT_DATE:  '@ad_count_date',   // 횟수 기준 날짜
};

const MAX_PER_DAY  = 2;               // 하루 최대 2회
const MIN_INTERVAL = 30 * 60 * 1000;  // 최소 30분 간격
const MAX_RETRY    = 3;

const log = (...a) => { if (__DEV__) console.log('[AdManager]', ...a); };

/* ─── 빈도 제한 ─────────────────────────────────────────────────────── */
export async function canShowInterstitial() {
  try {
    const now = Date.now();
    const today = new Date().toDateString();
    const [lastShown, countStr, countDate] = await Promise.all([
      AsyncStorage.getItem(KEYS.LAST_SHOWN),
      AsyncStorage.getItem(KEYS.COUNT_TODAY),
      AsyncStorage.getItem(KEYS.COUNT_DATE),
    ]);
    const count = countDate === today ? (parseInt(countStr, 10) || 0) : 0;
    if (count >= MAX_PER_DAY) return false;
    if (lastShown && now - parseInt(lastShown, 10) < MIN_INTERVAL) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * 광고가 실제로 화면에 뜬 뒤에만 호출한다.
 * 예전에는 show() 진입 시점에 미리 차감해서, 로드가 안 됐으면 노출 0회로
 * 하루 한도를 통째로 날렸다.
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
  } catch (e) {
    log('카운트 기록 실패:', e && e.message);
  }
}

/* ─── 전면광고 인스턴스 (앱 전체 1개) ────────────────────────────────── */
let InterstitialAd = null;
let AdEventType = null;
try {
  const ads = require('react-native-google-mobile-ads');
  InterstitialAd = ads.InterstitialAd;
  AdEventType = ads.AdEventType;
} catch (e) {
  // Expo Go → 전면광고 비활성화
}

let interstitial = null;
let isLoaded = false;
let isLoading = false;
let isShowing = false;
let retry = 0;

function _init() {
  if (interstitial || !InterstitialAd || !AdEventType) return;
  const unitId = getAdUnitId(AD_UNITS.INTERSTITIAL_TAB, 'interstitial');
  if (!unitId) return;

  interstitial = InterstitialAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: false,
  });

  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true; isLoading = false; retry = 0;
    log('로드 완료');
  });

  // 실제 노출 시점에만 한도를 차감한다
  interstitial.addAdEventListener(AdEventType.OPENED, () => {
    log('노출');
    recordAdShown();
  });

  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    isLoaded = false; isShowing = false;
    preloadInterstitial();
  });

  interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
    isLoaded = false; isLoading = false; isShowing = false;
    log('로드 실패:', error && error.message);
    // 한 번 실패하면 영영 멈추던 문제 — 간격을 늘려가며 재시도
    if (retry < MAX_RETRY) {
      retry += 1;
      setTimeout(preloadInterstitial, 30000 * retry);
    }
  });

  preloadInterstitial();
}

/** 미리 로드 */
export function preloadInterstitial() {
  _init();
  if (!interstitial || isLoaded || isLoading || isShowing) return;
  isLoading = true;
  try {
    interstitial.load();
  } catch (e) {
    isLoading = false;
    log('load() 예외:', e && e.message);
  }
}

export function isInterstitialReady() {
  return isLoaded && !isShowing;
}

/**
 * 조건이 맞을 때만 전면광고 표시.
 * @returns {Promise<boolean>} 실제로 표시했는지
 */
export async function showInterstitial() {
  _init();
  if (!interstitial || isShowing) return false;

  if (!isLoaded) {
    // 아직 준비 안 됨 → 한도를 쓰지 않고 건너뛴다
    log('미로드 상태라 건너뜀');
    preloadInterstitial();
    return false;
  }
  if (!(await canShowInterstitial())) {
    log('빈도 제한으로 건너뜀');
    return false;
  }

  try {
    isShowing = true;
    interstitial.show();
    return true;
  } catch (e) {
    isShowing = false; isLoaded = false;
    log('show() 예외:', e && e.message);
    preloadInterstitial();
    return false;
  }
}
