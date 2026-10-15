/**
 * 공유 코드 — 서버 없이 '전역일'을 다른 기기로 옮긴다 (곰신·부모님).
 * ─────────────────────────────────────────────────────────────────────────
 *   JY1-<base64url 본문><체크섬 2자>
 *
 * 본문은 배열 JSON 이다 (키 이름을 빼서 코드를 짧게):
 *   [이름, 입대일(YYYYMMDD), 군별, 신분, 장교계급|0, 복무개월, 일병|0, 상병|0, 병장|0]
 *
 * 무엇을 싣지 않는가:
 *   · 전역일 — 받는 쪽이 입대일+개월로 다시 계산한다 (계산식이 바뀌어도 양쪽이 같다)
 *   · 휴가·일정·급여·사진 — 사생활이고, 받는 사람에게 필요 없다
 * 진급일은 사용자가 직접 고친 경우에만 싣는다 (기본값이면 받는 쪽도 같은 값을 계산).
 *
 * ⚠️ 이 파일은 import 가 없다. 맨 Node 테스트(test-share.js)가 로드하고,
 *    Hermes 의 TextEncoder/atob 유무와 상관없이 같은 결과를 내야 한다.
 */

export const SHARE_PREFIX = 'JY1-';
export const SHARE_SCHEME = 'jeonryeokkami';
export const SHARE_HOST = 'add';

const BRANCH_KEYS = ['army', 'navy', 'airforce', 'marines'];
const TYPE_KEYS = ['soldier', 'nco', 'officer'];
const NAME_MAX = 20;

/* ─── UTF-8 ⇄ 바이트 (한글 이름) ──────────────────────────────────────── */
function _utf8Encode(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    // 서로게이트 쌍(이모지) 합치기
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const lo = str.charCodeAt(i + 1);
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (lo - 0xdc00);
        i++;
      }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

function _utf8Decode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i];
    let c;
    if (b < 0x80) { c = b; i += 1; }
    else if ((b & 0xe0) === 0xc0) { c = ((b & 31) << 6) | (bytes[i + 1] & 63); i += 2; }
    else if ((b & 0xf0) === 0xe0) { c = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63); i += 3; }
    else { c = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63); i += 4; }
    if (c > 0xffff) {
      c -= 0x10000;
      s += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 1023));
    } else {
      s += String.fromCharCode(c);
    }
  }
  return s;
}

/* ─── base64url (패딩 없음) ───────────────────────────────────────────── */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function _b64urlEncode(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64[n & 63];
  }
  return out;
}

function _b64urlDecode(str) {
  const bytes = [];
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < str.length; i++) {
    const v = B64.indexOf(str[i]);
    if (v < 0) return null;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 0xff);
    }
  }
  return bytes;
}

/* ─── 체크섬 — 오타·잘린 붙여넣기를 잡는다 (보안 장치가 아니다) ─────────── */
function _fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
const CK = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';   // 헷갈리는 I·O 제외 (34자)
function _check(body) {
  const h = _fnv(body) % (CK.length * CK.length);
  return CK[Math.floor(h / CK.length)] + CK[h % CK.length];
}

/* ─── 날짜 ───────────────────────────────────────────────────────────── */
function _validYmd(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const y = Number(s.slice(0, 4)), m = Number(s.slice(5, 7)), d = Number(s.slice(8, 10));
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(y, m, 0).getDate();
}
const _pack = (s) => (_validYmd(s) ? s.replace(/-/g, '') : 0);
function _unpack(v) {
  if (v === 0 || v == null) return null;
  const s = String(v);
  if (!/^\d{8}$/.test(s)) return undefined;   // 형식 오류 (null 과 구분)
  const ymd = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return _validYmd(ymd) ? ymd : undefined;
}

/**
 * 프로필 → 공유 코드.
 * @param p { name, militaryInfo: { enlistDate, branch, personnelType, officerRank, months },
 *            promotions?: { 일병, 상병, 병장 } (사용자가 고친 경우만) }
 * @returns 코드 문자열, 입대정보가 온전하지 않으면 null
 */
export function encodeShareCode({ name, militaryInfo: mi, promotions } = {}) {
  if (!mi || !_validYmd(mi.enlistDate)) return null;
  const months = Math.floor(Number(mi.months));
  if (!Number.isFinite(months) || months < 1 || months > 600) return null;
  const branch = BRANCH_KEYS.includes(mi.branch) ? mi.branch : 'army';
  const type = TYPE_KEYS.includes(mi.personnelType) ? mi.personnelType : 'soldier';
  const officer = type !== 'soldier';
  const nm = String(name ?? '').trim().slice(0, NAME_MAX);
  const p = !officer && promotions ? promotions : null;

  const arr = [
    nm,
    _pack(mi.enlistDate),
    branch,
    type,
    officer && mi.officerRank ? String(mi.officerRank).slice(0, 12) : 0,
    months,
    p ? _pack(p.일병) : 0,
    p ? _pack(p.상병) : 0,
    p ? _pack(p.병장) : 0,
  ];
  // 뒤쪽의 0 은 잘라 코드를 짧게 (디코더가 없으면 0 으로 본다)
  while (arr.length > 6 && arr[arr.length - 1] === 0) arr.pop();

  const body = _b64urlEncode(_utf8Encode(JSON.stringify(arr)));
  return SHARE_PREFIX + body + _check(body);
}

