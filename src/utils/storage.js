import AsyncStorage from '@react-native-async-storage/async-storage';
import { calcDischargeDate, formatDate } from './dateUtils';

/**
 * 멀티 프로필 저장소
 * ─────────────────────────────────────────────────────────────────────────
 * 모든 군생활 데이터(입대정보/휴가/급여/일정/진급일)는 "프로필" 단위로 보관된다.
 * 화면 코드는 기존 공개 함수(loadMilitaryInfo 등)를 그대로 호출하며, 내부적으로
 * "활성 프로필" 범위에서 읽고 쓴다. (본인 / 남자친구 / 아들 등 여러 명 등록)
 *
 * 저장 구조: @profiles_v1 = { activeId, profiles: [ { id, name, photo, data } ] }
 *   data = { militaryInfo, leaveRecords, leaveTotal, leaveBonus, salaryInfo, todos, rankPromotions }
 */

const STORE_KEY = '@profiles_v1';
const THEME_KEY = '@theme_mode';
export const MAX_PROFILES = 6;

/* 구버전(단일 프로필) 키 — 최초 1회 마이그레이션 시에만 읽음 */
const LEGACY = {
  MILITARY_INFO:   '@military_info',
  LEAVE_RECORDS:   '@leave_records',
  LEAVE_TOTAL:     '@leave_total',
  LEAVE_BONUS:     '@leave_bonus',
  SALARY_INFO:     '@salary_info',
  TODOS:           '@todos',
  RANK_PROMOTIONS: '@rank_promotions',
};

