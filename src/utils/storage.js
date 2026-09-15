import AsyncStorage from '@react-native-async-storage/async-storage';
import { calcDischargeDate, calcPromotionDate, formatDate } from './dateUtils';
import { resolveLeaveDays } from '../constants/serviceTerms';

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
const STORE_BACKUP_KEY = '@profiles_v1.bak';  // 마지막으로 정상 파싱된 스냅샷

/* 레코드 id 생성 — Date.now() 만 쓰면 같은 밀리초에 만든 둘이 충돌한다.
   충돌하면 삭제·완료토글이 엉뚱한 항목을 건드린다. */
let _idSeq = 0;
function _newId() {
  _idSeq = (_idSeq + 1) % 1000000;
  return `${Date.now().toString(36)}_${_idSeq.toString(36)}`;
}
const THEME_KEY = '@theme_mode';      // 레거시 — @theme_v2 로 흡수됨 (write-through 유지)
const THEME_V2_KEY = '@theme_v2';
const STREAK_KEY = '@streak_v1';
const PREFS_KEY = '@ui_prefs_v1';
export const MAX_PROFILES = 12;

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

function _warn(msg, e) {
  if (__DEV__) console.warn('[storage] ' + msg + ':', e && e.message ? e.message : e);
}

/** 프로필이 하나도 없는 기본 저장소 (읽기 실패 시 이번 세션 한정 폴백) */
function _emptyStore() {
  const profile = _newProfile('본인');
  // __degraded: 저장소를 못 읽어서 만든 임시 상태라는 표시.
  // 이게 백업까지 덮어쓰면 (안드로이드의 전형적 실패인 '읽기만 실패' 상황에서)
  // 살아 있던 원본과 백업이 둘 다 날아간다.
  return { activeId: profile.id, profiles: [profile], __degraded: true };
}

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
    leaveTotal:     null,   // null = 미설정 → 군종 기본값 사용
    leaveBonus:     [],
    salaryInfo:     null,
    todos:          [],
    rankPromotions: null,
    savingsPlan:    null,   // { monthly, months } 장병내일준비적금 입력값
    // 이미 축하한 마일스톤 key 목록.
    //   null = 아직 시딩 전 (기존 사용자/신규 프로필)
    //   []   = 시딩 완료
    // 프로필 범위라 프로필 전환·삭제·초기화가 공짜로 올바르게 동작한다.
    celebrated:     null,
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
  if (ltRaw != null) { const n = parseInt(ltRaw, 10); if (Number.isFinite(n) && n > 0) data.leaveTotal = n; }
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
  let raw = null;
  try {
    raw = await AsyncStorage.getItem(STORE_KEY);
  } catch (e) {
    // 저장소 자체를 못 읽는 상황 — 덮어쓰면 안 된다. 빈 저장소로 이번 세션만 버틴다.
    _warn('저장소를 읽을 수 없습니다', e);
    return _emptyStore();
  }

  if (raw) {
    const parsed = _parseStore(raw);
    if (parsed) {
      await _snapshot(raw);   // 마지막 정상 상태를 남겨둔다
      return parsed;
    }
    _warn('저장소가 손상되었습니다', '파싱 실패 또는 형태 불일치');

    // 손상된 값을 그대로 덮어쓰면 프로필이 통째로 사라진다.
    // 마지막 정상 스냅샷이 있으면 그것으로 되살린다.
    try {
      const backup = await AsyncStorage.getItem(STORE_BACKUP_KEY);
      const restored = backup ? _parseStore(backup) : null;
      if (restored) {
        _warn('백업에서 복구합니다', '마지막 정상 스냅샷 사용');
        await _saveStore(restored);
        return restored;
      }
    } catch (e) {
      _warn('백업 복구 실패', e);
    }
  }

  const migrated = await _migrateLegacy();
  await _saveStore(migrated);
  return migrated;
}

/** 저장소 문자열 → store 객체. 형태가 아니면 null */
function _parseStore(raw) {
  try {
    const store = JSON.parse(raw);
    if (store && Array.isArray(store.profiles) && store.profiles.length) return store;
  } catch (e) { /* 아래에서 null */ }
  return null;
}

