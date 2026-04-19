import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  MILITARY_INFO:   '@military_info',
  LEAVE_RECORDS:   '@leave_records',
  LEAVE_TOTAL:     '@leave_total',
  LEAVE_BONUS:     '@leave_bonus',
  SALARY_INFO:     '@salary_info',
  TODOS:           '@todos',
  RANK_PROMOTIONS: '@rank_promotions', // 사용자 진급일 커스텀
};

// ─── 진급일 헬퍼 ──────────────────────────────────────────────────────
function _addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 입대일 기준 표준 진급일 계산
 * 이병→일병: 2개월, 일병→상병: 8개월, 상병→병장: 14개월 (전군 동일)
 */
export function calcDefaultPromotions(enlistDate) {
  return {
    일병: _addMonths(enlistDate, 2),
    상병: _addMonths(enlistDate, 8),
    병장: _addMonths(enlistDate, 14),
  };
}

// ─── 진급일 Storage ───────────────────────────────────────────────────
export async function loadRankPromotions(enlistDate) {
  try {
    const raw = await AsyncStorage.getItem(KEYS.RANK_PROMOTIONS);
    if (raw) return JSON.parse(raw);
    return enlistDate ? calcDefaultPromotions(enlistDate) : null;
  } catch { return null; }
}

export async function saveRankPromotions(promotions) {
  await AsyncStorage.setItem(KEYS.RANK_PROMOTIONS, JSON.stringify(promotions));
}

export async function resetRankPromotions() {
  await AsyncStorage.removeItem(KEYS.RANK_PROMOTIONS);
}

// ─── Military Info ────────────────────────────────────────────────────
export async function saveMilitaryInfo(info) {
  await AsyncStorage.setItem(KEYS.MILITARY_INFO, JSON.stringify(info));
}

export async function loadMilitaryInfo() {
  const raw = await AsyncStorage.getItem(KEYS.MILITARY_INFO);
  return raw ? JSON.parse(raw) : null;
}

// ─── Leave Records ───────────────────────────────────────────────────
export async function saveLeaveRecords(records) {
  await AsyncStorage.setItem(KEYS.LEAVE_RECORDS, JSON.stringify(records));
}

export async function loadLeaveRecords() {
  const raw = await AsyncStorage.getItem(KEYS.LEAVE_RECORDS);
  return raw ? JSON.parse(raw) : [];
}

export async function addLeaveRecord(record) {
  const records = await loadLeaveRecords();
  const newRecords = [
    { id: Date.now().toString(), ...record },
    ...records,
  ];
  await saveLeaveRecords(newRecords);
  return newRecords;
}

export async function deleteLeaveRecord(id) {
  const records = await loadLeaveRecords();
  const updated = records.filter((r) => r.id !== id);
  await saveLeaveRecords(updated);
  return updated;
}

export async function saveLeaveTotal(total) {
  await AsyncStorage.setItem(KEYS.LEAVE_TOTAL, String(total));
}

export async function loadLeaveTotal() {
  const raw = await AsyncStorage.getItem(KEYS.LEAVE_TOTAL);
  return raw ? parseInt(raw, 10) : 21;
}

// ─── Leave Bonus (포상휴가) ────────────────────────────────────────────
export async function loadLeaveBonusRecords() {
  const raw = await AsyncStorage.getItem(KEYS.LEAVE_BONUS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveLeaveBonusRecords(records) {
  await AsyncStorage.setItem(KEYS.LEAVE_BONUS, JSON.stringify(records));
}

export async function addLeaveBonusRecord(record) {
  const records = await loadLeaveBonusRecords();
  const newRecords = [{ id: Date.now().toString(), ...record }, ...records];
  await saveLeaveBonusRecords(newRecords);
  return newRecords;
}

export async function deleteLeaveBonusRecord(id) {
  const records = await loadLeaveBonusRecords();
  const updated = records.filter((r) => r.id !== id);
  await saveLeaveBonusRecords(updated);
  return updated;
}

// ─── Salary Info ──────────────────────────────────────────────────────
export async function saveSalaryInfo(info) {
  await AsyncStorage.setItem(KEYS.SALARY_INFO, JSON.stringify(info));
}

export async function loadSalaryInfo() {
  const raw = await AsyncStorage.getItem(KEYS.SALARY_INFO);
  return raw ? JSON.parse(raw) : null;
}

// ─── Todos ────────────────────────────────────────────────────────────
export async function saveTodos(todos) {
  await AsyncStorage.setItem(KEYS.TODOS, JSON.stringify(todos));
}

export async function loadTodos() {
  const raw = await AsyncStorage.getItem(KEYS.TODOS);
  return raw ? JSON.parse(raw) : [];
}

export async function addTodo(todo) {
  const todos = await loadTodos();
  const newTodos = [{ id: Date.now().toString(), done: false, ...todo }, ...todos];
  await saveTodos(newTodos);
  return newTodos;
}

export async function toggleTodo(id) {
  const todos = await loadTodos();
  const updated = todos.map((t) =>
    t.id === id ? { ...t, done: !t.done } : t
  );
  await saveTodos(updated);
  return updated;
}

export async function deleteTodo(id) {
  const todos = await loadTodos();
  const updated = todos.filter((t) => t.id !== id);
  await saveTodos(updated);
  return updated;
}
