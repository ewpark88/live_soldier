/**
 * 전역일 공유 — 서버 없이 RN 기본 Share API로 텍스트 카드 공유.
 * 카톡/인스타/문자 등 어디로든 공유되며, 앱 스토어 링크가 포함돼 바이럴 유입에 사용.
 */
import { Share } from 'react-native';
import { calcDaysLeft, calcProgress, calcServedDays, formatDateKo } from './dateUtils';

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.jeonryeokkami.app';
const BRANCH_LABEL = { army: '육군', navy: '해군', airforce: '공군', marines: '해병대' };

/**
 * 공유 메시지 생성
 * @param {object} info  militaryInfo
 * @param {string} rank  현재 계급/구분 라벨
 * @param {string} name  프로필 이름(선택)
 */
export function buildShareMessage(info, rank, name) {
  const dleft = calcDaysLeft(info.dischargeDate);
  const progress = calcProgress(info.enlistDate, info.dischargeDate);
  const served = calcServedDays(info.enlistDate);
  const who = name ? `${name} · ` : '';
  const branch = BRANCH_LABEL[info.branch] ?? '';
  const ddayText = dleft > 0 ? `전역까지 D-${dleft}` : dleft === 0 ? '오늘 전역! 🎉' : '전역 완료! 🎉';

  return (
    `🎖️ ${ddayText}\n` +
    `${who}${branch} ${rank}\n` +
    `복무 ${served}일째 · 진행률 ${progress}%\n` +
    `${formatDateKo(info.dischargeDate)} 전역\n\n` +
    `'전역까지' 앱에서 함께 카운트다운 🪖\n${STORE_URL}`
  );
}

/** 공유 시트 열기 */
export async function shareDischarge(info, rank, name) {
  if (!info?.dischargeDate) return;
  try {
    await Share.share({ message: buildShareMessage(info, rank, name) });
  } catch (e) {
    // 사용자가 취소하거나 공유 불가 — 조용히 무시
  }
}

/**
 * 마일스톤 축하 공유 메시지.
 * 기존 buildShareMessage 와 톤·구조를 일부러 맞춘다 (같은 앱의 같은 목소리).
 */
export function buildMilestoneMessage(info, milestone, rank, name) {
  const dleft = calcDaysLeft(info.dischargeDate);
  const served = calcServedDays(info.enlistDate);
  const who = name ? `${name} · ` : '';
  const branch = BRANCH_LABEL[info.branch] ?? '';
  const ddayText = dleft > 0 ? `전역까지 D-${dleft}` : '전역 완료! 🎉';

  return (
    `${milestone.emoji ?? '🎖️'} ${milestone.label}!\n` +
    `${who}${branch} ${rank}\n` +
    `복무 ${served}일째 · ${ddayText}\n\n` +
    `'전역까지' 앱에서 함께 카운트다운 🪖\n${STORE_URL}`
  );
}

export async function shareMilestone(info, milestone, rank, name) {
  if (!info?.dischargeDate || !milestone) return;
  try {
    await Share.share({ message: buildMilestoneMessage(info, milestone, rank, name) });
  } catch (e) {
    // 취소/불가 — 조용히 무시
  }
}

/** 출석 스트릭 자랑 (30·100일 티어 도달 시) */
export function buildStreakMessage(streak, info, name) {
  const who = name ? `${name} · ` : '';
  const dleft = info?.dischargeDate ? calcDaysLeft(info.dischargeDate) : null;
  const dday = dleft != null && dleft > 0 ? `\n전역까지 D-${dleft}` : '';

  return (
    `🔥 ${streak.current}일 연속 출석!\n` +
    `${who}최고 기록 ${streak.best}일 · 누적 ${streak.total}일${dday}\n\n` +
    `'전역까지' 앱에서 함께 카운트다운 🪖\n${STORE_URL}`
  );
}

export async function shareStreak(streak, info, name) {
  if (!streak?.current) return;
  try {
    await Share.share({ message: buildStreakMessage(streak, info, name) });
  } catch (e) {
    // 취소/불가 — 조용히 무시
  }
}