// 내용이 실제로 바뀐 경우에만 스냅샷을 갱신한다.
// (세션당 1회로 묶으면 그 뒤에 추가된 프로필이 백업에 안 들어간다)
let _lastSnapshot = null;
async function _snapshot(raw) {
  if (raw === _lastSnapshot) return;
  try {
    await AsyncStorage.setItem(STORE_BACKUP_KEY, raw);
    _lastSnapshot = raw;   // 성공한 뒤에 표시한다 — 먼저 찍으면 실패해도 재시도되지 않는다
  } catch (e) {
    _warn('스냅샷 저장 실패', e);
  }
}

async function _saveStore(store) {
  if (store && store.__degraded) {
    // 읽기 실패로 만든 임시 상태는 절대 영속화하지 않는다
    _warn('임시 상태라 저장을 건너뜁니다', '__degraded');
    return;
  }
  let json;
  try {
    json = JSON.stringify(store);
  } catch (e) {
    _warn('직렬화 실패', e);
    return;
  }
  try {
    await AsyncStorage.setItem(STORE_KEY, json);
  } catch (e) {
    _warn('저장 실패', e);
    return;
  }
  // 방금 쓴 값이 곧 '마지막 정상 상태'다. 읽기 시점에만 스냅샷을 뜨면
  // 백업이 항상 한 번씩 뒤처져서, 복구해도 마지막 변경이 사라진다.
  await _snapshot(json);
}

function _activeIndex(store) {
  const idx = store.profiles.findIndex((p) => p.id === store.activeId);
  return idx >= 0 ? idx : 0;
}

/* 활성 프로필의 data 필드 1개 읽기 */
async function _getField(key) {
  try {
    const store = await _loadStore();
    const p = store.profiles[_activeIndex(store)];
    return p && p.data ? p.data[key] : undefined;
  } catch (e) {
    // 화면이 로딩 상태로 영구히 멈추지 않도록 undefined 로 떨어뜨린다
    _warn(`'${key}' 읽기 실패`, e);
    return undefined;
  }
}

