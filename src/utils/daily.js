/**
 * 날짜 결정적(date-stable) 선택 — "오늘"에 고정된 콘텐츠를 뽑는다.
 *
 * 순수 함수만 있고 import 가 없다 (테스트·위젯 안전).
 *
 * 왜 해시 난수가 아니라 회전인가:
 *   pool[hash(date) % len] 는 연속 이틀 충돌이 1/len 확률로 난다. 풀이 15개면
 *   보름에 한 번꼴로 "어제랑 똑같잖아"가 발생한다. 반면 (dayIndex + off) % len
 *   회전은 매일 정확히 한 칸 전진하므로 연속 중복이 구조적으로 불가능하고,
 *   풀을 전부 소진한 뒤에야 순환한다.
 *   salt 로 만든 오프셋은 서로 다른 풀들이 같은 날 같은 위상으로 움직이는 걸
 *   막는다 (메시지와 팁이 한 몸처럼 굴러가면 변화가 반감된다).
 */

/** 로컬 달력 기준 'YYYY-MM-DD' */
export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' → 안정된 정수 (로컬 달력일 기준, 시간대·DST 무관) */
export function dayIndex(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return 0;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** FNV-1a 32bit */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < String(str).length; i += 1) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 날짜에 고정된 항목 하나 (같은 날엔 몇 번을 불러도 같다) */
export function pickDaily(pool, dateStr, salt = '') {
  if (!pool || !pool.length) return null;
  const idx = (dayIndex(dateStr) + hash32(salt)) % pool.length;
  return pool[idx];
}

/** 두 'YYYY-MM-DD' 사이의 일수 차 (b - a) */
export function dayDiff(a, b) {
  return dayIndex(b) - dayIndex(a);
}
