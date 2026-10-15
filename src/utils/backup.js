/**
 * 백업 파일 형식 — 내보내기/가져오기의 순수 부분 (import 없음, 맨 Node 테스트 대상).
 *
 *   {
 *     app: 'jeonryeokkami',
 *     schema: 1,
 *     exportedAt: ISO 문자열,
 *     data: {
 *       profiles: { activeId, profiles: [{ id, name, photo:null, data }] },
 *       theme:    @theme_v2 값 | null,
 *       streak:   @streak_v1 값 | null,
 *       uiPrefs:  @ui_prefs_v1 값 | null,
 *     }
 *   }
 *
 * 알림 설정은 담지 않는다 — 새 기기에서는 알림 권한부터 다시 받아야 해서,
 * '켜짐'을 복원하면 권한 없이 켜진 척하는 스위치가 된다.
 * 프로필 사진은 담지 않는다 — 파일 경로는 다른 기기에서 의미가 없고, 이미지를
 * 통째로 넣으면 백업이 메신저로 못 보낼 만큼 커진다.
 */

export const BACKUP_APP = 'jeonryeokkami';
export const BACKUP_SCHEMA = 1;

/** 저장소 원본 → 백업 객체 */
export function buildBackup({ store, theme = null, streak = null, uiPrefs = null }, now = new Date()) {
  const profiles = store && Array.isArray(store.profiles)
    ? {
      activeId: store.activeId,
      profiles: store.profiles.map((p) => ({ ...p, photo: null })),
    }
    : null;
  return {
    app: BACKUP_APP,
    schema: BACKUP_SCHEMA,
    exportedAt: now.toISOString(),
    data: { profiles, theme, streak, uiPrefs },
  };
}

function _isObj(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * 백업 텍스트/객체 검증.
 * @returns {{ ok: true, value, summary: { count, names, exportedAt } }
 *          | { ok: false, reason: 'json' | 'app' | 'schema' | 'data' }}
 */
export function parseBackup(input) {
  let obj = input;
  if (typeof input === 'string') {
    try { obj = JSON.parse(input.replace(/^﻿/, '')); } catch (e) { return { ok: false, reason: 'json' }; }
  }
  if (!_isObj(obj) || obj.app !== BACKUP_APP) return { ok: false, reason: 'app' };
  if (typeof obj.schema !== 'number' || obj.schema > BACKUP_SCHEMA) return { ok: false, reason: 'schema' };

  const d = obj.data;
  const ps = d && d.profiles;
  if (!_isObj(d) || !_isObj(ps) || !Array.isArray(ps.profiles) || ps.profiles.length === 0) {
    return { ok: false, reason: 'data' };
  }
  for (const p of ps.profiles) {
    if (!_isObj(p) || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string') {
      return { ok: false, reason: 'data' };
    }
    if (p.data != null && !_isObj(p.data)) return { ok: false, reason: 'data' };
  }
  const ids = new Set(ps.profiles.map((p) => p.id));
  if (ids.size !== ps.profiles.length) return { ok: false, reason: 'data' };

  const store = {
    activeId: ids.has(ps.activeId) ? ps.activeId : ps.profiles[0].id,
    // 사진 경로는 다른 기기에서 깨진 이미지가 된다 — 들어와도 버린다
    profiles: ps.profiles.map((p) => ({ id: p.id, name: p.name, photo: null, data: p.data || {} })),
  };

  return {
    ok: true,
    value: {
      store,
      theme: _isObj(d.theme) ? d.theme : null,
      streak: _isObj(d.streak) ? d.streak : null,
      uiPrefs: _isObj(d.uiPrefs) ? d.uiPrefs : null,
    },
    summary: {
      count: store.profiles.length,
      names: store.profiles.map((p) => p.name),
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : null,
    },
  };
}

/** 'YYYYMMDD' 파일명 꼬리 */
export function backupFileName(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `jeonryeokkami_backup_${y}${m}${d}.json`;
}

export function backupErrorMessage(reason) {
  switch (reason) {
    case 'json': return '파일을 읽을 수 없어요. 전역까지에서 내보낸 백업 파일(.json)인지 확인해 주세요.';
    case 'app': return '전역까지 백업 파일이 아니에요.';
    case 'schema': return '더 새로운 버전의 앱에서 만든 백업이에요. 앱을 업데이트한 뒤 다시 시도해 주세요.';
    default: return '백업 파일의 내용이 손상되었어요.';
  }
}