/* 활성 프로필의 data 필드 1개 쓰기 */
async function _setField(key, value) {
  // 실패하면 호출부(화면의 저장 핸들러)가 알 수 있게 그대로 던진다.
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
/**
 * 입대일 기준 표준 진급일 계산
 * 이병→일병: 2개월, 일병→상병: 8개월, 상병→병장: 14개월 (전군 동일)
 *
 * 월 계산은 dateUtils.calcPromotionDate 하나로 통일한다 — 예전에는 여기
 * _addMonths 가 setMonth 를 그대로 써서 월말 입대자의 진급일이 다음 달로
 * 굴러갔다 (2024-01-31 +8개월 → 2024-10-01, 정답은 2024-09-30).
 */
export function calcDefaultPromotions(enlistDate) {
  const 일병 = calcPromotionDate(enlistDate, 2);
  if (!일병) return null;
  return {
    일병,
    상병: calcPromotionDate(enlistDate, 8),
    병장: calcPromotionDate(enlistDate, 14),
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

/**
 * 활성 프로필의 입대정보.
 *
 * dischargeDate 는 enlistDate + months 에서 나온 파생값이라 읽을 때마다 다시
 * 계산한다. DischargeScreen 이 저장 시점에 한 번 계산해 넣어두지만, 계산식이
 * 바뀌어도(월말 입대자의 전역일 보정 등) 이미 저장된 값은 그대로 남기 때문에
 * 다시 저장하기 전까지 틀린 날짜를 계속 보게 된다.
 *
 * 재계산 방식이라 별도 마이그레이션이 필요 없고 여러 번 실행해도 결과가 같다.
 * enlistDate/months 가 온전치 않으면 저장된 값을 그대로 돌려준다.
 */
export async function loadMilitaryInfo() {
  return _withRecomputedDischarge((await _getField('militaryInfo')) ?? null);
}

/** 저장된 입대정보의 파생값(전역일)을 현재 계산식으로 맞춰 돌려준다 */
function _withRecomputedDischarge(info) {
  if (!info) return null;

  const months = Number(info.months);
  if (!Number.isFinite(months) || months <= 0) return info;

  const recomputed = calcDischargeDate(info.enlistDate, months);
  if (!recomputed) return info;

  const dischargeDate = formatDate(recomputed);
  return dischargeDate && dischargeDate !== info.dischargeDate
    ? { ...info, dischargeDate }
    : info;
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
  const newRecords = [{ id: _newId(), ...record }, ...records];
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

/**
 * 기본 연가 일수. 사용자가 직접 설정한 값이 있으면 그것을, 없으면 군종 기본값.
 * (육군·해병대 24 / 해군 27 / 공군 28 — serviceTerms.leaveDays)
 */
export async function loadLeaveTotal() {
  const v = await _getField('leaveTotal');
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return n;
  const mi = await loadMilitaryInfo();
  return resolveLeaveDays(mi?.branch);
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
  const newRecords = [{ id: _newId(), ...record }, ...records];
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

// ─── 적금 플랜 (장병내일준비적금 입력값) ──────────────────────────────
export async function loadSavingsPlan() {
  return (await _getField('savingsPlan')) ?? null;
}

export async function saveSavingsPlan(plan) {
  await _setField('savingsPlan', plan);
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
  const newTodos = [{ id: _newId(), done: false, ...todo }, ...todos];
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
      // loadMilitaryInfo 와 같은 보정을 거친다 — widgetData 가 이 경로로 읽으므로
      // 빼먹으면 앱과 홈 위젯의 전역일이 며칠씩 어긋난다.
      militaryInfo: _withRecomputedDischarge(p.data ? p.data.militaryInfo : null),
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

// ─── 테마 설정 v2 (테마 + 밝기 + 해금) ─────────────────────────────────
// 기기 범위다. 프로필은 본인/남친/아들이지만 "보는 사람"은 한 명이라,
// 프로필을 바꿀 때마다 앱이 재도색되면 방향감각이 무너진다.
//
//   { themeId, mode, unlocked: [], introSeen }
//
// 마이그레이션 원칙: 기존 사용자를 강제로 재도색하지 않는다.
//   @theme_v2 있음                       → 그대로
//   없음 + (@theme_mode 또는 프로필 존재) → 기존 사용자 → forest 유지, introSeen:false
//   없음 + 아무것도 없음                  → 신규 설치   → 기본 테마, introSeen:true
export const DEFAULT_THEME_SETTINGS = {
  themeId: 'nightvision',
  legacyThemeId: 'forest',
  mode: 'system',
  unlocked: [],
  introSeen: true,
};

export async function loadThemeSettings() {
  try {
    const raw = await AsyncStorage.getItem(THEME_V2_KEY);
    if (raw) {
      const v = _safeParse(raw, {});
      return {
        themeId: typeof v.themeId === 'string' ? v.themeId : DEFAULT_THEME_SETTINGS.themeId,
        mode: ['system', 'light', 'dark'].includes(v.mode) ? v.mode : 'system',
        unlocked: Array.isArray(v.unlocked) ? v.unlocked : [],
        introSeen: v.introSeen !== false,
      };
    }

    const [legacyMode, store] = await Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(STORE_KEY),
    ]);
    const existing = !!legacyMode || !!store;

    const next = existing
      ? {
        themeId: DEFAULT_THEME_SETTINGS.legacyThemeId,
        mode: ['light', 'dark', 'system'].includes(legacyMode) ? legacyMode : 'system',
        unlocked: [],
        introSeen: false, // 설정 화면 테마 행에 NEW 배지를 한 번 띄운다
      }
      : {
        themeId: DEFAULT_THEME_SETTINGS.themeId,
        mode: 'system',
        unlocked: [],
        introSeen: true,
      };

    await AsyncStorage.setItem(THEME_V2_KEY, JSON.stringify(next));
    return next;
  } catch {
    return { themeId: DEFAULT_THEME_SETTINGS.themeId, mode: 'system', unlocked: [], introSeen: true };
  }
}

export async function saveThemeSettings(patch) {
  try {
    const cur = await loadThemeSettings();
    const next = { ...cur, ...patch };
    await AsyncStorage.setItem(THEME_V2_KEY, JSON.stringify(next));
    // 롤백 안전망 — 구버전이 읽는 키에도 계속 써 둔다 (2릴리스 후 제거)
    if (patch.mode) await AsyncStorage.setItem(THEME_KEY, patch.mode);
    return next;
  } catch {
    return null;
  }
}

/** 해금은 단조 증가한다 — 한 번 열리면 절대 회수하지 않는다 */
export async function unlockTheme(themeId) {
  const cur = await loadThemeSettings();
  if (cur.unlocked.includes(themeId)) return cur;
  return saveThemeSettings({ unlocked: [...cur.unlocked, themeId] });
}

// ─── 마일스톤 축하 이력 (프로필 범위) ─────────────────────────────────
export async function loadCelebrated() {
  return _getField('celebrated');
}

/** 합집합으로 저장 — 이미 축하한 항목은 절대 되돌리지 않는다 */
export async function markCelebrated(keys) {
  const cur = (await _getField('celebrated')) ?? [];
  const next = [...new Set([...cur, ...keys])];
  await _setField('celebrated', next);
  return next;
}

// ─── 출석 스트릭 ──────────────────────────────────────────────────────
// 기기 범위다. "며칠 연속 앱을 열었나"는 프로필(본인/남친/아들)이 아니라
// 사람의 행동이다. 프로필 2개를 쓰는 사용자가 스트릭을 반으로 쪼개 갖는 건
// 명백히 틀렸다. clearAllData 에서도 살아남는다.
export async function loadStreak() {
  try {
    const raw = await AsyncStorage.getItem(STREAK_KEY);
    return _safeParse(raw, null);
  } catch { return null; }
}

export async function saveStreak(state) {
  try { await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(state)); } catch {}
}

// ─── UI 환경설정 (햅틱 / 애니메이션 줄이기) ────────────────────────────
// 테마 모드와 마찬가지로 프로필 바깥에 저장한다 — 사람이 아니라 기기 설정이다.
export const DEFAULT_UI_PREFS = { haptics: true, reduceMotion: false };

export async function loadUIPrefs() {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    const v = _safeParse(raw, {});
    return {
      haptics: typeof v.haptics === 'boolean' ? v.haptics : DEFAULT_UI_PREFS.haptics,
      reduceMotion: typeof v.reduceMotion === 'boolean' ? v.reduceMotion : DEFAULT_UI_PREFS.reduceMotion,
    };
  } catch {
    return { ...DEFAULT_UI_PREFS };
  }
}

export async function saveUIPrefs(prefs) {
  try { await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

// ─── 전체 데이터 삭제 (모든 프로필/군생활 데이터 초기화) ────────────────
// 테마·해금(@theme_v2)·알림·모션 설정은 유지하고, 사용자가 입력한 데이터만
// 모두 지운다. 해금은 복무의 결과이지 데이터가 아니라, 회수하면 징벌적이다.
// 삭제 후 빈 프로필 1개로 재초기화되어 온보딩부터 다시 시작된다.
export async function clearAllData() {
  await AsyncStorage.multiRemove([
    STORE_KEY,
    STORE_BACKUP_KEY,   // 백업을 남기면 손상 복구 경로가 삭제한 데이터를 되살린다
    LEGACY.MILITARY_INFO,
    LEGACY.LEAVE_RECORDS,
    LEGACY.LEAVE_TOTAL,
    LEGACY.LEAVE_BONUS,
    LEGACY.SALARY_INFO,
    LEGACY.TODOS,
    LEGACY.RANK_PROMOTIONS,
  ]);
  _lastSnapshot = null;   // 메모리 캐시도 비워야 다음 저장이 백업을 새로 쓴다

  // 빈 프로필 1개로 재생성
  const fresh = { activeId: null, profiles: [_newProfile('본인')] };
  fresh.activeId = fresh.profiles[0].id;
  await _saveStore(fresh);
}
