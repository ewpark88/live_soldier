/**
 * 막대병 보유·장착 상태 — 순수 함수 (import 는 순수 상수뿐, 맨 Node 테스트 대상).
 *
 *   { selected: 'run', unlocked: ['run', …], dexSeen: false }
 *
 * 기기에 붙는 상태다(테마와 같음) — 프로필을 바꾸거나 '모든 데이터 삭제'를 해도
 * 남는다. 광고를 보고 얻은 것을 회수하면 징벌적이다. 백업 파일에는 실린다.
 */
import { DEFAULT_SKIN, FREE_SKINS, SKIN_IDS } from '../constants/soldierSkins';

export const DEFAULT_SKINS_STATE = Object.freeze({
  selected: DEFAULT_SKIN,
  unlocked: FREE_SKINS,
  dexSeen: false,
});

const known = (id) => typeof id === 'string' && SKIN_IDS.includes(id);

/** 저장값/백업값 → 항상 유효한 상태. 모르는 id 는 버리고, 무료 모습은 늘 포함한다. */
export function normalizeSkins(raw) {
  const v = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const list = Array.isArray(v.unlocked) ? v.unlocked.filter(known) : [];
  const unlocked = SKIN_IDS.filter((id) => FREE_SKINS.includes(id) || list.includes(id));
  const selected = known(v.selected) && unlocked.includes(v.selected) ? v.selected : DEFAULT_SKIN;
  return { selected, unlocked, dexSeen: v.dexSeen === true };
}

export function isUnlocked(state, id) {
  return normalizeSkins(state).unlocked.includes(id);
}

export function withUnlocked(state, id) {
  const s = normalizeSkins(state);
  if (!known(id) || s.unlocked.includes(id)) return s;
  return normalizeSkins({ ...s, unlocked: [...s.unlocked, id] });
}

/** 해금된 것만 장착할 수 있다 — 아니면 상태를 그대로 돌려준다. */
export function withSelected(state, id) {
  const s = normalizeSkins(state);
  if (!s.unlocked.includes(id)) return s;
  return { ...s, selected: id };
}

/** 백업 복원 — 덮어쓰지 않고 합친다. 이 기기에서 이미 얻은 것을 잃지 않는다. */
export function mergeSkins(current, incoming) {
  const a = normalizeSkins(current);
  const b = normalizeSkins(incoming);
  const merged = normalizeSkins({
    unlocked: [...a.unlocked, ...b.unlocked],
    selected: b.selected,
    dexSeen: a.dexSeen || b.dexSeen,
  });
  return merged;
}
