/**
 * 입대일 + 복무개월 → 전역일 계산
 */
export function calcDischargeDate(enlistDate, months) {
  const d = new Date(enlistDate);
  d.setMonth(d.getMonth() + months);
  // 전역일 = 복무 마지막 날 (실제로는 복무 종료일 전날이지만 편의상 당일로 표시)
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
 * 0~2개월: 이병, 3~5: 일병, 6~9: 상병, 10~: 병장
 */
export function calcRank(servedDays) {
  const months = Math.floor(servedDays / 30);
  if (months < 3) return '이병';
  if (months < 6) return '일병';
  if (months < 10) return '상병';
  return '병장';
}

/**
 * 랜덤 응원 메시지
 */
const MESSAGES = [
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
];

export function getRandomMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
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
