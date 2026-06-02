/**
 * 입대일 + 복무개월 → 전역일 계산
 * 전역일(만료일) = 입대일 + N개월 - 1일.
 * 예) 2024-01-02 입대, 18개월 → 2025-07-01 전역.
 * (입대일이 복무 1일째이므로 만료일은 N개월째 되는 날의 전날)
 */
export function calcDischargeDate(enlistDate, months) {
  const d = new Date(enlistDate);
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() - 1);
  return d;
}

/**
 * 두 날짜 사이 남은 일수 (D-Day)
 */
export function calcDaysLeft(targetDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  const diff = target - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * 총 복무 일수 대비 오늘까지 복무한 진행률 (0~100)
 */
export function calcProgress(enlistDate, dischargeDate) {
  const start = new Date(enlistDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dischargeDate);
  end.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const total = end - start;
  const elapsed = now - start;

  if (elapsed <= 0) return 0;
  if (elapsed >= total) return 100;
  return Math.floor((elapsed / total) * 100);
}

/**
 * 복무한 날수
 */
export function calcServedDays(enlistDate) {
  const start = new Date(enlistDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = now - start;
  if (diff < 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Date → 'YYYY-MM-DD'
 */
export function formatDate(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Date → 'YYYY년 MM월 DD일'
 */
export function formatDateKo(date) {
  const d = new Date(date);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/**
 * 'YYYY-MM-DD' 형식 유효성 검사
 */
export function isValidDateString(str) {
  if (!str || str.length !== 10) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(str)) return false;
  const date = new Date(str);
  return !isNaN(date.getTime());
}

/**
 * 현재 복무 중인 계급 계산 (병사 기준)
 * 전군 동일: 이병 0~2개월, 일병 2~8개월, 상병 8~14개월, 병장 14개월~
 * (출처: 병역법 시행령 / SBS뉴스 2019)
 * 해군·공군은 총 복무 기간이 길어 병장 기간이 더 길 뿐, 진급 기준은 동일
 */
export function calcRank(servedDays) {
  // 30.44 = 평균 월일수 (365.25 / 12)
  const months = servedDays / 30.44;
  if (months < 2)  return '이병';
  if (months < 8)  return '일병';
  if (months < 14) return '상병';
  return '병장';
}

/**
 * 진급일 기록을 기준으로 현재 계급 계산
 * promotionDates: { 일병: 'YYYY-MM-DD', 상병: 'YYYY-MM-DD', 병장: 'YYYY-MM-DD' }
 */
export function calcRankFromPromotions(promotionDates) {
  if (!promotionDates) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const toDate = (s) => {
    const d = new Date(s);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  if (promotionDates.병장 && now >= toDate(promotionDates.병장)) return '병장';
  if (promotionDates.상병 && now >= toDate(promotionDates.상병)) return '상병';
  if (promotionDates.일병 && now >= toDate(promotionDates.일병)) return '일병';
  return '이병';
}

/**
 * 다음 진급(계급) 정보 계산
 * 아직 도래하지 않은 가장 빠른 진급일을 반환. 병장까지 모두 진급했으면 null.
 * @returns {{ rank: string, date: string, daysLeft: number } | null}
 */
export function nextPromotion(promotionDates) {
  if (!promotionDates) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const order = [
    { rank: '일병', date: promotionDates.일병 },
    { rank: '상병', date: promotionDates.상병 },
    { rank: '병장', date: promotionDates.병장 },
  ];
  for (const p of order) {
    if (!p.date) continue;
    const d = new Date(p.date);
    d.setHours(0, 0, 0, 0);
    if (d > now) return { rank: p.rank, date: p.date, daysLeft: calcDaysLeft(p.date) };
  }
  return null; // 병장 진급 완료 (더 이상 진급 없음)
}

/**
 * 복무 단계(phase)별 응원 메시지
 * phase 값은 전역까지 남은 일수 기준: done / d3 / d7 / d30 / d100 / normal
 * 남은 일수별 군인 심리를 고려해 메시지를 다르게 제공.
 */
const PHASE_MESSAGES = {
  done: [
    '🎉 전역을 진심으로 축하합니다! 정말 고생 많았어!',
    '드디어 자유다! 그동안 정말 수고 많았어 🫡',
    '국방의 의무를 마친 당신, 자랑스럽습니다!',
    '이제 진짜 시작이다. 새로운 출발을 응원해!',
  ],
  d3: [
    '전역이 코앞! 마지막까지 안전하게 마무리하자 🎖️',
    '딱 3일! 짐 정리하며 설레는 중이지? 😆',
    '거의 다 왔어. 마지막 밤들만 잘 보내면 끝!',
    '곧 민간인! 마지막까지 무사고로 가자!',
  ],
  d7: [
    '전역까지 일주일! 손에 잡힐 듯 가깝다 🏆',
    '카운트다운 일주일. 이젠 정말 실감 나지?',
    '7일이면 끝! 끝까지 컨디션 관리하자.',
    '한 주만 더! 전역 후 계획은 다 세웠어?',
  ],
  d30: [
    '전역 한 달 전! 가장 설레는 시기야 🔥',
    '말출 곧이다! 한 달만 더 버티면 끝.',
    '30일 남았어. 마지막 한 달, 후회 없이!',
    '한 달이면 사회인이다. 조금만 더 힘내!',
  ],
  d100: [
    '전역 100일 전! 이제 보인다 💪',
    '세 자리 수 진입! 여기서부터는 금방 가.',
    '백일 남았어. 곰신·가족도 함께 기다리는 중!',
    '100일의 기적, 이제 시작이다!',
  ],
  normal: [
    '오늘도 수고했어! 조금만 더 버텨봐 💪',
    '전역은 반드시 온다. 믿어!',
    '하루하루가 전역에 가까워지고 있어!',
    '포기하지 마. 넌 할 수 있어!',
    '국가의 부름에 응한 용사, 자랑스러워!',
    '훈련은 힘들지만 추억이 될 거야!',
    '오늘 하루도 무사히! 건강이 최우선이야.',
    '힘내! 전역 후의 자유가 기다리고 있어!',
    '군 생활, 나중에 웃으며 얘기할 수 있을 거야.',
    '오늘의 고생이 내일의 추억이 된다!',
    '카운트다운 시작! 넌 잘 하고 있어.',
    '부모님도 응원하고 있어. 파이팅!',
    '전역 후 먹을 치킨 생각하며 버텨!',
    '한 걸음씩, 천천히. 넌 잘 해낼 거야.',
    '오늘도 무결점 복무! 최고야!',
  ],
};

/** 복무 단계에 맞는 응원 메시지 1개 (랜덤) */
export function getMessageForPhase(phase) {
  const pool = PHASE_MESSAGES[phase] ?? PHASE_MESSAGES.normal;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** 단계 무관 랜덤 응원 메시지 (fallback) */
export function getRandomMessage() {
  return getMessageForPhase('normal');
}

/**
 * 복무 개월 수 계산
 */
export function calcServedMonths(enlistDate) {
  const start = new Date(enlistDate);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12;
  months += now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months--;
  return Math.max(0, months);
}
