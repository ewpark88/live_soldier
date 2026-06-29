/**
 * 로컬 알림 (서버 없이 기기에서 예약)
 * ─────────────────────────────────────────────────────────────────────────
 * 활성 프로필의 입대정보·진급일·일정을 기반으로 전역 D-day·진급·일정 리마인더를
 * 기기 로컬에 예약한다. (원격 푸시 아님 → 서버 불필요)
 *
 * expo-notifications 는 개발 빌드에서만 동작하므로 Expo Go/미설치 환경에서는
 * try/catch 로 우회한다(AdBanner·App 패턴과 동일).
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadMilitaryInfo, loadRankPromotions, loadTodos, listProfiles,
} from './storage';
import { isOfficer } from '../constants/serviceTerms';

const NOTIF_KEY = '@notif_enabled';
const CHANNEL_ID = 'discharge-reminders';
const HOUR = 9; // 오전 9시 알림

let Notifications = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Expo Go / 미설치 환경 → 알림 비활성
}

export function isNotifAvailable() {
  return !!Notifications;
}

/** 알림 핸들러 설정 (앱 시작 시 1회) */
export function configureNotificationHandler() {
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        // 구버전 호환
        shouldShowAlert: true,
      }),
    });
  } catch (e) {}
}

async function ensureAndroidChannel() {
  if (!Notifications || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '전역 리마인더',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  } catch (e) {}
}

/** 사용자 설정값(켜짐/꺼짐). 기본 꺼짐 — 사용자가 명시적으로 켜야 함 */
export async function isNotifEnabled() {
  try {
    return (await AsyncStorage.getItem(NOTIF_KEY)) === '1';
  } catch { return false; }
}

async function setNotifEnabledFlag(on) {
  try { await AsyncStorage.setItem(NOTIF_KEY, on ? '1' : '0'); } catch {}
}

/** 권한 요청 → 허용 시 true */
export async function requestPermission() {
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch (e) {
    return false;
  }
}

/** 알림 켜기: 권한 요청 + 플래그 저장 + 예약. 성공 여부 반환 */
export async function enableNotifications() {
  if (!Notifications) return false;
  const ok = await requestPermission();
  if (!ok) return false;
  await setNotifEnabledFlag(true);
  await refreshScheduledNotifications();
  return true;
}

/** 알림 끄기: 모든 예약 취소 + 플래그 저장 */
export async function disableNotifications() {
  await setNotifEnabledFlag(false);
  if (!Notifications) return;
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (e) {}
}

/* 미래 시각(date, HOUR시)에 알림 1건 예약 */
async function scheduleAt(dateStr, title, body) {
  if (!Notifications) return;
  const when = new Date(dateStr);
  when.setHours(HOUR, 0, 0, 0);
  if (isNaN(when.getTime()) || when.getTime() <= Date.now()) return; // 과거는 스킵
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}) },
      trigger: Platform.OS === 'android'
        ? { type: 'date', channelId: CHANNEL_ID, date: when }
        : { type: 'date', date: when },
    });
  } catch (e) {}
}

function addDaysStr(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * 활성 프로필 데이터 기반으로 모든 리마인더 재예약.
 * (기존 예약 전체 취소 후 다시 등록 — 데이터 변경/프로필 전환 시 호출)
 */
export async function refreshScheduledNotifications() {
  if (!Notifications) return;
  if (!(await isNotifEnabled())) return;
  await ensureAndroidChannel();
  try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (e) {}

  const info = await loadMilitaryInfo();
  if (!info?.dischargeDate || !info?.enlistDate) return;

  let name = '';
  try {
    const { activeId, profiles } = await listProfiles();
    name = profiles.find((p) => p.id === activeId)?.name ?? '';
  } catch (e) {}
  const who = name ? `${name} · ` : '';

  const disc = info.dischargeDate;
  // 전역 카운트다운 마일스톤
  await scheduleAt(addDaysStr(disc, -100), '전역 D-100 🔥', `${who}전역까지 100일 남았어요! 이제 보입니다.`);
  await scheduleAt(addDaysStr(disc, -30),  '전역 D-30 🔥',  `${who}전역 한 달 전! 가장 설레는 시기예요.`);
  await scheduleAt(addDaysStr(disc, -7),   '전역 D-7 🏆',   `${who}전역까지 일주일! 끝까지 무사고로.`);
  await scheduleAt(addDaysStr(disc, -1),   '전역 D-1 🎖️',   `${who}내일이면 전역입니다! 마지막 밤 잘 보내요.`);
  await scheduleAt(disc,                    '전역을 축하합니다! 🎉', `${who}국방의 의무를 마쳤습니다. 정말 고생 많았어요!`);

  // 입대 100일
  await scheduleAt(addDaysStr(info.enlistDate, 99), '입대 100일 💯', `${who}벌써 입대 100일! 잘 적응하고 있어요.`);

  // 진급일 (병사)
  if (!isOfficer(info.personnelType)) {
    const promo = await loadRankPromotions(info.enlistDate);
    if (promo) {
      if (promo.일병) await scheduleAt(promo.일병, '일병 진급 🎖️', `${who}오늘은 일병 진급일이에요. 축하해요!`);
      if (promo.상병) await scheduleAt(promo.상병, '상병 진급 🎖️', `${who}오늘은 상병 진급일이에요. 축하해요!`);
      if (promo.병장) await scheduleAt(promo.병장, '병장 진급 👑', `${who}오늘은 병장 진급일이에요. 최고참!`);
    }
  }

  // 일정(일자 있는 항목) — 당일 오전 알림
  try {
    const todos = await loadTodos();
    for (const t of todos) {
      if (t.done || !t.date) continue;
      await scheduleAt(t.date, '오늘 일정 📌', `${who}${t.title || '일정'}`);
    }
  } catch (e) {}
}
