import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  MILITARY_INFO: '@military_info',
  LEAVE_RECORDS: '@leave_records',
  LEAVE_TOTAL: '@leave_total',
  SALARY_INFO: '@salary_info',
  TODOS: '@todos',
};

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
