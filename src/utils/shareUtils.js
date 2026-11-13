/**
 * 전역일 공유 — 서버 없이 RN 기본 Share API로 텍스트 카드 공유.
 * 카톡/인스타/문자 등 어디로든 공유되며, 앱 스토어 링크가 포함돼 바이럴 유입에 사용.
 */
import { Share } from 'react-native';
import { calcDaysLeft, calcProgress, calcServedDays, formatDateKo } from './dateUtils';
import { branchLabelOf, josa, termsFor } from '../constants/serviceTerms';

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.jeonryeokkami.app';

/** '육군 병장' · '사회복무요원' — 군별이 없으면(대체복무) 신분 라벨만 */
function _whoLine(info, rank) {
  return [branchLabelOf(info), rank].filter(Boolean).join(' ');
}

/**
 * 공유 메시지 생성
 * @param {object} info  militaryInfo
 * @param {string} rank  현재 계급/구분 라벨
 * @param {string} name  프로필 이름(선택)
 */
export function buildShareMessage(info, rank, name) {
  const dleft = calcDaysLeft(info.dischargeDate);
  const progress = calcProgress(info.enlistDate, info.dischargeDate);
  const served = calcServedDays(info.enlistDate, info.dischargeDate);
  const who = name ? `${name} · ` : '';
  const t = termsFor(info.personnelType);
  const ddayText = dleft > 0 ? `${t.end}까지 D-${dleft}` : dleft === 0 ? `오늘 ${t.end}! 🎉` : `${t.endDone}! 🎉`;

  return (
    `🎖️ ${ddayText}\n` +
    `${who}${_whoLine(info, rank)}\n` +
    `복무 ${served}일째 · 진행률 ${progress}%\n` +
    `${formatDateKo(info.dischargeDate)} ${t.end}\n\n` +
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
  const served = calcServedDays(info.enlistDate, info.dischargeDate);
  const who = name ? `${name} · ` : '';
  const t = termsFor(info.personnelType);
  const ddayText = dleft > 0 ? `${t.end}까지 D-${dleft}` : `${t.endDone}! 🎉`;

  return (
    `${milestone.emoji ?? '🎖️'} ${milestone.label}!\n` +
    `${who}${_whoLine(info, rank)}\n` +
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
  const dday = dleft != null && dleft > 0 ? `\n${termsFor(info?.personnelType).end}까지 D-${dleft}` : '';

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

/**
 * 가족·곰신에게 보내는 공유 코드 메시지.
 * 받는 쪽은 이 메시지를 **통째로** 붙여넣어도 된다 (shareCode.findShareCode 가 코드를 찾는다).
 */
export function buildFamilyShareMessage(name, info, code) {
  const who = name ? `${name} 님의` : '제';
  const dleft = info?.dischargeDate ? calcDaysLeft(info.dischargeDate) : null;
  const dday = dleft != null && dleft > 0 ? ` (D-${dleft})` : '';
  const t = termsFor(info?.personnelType);
  return (
    `${t.emoji} ${who} ${josa(t.endDate, '을/를')} 같이 세어요!\n` +
    (info?.dischargeDate ? `${formatDateKo(info.dischargeDate)} ${t.end}${dday}\n\n` : '\n') +
    `① '전역까지' 앱 설치\n${STORE_URL}\n` +
    `② 프로필 '추가' → '공유 코드로 추가'에 이 메시지를 붙여넣기\n\n` +
    `${code}`
  );
}