/**
 * 임의의 텍스트(카톡 메시지 통째로, QR URL 등)에서 코드를 찾는다.
 * @returns 코드 문자열 | null
 */
export function findShareCode(text) {
  if (typeof text !== 'string') return null;
  // URL 디코딩을 하지 않는다 — 코드 문자(A-Za-z0-9_-)는 encodeURIComponent 를 그대로
  // 통과하므로 원문에서 바로 찾으면 된다. 예전엔 ?c= 를 decodeURIComponent 해서
  // '%' 가 섞인 링크(…?c=50%OFF)가 URIError 로 앱을 죽였고, 앞에 다른 사이트의
  // ?c= 링크가 있으면 진짜 코드를 놓쳤다.
  const m = text.match(/JY1-[A-Za-z0-9_-]{8,}/);
  return m ? m[0] : null;
}

/**
 * 공유 코드 → 프로필 데이터.
 * @returns {{ ok: true, value: { name, militaryInfo, promotions|null } }
 *          | { ok: false, reason: 'format' | 'checksum' | 'version' | 'data' }}
 */
export function decodeShareCode(input) {
  const code = findShareCode(input);
  if (!code) {
    // 접두사는 맞는데 다른 버전이면 '앱 업데이트' 안내를 할 수 있게 구분한다
    if (typeof input === 'string' && /JY[2-9]-/.test(input)) return { ok: false, reason: 'version' };
    return { ok: false, reason: 'format' };
  }
  const raw = code.slice(SHARE_PREFIX.length);
  if (raw.length < 4) return { ok: false, reason: 'format' };
  const body = raw.slice(0, -2);
  if (_check(body) !== raw.slice(-2)) return { ok: false, reason: 'checksum' };

  let arr;
  try {
    const bytes = _b64urlDecode(body);
    if (!bytes) return { ok: false, reason: 'format' };
    arr = JSON.parse(_utf8Decode(bytes));
  } catch (e) {
    return { ok: false, reason: 'format' };
  }
  if (!Array.isArray(arr) || arr.length < 6) return { ok: false, reason: 'data' };

  const [name, enlist, branch, type, officerRank, months, p1 = 0, p2 = 0, p3 = 0] = arr;
  const enlistDate = _unpack(enlist);
  const m = Number(months);
  if (!enlistDate || !BRANCH_KEYS.includes(branch) || !TYPE_KEYS.includes(type)
    || !Number.isInteger(m) || m < 1 || m > 600 || typeof name !== 'string') {
    return { ok: false, reason: 'data' };
  }

  const officer = type !== 'soldier';
  const promo = [_unpack(p1), _unpack(p2), _unpack(p3)];
  if (promo.some((d) => d === undefined)) return { ok: false, reason: 'data' };
  const promotions = !officer && promo.every(Boolean)
    ? { 일병: promo[0], 상병: promo[1], 병장: promo[2] }
    : null;

  return {
    ok: true,
    value: {
      name: name.trim().slice(0, NAME_MAX),
      militaryInfo: {
        enlistDate,
        branch,
        personnelType: type,
        officerRank: officer && typeof officerRank === 'string' && officerRank ? officerRank : null,
        months: m,
      },
      promotions,
    },
  };
}

/** QR·딥링크용 URL */
export function shareCodeUrl(code) {
  return `${SHARE_SCHEME}://${SHARE_HOST}?c=${encodeURIComponent(code)}`;
}

/**
 * 같은 사람의 코드인지 — 재가져오기 시 '새 프로필' 대신 '갱신'을 제안하는 기준.
 * 입대일 + 군별 + 신분이 같으면 같은 사람으로 본다 (이름은 바뀔 수 있다).
 */
export function shareIdentity(militaryInfo) {
  if (!militaryInfo) return null;
  return `${militaryInfo.enlistDate}|${militaryInfo.branch}|${militaryInfo.personnelType}`;
}

/** 실패 사유 → 사용자 문구 */
export function shareErrorMessage(reason) {
  switch (reason) {
    case 'checksum': return '코드 일부가 빠졌거나 바뀌었어요. 받은 메시지를 통째로 다시 복사해 주세요.';
    case 'version': return '더 새로운 버전의 앱에서 만든 코드예요. 앱을 업데이트해 주세요.';
    case 'data': return '코드는 읽었지만 입대 정보가 올바르지 않아요.';
    default: return "'JY1-' 로 시작하는 공유 코드를 찾지 못했어요.";
  }
}
