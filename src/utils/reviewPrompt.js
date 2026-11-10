import AsyncStorage from '@react-native-async-storage/async-storage';
import { todayStr } from './daily';

/**
 * 인앱 리뷰 요청 (Google Play In-App Review API · expo-store-review).
 *
 * 정책·가이드라인 때문에 지키는 것:
 *  - 팝업 전에 "앱이 마음에 드세요?" 같은 사전 질문을 하지 않는다 (만족한 사람만
 *    리뷰로 보내는 필터링으로 본다). 보상·별점 유도 문구도 없다.
 *  - 버튼으로 이 API 를 부르지 않는다 — 할당량에 걸리면 아무 일도 안 일어난다.
 *    설정의 "스토어에 리뷰 남기기" 는 스토어 페이지 링크다 (utils/feedback.js).
 *  - 충분히 써본 뒤(설치 3일·실행한 날 3일·주요 저장 3회) 저장 흐름이 끝난
 *    지점에서만 요청한다. 앱 실행·탭 전환에서는 부르지 않는다.
 *  - 같은 저장에서 전면광고가 떴으면 요청하지 않는다 — 광고 위에 팝업을 쌓지 않는다.
 *  - 실제로 뜰지는 Google 할당량이 정한다. 우리 쪽에서도 90일 간격·누적 3회로 아낀다.
 *
 * 어떤 실패도 저장 흐름을 끊지 않는다 — 전부 삼킨다.
 */

const KEY = '@review_v1';

export const REVIEW_RULES = {
  MIN_INSTALL_DAYS: 3,
  MIN_OPEN_DAYS: 3,
  MIN_SAVES: 3,
  COOLDOWN_DAYS: 90,
  MAX_ASKS: 3,
};
const DAY = 24 * 60 * 60 * 1000;
const ASK_DELAY = 1200;      // 모달이 닫히고 성공 햅틱이 끝난 뒤
const MAX_OPEN_DAYS_KEPT = 10;

let StoreReview = null;
try { StoreReview = require('expo-store-review'); } catch (e) { /* Expo Go 등 */ }

const log = (...a) => { if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[Review]', ...a); };

const EMPTY = { firstOpenAt: null, openDays: [], saves: 0, lastAskedAt: null, askCount: 0 };

async function load() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== 'object') return { ...EMPTY };
    return {
      firstOpenAt: Number.isFinite(v.firstOpenAt) ? v.firstOpenAt : null,
      openDays: Array.isArray(v.openDays) ? v.openDays.filter((x) => typeof x === 'string') : [],
      saves: Number.isFinite(v.saves) ? v.saves : 0,
      lastAskedAt: Number.isFinite(v.lastAskedAt) ? v.lastAskedAt : null,
      askCount: Number.isFinite(v.askCount) ? v.askCount : 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

async function save(state) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 무시 */ }
}

/** 순수 판단 — 테스트가 직접 부른다. */
export function shouldAsk(state, now, adShown) {
  if (adShown) return false;
  if (!state || state.firstOpenAt == null) return false;
  if (now - state.firstOpenAt < REVIEW_RULES.MIN_INSTALL_DAYS * DAY) return false;
  if ((state.openDays?.length ?? 0) < REVIEW_RULES.MIN_OPEN_DAYS) return false;
  if ((state.saves ?? 0) < REVIEW_RULES.MIN_SAVES) return false;
  if ((state.askCount ?? 0) >= REVIEW_RULES.MAX_ASKS) return false;
  if (state.lastAskedAt && now - state.lastAskedAt < REVIEW_RULES.COOLDOWN_DAYS * DAY) return false;
  return true;
}

/** 앱 실행 시 1회 — 처음 연 시각과 '실행한 날'을 남긴다. */
export async function recordAppOpen() {
  try {
    const now = new Date();
    const s = await load();
    if (!s.firstOpenAt) s.firstOpenAt = now.getTime();
    const k = todayStr(now);
    if (!s.openDays.includes(k)) {
      s.openDays = [...s.openDays, k].slice(-MAX_OPEN_DAYS_KEPT);
    }
    await save(s);
  } catch { /* 무시 */ }
}

let inFlight = false;

/**
 * 주요 저장(전역 정보·휴가·할 일·급여) 직후 — useShowInterstitial.show() 가 부른다.
 * @returns {Promise<boolean>} 리뷰 요청을 실제로 보냈는지 (테스트용)
 */
export async function noteMajorSave({ adShown = false, delayMs = ASK_DELAY } = {}) {
  if (inFlight) return false;
  inFlight = true;
  try {
    const s = await load();
    s.saves = (s.saves ?? 0) + 1;
    const now = Date.now();
    if (!shouldAsk(s, now, adShown)) {
      await save(s);
      return false;
    }
    if (!StoreReview || !(await StoreReview.isAvailableAsync())) {
      await save(s);
      return false;
    }
    // 요청 전에 먼저 기록한다 — 팝업 도중 앱이 죽어도 다음 저장에서 또 부르지 않게
    s.lastAskedAt = now;
    s.askCount = (s.askCount ?? 0) + 1;
    await save(s);
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    await StoreReview.requestReview();
    log('리뷰 요청', s.askCount);
    return true;
  } catch (e) {
    log('리뷰 요청 실패', e?.message);
    return false;
  } finally {
    inFlight = false;
  }
}
