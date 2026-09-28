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
// 로드된 전면광고는 1시간 뒤 만료된다. 여유를 두고 55분에서 끊는다.
const AD_TTL       = 55 * 60 * 1000;

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
let showGuard = null;
let loadedAt = 0;

/* ─── SDK 초기화 신호 ───────────────────────────────────────────────────
 * App.js 가 MobileAds().initialize() 를 끝내면 markAdsReady() 를 부른다.
 * 배너는 그 전엔 요청하지 않는다 — 초기화 전에 나간 첫 요청은 미충전이 잦다.
 * 초기화가 끝내 안 끝나도 광고가 영영 안 뜨지 않도록 App.js 가 타임아웃으로도 부른다. */
let adsReady = false;
const readyListeners = new Set();
export function markAdsReady() {
  if (adsReady) return;
  adsReady = true;
  readyListeners.forEach((cb) => { try { cb(); } catch {} });
  readyListeners.clear();
}
export function isAdsReady() { return adsReady; }
export function onAdsReady(cb) {
  if (adsReady) { cb(); return () => {}; }
  readyListeners.add(cb);
  return () => readyListeners.delete(cb);
}

function _init() {
  if (interstitial || !InterstitialAd || !AdEventType) return;
  const unitId = getAdUnitId(AD_UNITS.INTERSTITIAL_TAB, 'interstitial');
  if (!unitId) return;

  interstitial = InterstitialAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: false,
  });

  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true; isLoading = false; retry = 0; loadedAt = Date.now();
    log('로드 완료');
  });

  // 실제 노출 시점에만 한도를 차감한다
  interstitial.addAdEventListener(AdEventType.OPENED, () => {
    log('노출');
    recordAdShown();
  });

  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    if (showGuard) { clearTimeout(showGuard); showGuard = null; }
    isLoaded = false; isShowing = false;
    // 다음 저장 흐름에서 다시 로드한다. 여기서 바로 로드하면 하루 한도를
    // 다 쓴 날엔 절대 보여주지 못할 광고를 받아놓고 버린다 (노출률 하락).
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

}

function _expired() {
  return isLoaded && Date.now() - loadedAt > AD_TTL;
}

/**
 * 미리 로드 — '저장 흐름에 들어섰을 때'만 부른다 (useShowInterstitial(armed)).
 *
 * 예전엔 앱 실행 즉시 로드했다. 표시는 저장 직후·하루 2회뿐이라 대부분 세션에서
 * 받아놓고 버렸고, 그게 전부 '일치했지만 노출 안 됨' 으로 잡혀 노출률을 깎았다.
 * 오늘 더 보여줄 수 없으면 로드 자체를 하지 않는다.
 */
export async function preloadInterstitial() {
  _init();
  if (!interstitial || isLoading || isShowing) return;
  if (_expired()) { log('만료 — 폐기'); isLoaded = false; }
  if (isLoaded) return;
  if (!(await canShowInterstitial())) { log('빈도 제한 — 로드 생략'); return; }
  if (isLoading || isLoaded || isShowing) return;   // await 사이에 다른 호출이 선점
  isLoading = true;
  try {
    interstitial.load();
  } catch (e) {
    isLoading = false;
    log('load() 예외:', e && e.message);
  }
}

export function isInterstitialReady() {
  return isLoaded && !isShowing && !_expired();
}

/**
 * 조건이 맞을 때만 전면광고 표시.
 * @returns {Promise<boolean>} 실제로 표시했는지
 */
export async function showInterstitial() {
  _init();
  if (!interstitial || isShowing) return false;

  if (_expired()) {
    // 만료된 광고는 show() 해도 안 뜬다 → 폐기하고 이번엔 건너뛴다
    log('만료된 광고라 건너뜀');
    isLoaded = false;
    preloadInterstitial();
    return false;
  }
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
    // CLOSED 가 끝내 오지 않는 경우(OS 가 광고를 걷어가는 등)에 대비한 안전장치.
    // 없으면 isShowing 이 true 로 굳어 남은 세션 동안 전면광고가 아예 안 뜬다.
    if (showGuard) clearTimeout(showGuard);
    showGuard = setTimeout(() => {
      if (isShowing) {
        log('CLOSED 미수신 — 상태 복구');
        isShowing = false;
        isLoaded = false;
        preloadInterstitial();
      }
    }, 5 * 60 * 1000);
    interstitial.show();
    return true;
  } catch (e) {
    isShowing = false; isLoaded = false;
    log('show() 예외:', e && e.message);
    preloadInterstitial();
    return false;
  }
}