/** 안전한 JSON 파싱 — 손상/널이면 fallback 반환 */
function _safeParse(raw, fallback) {
  if (raw == null) return fallback;
  try {
    const v = JSON.parse(raw);
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

function _emptyData() {
  return {
    personnelType:  null,   // 'soldier' | 'nco' | 'officer' (온보딩에서 결정)
    militaryInfo:   null,
    leaveRecords:   [],
    leaveTotal:     21,
    leaveBonus:     [],
    salaryInfo:     null,
    todos:          [],
    rankPromotions: null,
  };
}

function _newProfile(name, photo = null, data = null) {
  return {
    id:    'p' + Date.now().toString() + Math.floor(Math.random() * 1000),
    name:  name || '본인',
    photo: photo || null,
    data:  data || _emptyData(),
  };
}

/* ─── 마이그레이션: 레거시 단일 데이터 → 프로필 1개 ───────────────────── */
async function _migrateLegacy() {
  const data = _emptyData();

  const mi = _safeParse(await AsyncStorage.getItem(LEGACY.MILITARY_INFO), null);
  if (mi && typeof mi === 'object') {
    // 전역일 off-by-one 교정(입대일+개월-1일)을 마이그레이션 시점에 흡수
    if (mi.enlistDate && mi.months) {
      mi.dischargeDate = formatDate(calcDischargeDate(mi.enlistDate, mi.months));
    }
    data.militaryInfo = mi;
  }

  const lr = _safeParse(await AsyncStorage.getItem(LEGACY.LEAVE_RECORDS), null);
  if (Array.isArray(lr)) data.leaveRecords = lr;
  const ltRaw = await AsyncStorage.getItem(LEGACY.LEAVE_TOTAL);
  if (ltRaw != null) data.leaveTotal = parseInt(ltRaw, 10) || 21;
  const lb = _safeParse(await AsyncStorage.getItem(LEGACY.LEAVE_BONUS), null);
  if (Array.isArray(lb)) data.leaveBonus = lb;
  const si = _safeParse(await AsyncStorage.getItem(LEGACY.SALARY_INFO), null);
  if (si && typeof si === 'object') data.salaryInfo = si;
  const td = _safeParse(await AsyncStorage.getItem(LEGACY.TODOS), null);
  if (Array.isArray(td)) data.todos = td;
  const rp = _safeParse(await AsyncStorage.getItem(LEGACY.RANK_PROMOTIONS), null);
  if (rp && typeof rp === 'object') data.rankPromotions = rp;

  const profile = _newProfile('본인', null, data);
  return { activeId: profile.id, profiles: [profile] };
}

/* ─── 저장소 로드/세이브 (자가 마이그레이션) ───────────────────────────── */
async function _loadStore() {
  const raw = await AsyncStorage.getItem(STORE_KEY);
  if (raw) {
    try {
      const store = JSON.parse(raw);
      if (store && Array.isArray(store.profiles) && store.profiles.length) return store;
    } catch {}
  }
  const migrated = await _migrateLegacy();
  await _saveStore(migrated);
  return migrated;
}

async function _saveStore(store) {
  await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function _activeIndex(store) {
  const idx = store.profiles.findIndex((p) => p.id === store.activeId);
  return idx >= 0 ? idx : 0;
}

/* 활성 프로필의 data 필드 1개 읽기 */
async function _getField(key) {
  const store = await _loadStore();
  const p = store.profiles[_activeIndex(store)];
  return p && p.data ? p.data[key] : undefined;
}

/* 활성 프로필의 data 필드 1개 쓰기 */
async function _setField(key, value) {
  const store = await _loadStore();
  const i = _activeIndex(store);
  store.profiles[i] = {
    ...store.profiles[i],
    data: { ..._emptyData(), ...store.profiles[i].data, [key]: value },
  };
  await _saveStore(store);
  return value;
}

/* 앱 시작 시 1회 호출(선택) — 저장소 보장 + 레거시 마이그레이션 트리거 */
export async function initStorage() {
  await _loadStore();
}

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
    const rp = await _getField('rankPromotions');
    if (rp) return rp;
    return enlistDate ? calcDefaultPromotions(enlistDate) : null;
  } catch { return null; }
}

export async function saveRankPromotions(promotions) {
  await _setField('rankPromotions', promotions);
}

export async function resetRankPromotions() {
  await _setField('rankPromotions', null);
}

// ─── Military Info ────────────────────────────────────────────────────
export async function saveMilitaryInfo(info) {
  await _setField('militaryInfo', info);
}

export async function loadMilitaryInfo() {
  return (await _getField('militaryInfo')) ?? null;
}

// ─── 신분(병사/부사관/장교) ────────────────────────────────────────────
// 온보딩에서 입대정보 입력 전에 신분을 먼저 정하므로 militaryInfo와 별도로 보관.
// 우선순위: data.personnelType > militaryInfo.personnelType > null(미설정)
export async function loadPersonnelType() {
  const direct = await _getField('personnelType');
  if (direct) return direct;
  const mi = await _getField('militaryInfo');
  return mi?.personnelType ?? null;
}

export async function savePersonnelType(type) {
  await _setField('personnelType', type);
}

// ─── Leave Records ───────────────────────────────────────────────────
export async function saveLeaveRecords(records) {
  await _setField('leaveRecords', records);
}

export async function loadLeaveRecords() {
  return (await _getField('leaveRecords')) ?? [];
}

export async function addLeaveRecord(record) {
  const records = await loadLeaveRecords();
  const newRecords = [{ id: Date.now().toString(), ...record }, ...records];
  await saveLeaveRecords(newRecords);
  return newRecords;
}

export async function deleteLeaveRecord(id) {
  const updated = (await loadLeaveRecords()).filter((r) => r.id !== id);
  await saveLeaveRecords(updated);
  return updated;
}

export async function saveLeaveTotal(total) {
  await _setField('leaveTotal', total);
}

export async function loadLeaveTotal() {
  const v = await _getField('leaveTotal');
  return v == null ? 21 : v;
}

// ─── Leave Bonus (포상휴가) ────────────────────────────────────────────
export async function loadLeaveBonusRecords() {
  return (await _getField('leaveBonus')) ?? [];
}

export async function saveLeaveBonusRecords(records) {
  await _setField('leaveBonus', records);
}

export async function addLeaveBonusRecord(record) {
  const records = await loadLeaveBonusRecords();
  const newRecords = [{ id: Date.now().toString(), ...record }, ...records];
  await saveLeaveBonusRecords(newRecords);
  return newRecords;
}

export async function deleteLeaveBonusRecord(id) {
  const updated = (await loadLeaveBonusRecords()).filter((r) => r.id !== id);
  await saveLeaveBonusRecords(updated);
  return updated;
}

// ─── Salary Info ──────────────────────────────────────────────────────
export async function saveSalaryInfo(info) {
  await _setField('salaryInfo', info);
}

export async function loadSalaryInfo() {
  return (await _getField('salaryInfo')) ?? null;
}

// ─── Todos ────────────────────────────────────────────────────────────
export async function saveTodos(todos) {
  await _setField('todos', todos);
}

export async function loadTodos() {
  return (await _getField('todos')) ?? [];
}

export async function addTodo(todo) {
  const todos = await loadTodos();
  const newTodos = [{ id: Date.now().toString(), done: false, ...todo }, ...todos];
  await saveTodos(newTodos);
  return newTodos;
}

export async function toggleTodo(id) {
  const todos = await loadTodos();
  const updated = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  await saveTodos(updated);
  return updated;
}

export async function deleteTodo(id) {
  const updated = (await loadTodos()).filter((t) => t.id !== id);
  await saveTodos(updated);
  return updated;
}

// ─── 프로필 관리 API ──────────────────────────────────────────────────
/** 프로필 목록 + 활성 id (스위처 표시용 요약) */
export async function listProfiles() {
  const store = await _loadStore();
  return {
    activeId: store.activeId,
    profiles: store.profiles.map((p) => ({
      id:           p.id,
      name:         p.name,
      photo:        p.photo,
      militaryInfo: p.data ? p.data.militaryInfo : null,
    })),
  };
}

export async function getActiveProfileId() {
  return (await _loadStore()).activeId;
}

/** 활성 프로필 전환 */
export async function setActiveProfile(id) {
  const store = await _loadStore();
  if (store.profiles.some((p) => p.id === id)) {
    store.activeId = id;
    await _saveStore(store);
  }
  return store.activeId;
}

/** 프로필 추가 (추가 후 자동 전환). 최대 MAX_PROFILES개. 새 id 반환(한도 초과 시 null) */
export async function addProfile(name, photo = null) {
  const store = await _loadStore();
  if (store.profiles.length >= MAX_PROFILES) return null;
  const profile = _newProfile(name, photo);
  store.profiles.push(profile);
  store.activeId = profile.id;
  await _saveStore(store);
  return profile.id;
}

/** 프로필 이름/사진 수정 (photo: null이면 제거, undefined면 변경 안 함) */
export async function updateProfile(id, { name, photo } = {}) {
  const store = await _loadStore();
  const i = store.profiles.findIndex((p) => p.id === id);
  if (i < 0) return;
  if (name != null)      store.profiles[i].name  = name;
  if (photo !== undefined) store.profiles[i].photo = photo;
  await _saveStore(store);
}

/** 프로필 삭제 (최소 1개 유지). 활성 프로필 삭제 시 첫 프로필로 전환. 새 활성 id 반환 */
export async function deleteProfile(id) {
  const store = await _loadStore();
  if (store.profiles.length <= 1) return store.activeId;
  store.profiles = store.profiles.filter((p) => p.id !== id);
  if (store.activeId === id) store.activeId = store.profiles[0].id;
  await _saveStore(store);
  return store.activeId;
}

// ─── 테마 모드 ('system' | 'light' | 'dark') — 앱 전역 UI 설정 ─────────
export async function loadThemeMode() {
  try {
    const v = await AsyncStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch { return 'system'; }
}

export async function saveThemeMode(mode) {
  try { await AsyncStorage.setItem(THEME_KEY, mode); } catch {}
}

// ─── 전체 데이터 삭제 (모든 프로필/군생활 데이터 초기화) ────────────────
// 테마 모드 같은 앱 UI 설정은 유지하고, 사용자가 입력한 데이터만 모두 지운다.
// 삭제 후 빈 프로필 1개로 재초기화되어 온보딩부터 다시 시작된다.
export async function clearAllData() {
  await AsyncStorage.multiRemove([
    STORE_KEY,
    LEGACY.MILITARY_INFO,
    LEGACY.LEAVE_RECORDS,
    LEGACY.LEAVE_TOTAL,
    LEGACY.LEAVE_BONUS,
    LEGACY.SALARY_INFO,
    LEGACY.TODOS,
    LEGACY.RANK_PROMOTIONS,
  ]);
  // 빈 프로필 1개로 재생성
  const fresh = { activeId: null, profiles: [_newProfile('본인')] };
  fresh.activeId = fresh.profiles[0].id;
  await _saveStore(fresh);
}
