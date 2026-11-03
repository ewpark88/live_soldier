import { AD_UNITS, getAdUnitId } from '../constants/adUnits';
import { isInterstitialShowing } from './adManager';

/**
 * 보상형 전면광고 (Rewarded Interstitial) — 막대병 해금 전용. 인스턴스는 앱 전체 하나.
 *
 * 전면광고(adManager)와 다른 점:
 *  - 사용자가 도감 안내 시트에서 [광고 보고 받기]를 **직접 눌렀을 때만** 뜬다.
 *    AdMob 정책상 보상형 전면광고는 시작 전에 보상을 알리고 건너뛸 수 있는 안내
 *    화면이 있어야 한다 — 그 시트가 안내 화면이다. 자동으로 띄우지 않는다.
 *  - 하루 2회·30분 한도가 없다 (사용자가 고른 광고). 대신 전면광고가 떠 있으면 거부한다.
 *
 * 전면광고와 같은 원칙:
 *  - **보이지 않는 광고는 요청하지 않는다.** 도감 화면이 포커스일 때만 무장(armed)되고,
 *    그때만 로드·재로드한다 (useRewardedAd(armed)).
 *  - 로드 후 55분이 지나면 폐기한다 (1시간 만료).
 *
 * 보상은 `EARNED_REWARD` 를 받았을 때만 준다. 끝까지 보지 않고 닫으면 earned:false.
 */

const AD_TTL = 55 * 60 * 1000;
const MAX_RETRY = 2;
const SHOW_GUARD = 5 * 60 * 1000;

const log = (...a) => { if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[Rewarded]', ...a); };

let RewardedInterstitialAd = null;
let RewardedAdEventType = null;
let AdEventType = null;
try {
  const ads = require('react-native-google-mobile-ads');
  RewardedInterstitialAd = ads.RewardedInterstitialAd;
  RewardedAdEventType = ads.RewardedAdEventType;
  AdEventType = ads.AdEventType;
} catch (e) {
  // Expo Go → 비활성화
}

let ad = null;
let isLoaded = false;
let isLoading = false;
let isShowing = false;
let failed = false;       // 재시도까지 다 실패 — UI 에 '지금은 광고 없음'
let retry = 0;
let loadedAt = 0;
let armedCount = 0;
let earned = false;
let finish = null;        // show() 가 기다리는 resolve
let guard = null;
let retryTimer = null;

const listeners = new Set();
function _emit() {
  const st = getRewardedStatus();
  listeners.forEach((cb) => { try { cb(st); } catch {} });
}

/** 'unavailable' | 'idle' | 'loading' | 'ready' | 'showing' | 'failed' */
export function getRewardedStatus() {
  if (!RewardedInterstitialAd || !getAdUnitId(AD_UNITS.REWARDED_SKIN, 'rewardedInterstitial')) return 'unavailable';
  if (isShowing) return 'showing';
  if (isLoaded && !_expired()) return 'ready';
  if (isLoading) return 'loading';
  if (failed) return 'failed';
  return 'idle';
}

export function subscribeRewarded(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function _expired() {
  return isLoaded && Date.now() - loadedAt > AD_TTL;
}

function _settle(result) {
  if (guard) { clearTimeout(guard); guard = null; }
  const f = finish;
  finish = null;
  isShowing = false;
  if (f) f(result);
}

function _init() {
  if (ad || !RewardedInterstitialAd || !RewardedAdEventType || !AdEventType) return;
  const unitId = getAdUnitId(AD_UNITS.REWARDED_SKIN, 'rewardedInterstitial');
  if (!unitId) return;

  ad = RewardedInterstitialAd.createForAdRequest(unitId, { requestNonPersonalizedAdsOnly: false });

  ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    isLoaded = true; isLoading = false; failed = false; retry = 0; loadedAt = Date.now();
    log('로드 완료');
    _emit();
  });

  ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
    earned = true;
    log('보상 획득');
  });

  ad.addAdEventListener(AdEventType.CLOSED, () => {
    isLoaded = false;
    log('닫힘 — earned:', earned);
    _settle({ earned });
    // 도감에 그대로 있으면 다음 모습을 위해 다시 받아 둔다 (화면을 떠났으면 안 받는다)
    if (armedCount > 0) preloadRewarded();
    _emit();
  });

  ad.addAdEventListener(AdEventType.ERROR, (error) => {
    log('오류:', error && error.message);
    const wasShowing = isShowing;
    isLoaded = false; isLoading = false;
    if (wasShowing) {
      _settle({ earned, reason: 'error' });
    } else if (retry < MAX_RETRY && armedCount > 0) {
      retry += 1;
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(() => { retryTimer = null; if (armedCount > 0) preloadRewarded(); }, 15000 * retry);
    } else {
      failed = true;
    }
    _emit();
  });
}

/** 도감 화면이 포커스일 때 true. useRewardedAd(armed) 가 올리고 내린다. */
export function setRewardedArmed(on) {
  armedCount = Math.max(0, armedCount + (on ? 1 : -1));
  if (armedCount === 0 && retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
}

export function preloadRewarded() {
  _init();
  if (!ad || isLoading || isShowing) return;
  if (_expired()) { log('만료 — 폐기'); isLoaded = false; }
  if (isLoaded) return;
  if (armedCount === 0) { log('도감 밖 — 로드 생략'); return; }
  isLoading = true;
  failed = false;
  try {
    ad.load();
  } catch (e) {
    isLoading = false;
    failed = true;
    log('load() 예외:', e && e.message);
  }
  _emit();
}

/** 사용자가 직접 '다시 시도'를 누를 때 — 재시도 횟수를 초기화한다 */
export function retryRewarded() {
  retry = 0;
  failed = false;
  preloadRewarded();
}

/**
 * 보상형 광고 표시. 반드시 안내 시트의 버튼에서만 부른다.
 * @returns {Promise<{ earned: boolean, reason?: string }>}
 */
export async function showRewarded() {
  _init();
  if (!ad) return { earned: false, reason: 'unavailable' };
  if (isShowing) return { earned: false, reason: 'busy' };
  if (isInterstitialShowing()) return { earned: false, reason: 'busy' };
  if (_expired()) {
    isLoaded = false;
    preloadRewarded();
    return { earned: false, reason: 'not_ready' };
  }
  if (!isLoaded) {
    preloadRewarded();
    return { earned: false, reason: 'not_ready' };
  }

  earned = false;
  isShowing = true;
  _emit();
  const done = new Promise((resolve) => { finish = resolve; });
  // CLOSED 가 끝내 오지 않는 경우(OS 가 광고를 걷어가는 등) — 그때까지 받은 보상으로 마무리
  guard = setTimeout(() => {
    log('CLOSED 미수신 — 상태 복구');
    isLoaded = false;
    _settle({ earned, reason: 'timeout' });
    _emit();
  }, SHOW_GUARD);
  try {
    await ad.show();
  } catch (e) {
    log('show() 실패:', e && e.message);
    isLoaded = false;
    _settle({ earned: false, reason: 'error' });
    _emit();
  }
  return done;
}
