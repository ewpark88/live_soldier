import { Alert, Linking, Platform } from 'react-native';
import { expo as appInfo } from '../../app.json';

/**
 * 의견·문의 — 설정 화면의 두 행이 쓴다.
 *
 * 칭찬·의견은 스토어 리뷰로, 문의·버그는 이메일로 나눈다. 리뷰는 공개·익명이라
 * 재현 정보나 개인정보를 주고받을 수 없다.
 *
 * 이 버튼은 In-App Review API 를 부르지 않는다 (할당량에 걸리면 눌러도 아무 일이
 * 안 일어나서 Google 이 버튼 연결을 권장하지 않는다). 스토어 페이지로 보낸다.
 */

export const CONTACT_EMAIL = 'repo.dev88@gmail.com';
const PACKAGE = appInfo?.android?.package ?? 'com.jeonryeokkami.app';
const PLAY_MARKET = `market://details?id=${PACKAGE}&showAllReviews=true`;
const PLAY_WEB = `https://play.google.com/store/apps/details?id=${PACKAGE}&showAllReviews=true`;

let Application = null;
try { Application = require('expo-application'); } catch (e) { /* 무시 */ }
let Clipboard = null;
try { Clipboard = require('expo-clipboard'); } catch (e) { /* 무시 */ }

export async function openStoreReview() {
  const urls = Platform.OS === 'android' ? [PLAY_MARKET, PLAY_WEB] : [PLAY_WEB];
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return true;
    } catch { /* 다음 후보 */ }
  }
  Alert.alert('스토어를 열 수 없어요', 'Play 스토어에서 "전역까지"를 검색해 리뷰를 남겨주세요.');
  return false;
}

function appVersion() {
  const v = Application?.nativeApplicationVersion ?? appInfo?.version ?? '?';
  const b = Application?.nativeBuildVersion;
  return b ? `${v} (${b})` : v;
}

/** 메일 본문 — 앱·OS 버전만 싣는다. 입대일 같은 개인 데이터는 넣지 않는다. */
export function buildContactMail() {
  const subject = '[전역까지] 문의';
  const body = [
    '문의 내용을 적어주세요.',
    '(버그라면 어떤 화면에서 무엇을 눌렀을 때 생겼는지 알려주시면 큰 도움이 돼요)',
    '',
    '',
    '',
    '──────────',
    `앱 버전: ${appVersion()}`,
    `OS: ${Platform.OS} ${Platform.Version}`,
  ].join('\n');
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function openContactEmail() {
  try {
    await Linking.openURL(buildContactMail());
    return true;
  } catch {
    const buttons = [{ text: '닫기', style: 'cancel' }];
    if (Clipboard?.setStringAsync) {
      buttons.push({
        text: '주소 복사',
        onPress: () => { Clipboard.setStringAsync(CONTACT_EMAIL).catch(() => {}); },
      });
    }
    Alert.alert('메일 앱을 열 수 없어요', `아래 주소로 메일을 보내주세요.\n\n${CONTACT_EMAIL}`, buttons);
    return false;
  }
}
