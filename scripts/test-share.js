/* eslint-disable no-console */
/**
 * 공유 코드 · 백업 형식 검증 (의존성 없음).
 *
 *   node scripts/test-share.js
 *
 * shareCode.js / backup.js 는 import 가 없는 순수 JS 다. test-calc.js 와 같은
 * 방식으로 export 만 걷어내 맨 Node 에서 실제 소스를 돌린다.
 *
 * 이 파일이 지키는 것: 보낸 코드가 받는 쪽에서 **같은 값**으로 풀릴 것,
 * 잘리거나 바뀐 코드가 엉뚱한 전역일로 조용히 풀리지 않을 것.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = path.join(__dirname, '..', 'src', 'utils');

function load(file) {
  const code = fs.readFileSync(path.join(SRC, file), 'utf8')
    .replace(/^\s*import[^\n]*\n/gm, '')
    .replace(/^export\s+/gm, '');
  const names = new Set();
  let m;
  const reFn = /^function\s+([A-Za-z0-9_$]+)/gm;
  const reConst = /^const\s+([A-Za-z0-9_$]+)\s*=/gm;
  while ((m = reFn.exec(code))) names.add(m[1]);
  while ((m = reConst.exec(code))) names.add(m[1]);
  const sandbox = { console, Date, Math, JSON, String, Number, Array, Set, encodeURIComponent, decodeURIComponent };
  vm.createContext(sandbox);
  vm.runInContext(code + '\nthis.__api = { ' + [...names].join(', ') + ' };', sandbox);
  return sandbox.__api;
}

const C = load('shareCode.js');
const B = load('backup.js');

let pass = 0, fail = 0;
const fails = [];
function eq(a, e, label) {
  if (JSON.stringify(a) === JSON.stringify(e)) pass++;
  else { fail++; fails.push(`✗ ${label}\n    기대: ${JSON.stringify(e)}\n    실제: ${JSON.stringify(a)}`); }
}
function ok(c, label) { eq(!!c, true, label); }

/* ── 1. 왕복 ── */
const soldier = {
  name: '김민준',
  militaryInfo: { enlistDate: '2025-03-10', branch: 'army', personnelType: 'soldier', officerRank: null, months: 18, dischargeDate: '2026-09-09' },
};
const code = C.encodeShareCode(soldier);
ok(code && code.startsWith('JY1-'), '인코딩: 접두사');
ok(code.length < 80, `인코딩: 짧다 (${code.length}자 — 카톡 한 줄)`);
ok(/^JY1-[A-Za-z0-9_-]+$/.test(code), '인코딩: URL·QR 안전 문자만');
{
  const r = C.decodeShareCode(code);
  eq(r.ok, true, '왕복: 성공');
  eq(r.value.name, '김민준', '왕복: 한글 이름');
  eq(r.value.militaryInfo, { enlistDate: '2025-03-10', branch: 'army', personnelType: 'soldier', officerRank: null, months: 18 }, '왕복: 입대정보 (전역일은 싣지 않음)');
  eq(r.value.promotions, null, '왕복: 진급일 기본값이면 null');
}
{
  const r = C.decodeShareCode(C.encodeShareCode({ ...soldier, name: '🐻곰돌이 아들' }));
  eq(r.value.name, '🐻곰돌이 아들', '왕복: 이모지(서로게이트 쌍)');
}
{
  const promo = { 일병: '2025-05-10', 상병: '2025-11-10', 병장: '2026-05-01' };
  const r = C.decodeShareCode(C.encodeShareCode({ ...soldier, promotions: promo }));
  eq(r.value.promotions, promo, '왕복: 직접 고친 진급일');
}
{
  const officer = {
    name: '이소위',
    militaryInfo: { enlistDate: '2024-03-01', branch: 'airforce', personnelType: 'officer', officerRank: '소위', months: 36 },
    promotions: { 일병: '2024-05-01', 상병: '2024-11-01', 병장: '2025-05-01' },
  };
  const r = C.decodeShareCode(C.encodeShareCode(officer));
  eq([r.value.militaryInfo.personnelType, r.value.militaryInfo.officerRank, r.value.militaryInfo.months], ['officer', '소위', 36], '왕복: 장교');
  eq(r.value.promotions, null, '왕복: 간부는 병 진급일을 싣지 않음');
}
{
  const r = C.decodeShareCode(C.encodeShareCode({ ...soldier, name: '' }));
  eq(r.value.name, '', '왕복: 빈 이름 허용 (받는 쪽이 기본 이름을 붙인다)');
}
eq(C.decodeShareCode(C.encodeShareCode({ ...soldier, name: 'a'.repeat(50) })).value.name.length, 20, '이름: 20자로 자름');

/* ── 2. 인코딩 거부 ── */
eq(C.encodeShareCode({}), null, '인코딩: 입대정보 없음');
eq(C.encodeShareCode({ militaryInfo: { ...soldier.militaryInfo, enlistDate: '2025-02-30' } }), null, '인코딩: 없는 날짜');
eq(C.encodeShareCode({ militaryInfo: { ...soldier.militaryInfo, months: 0 } }), null, '인코딩: 0개월');
ok(C.decodeShareCode(C.encodeShareCode({ militaryInfo: { ...soldier.militaryInfo, branch: '??' } })).value.militaryInfo.branch === 'army', '인코딩: 모르는 군별은 육군');

/* ── 3. 찾기 — 메시지 통째로 붙여넣어도 된다 ── */
const msg = `[전역까지] 김민준 님의 전역일을 함께 세어요!\n앱에서 '공유 코드로 추가'에 붙여넣으세요:\n${code}\nhttps://play.google.com/store/apps/details?id=x`;
eq(C.findShareCode(msg), code, '찾기: 카톡 메시지 전체');
eq(C.decodeShareCode(msg).ok, true, '찾기: 메시지 전체로 바로 디코드');
eq(C.findShareCode(C.shareCodeUrl(code)), code, '찾기: QR 딥링크 URL');
eq(C.shareCodeUrl(code).startsWith('jeonryeokkami://add?c=JY1-'), true, 'URL: 스킴');
eq(C.findShareCode('https://shop.example/?c=50%OFF\n' + code), code, '찾기: % 섞인 다른 링크가 있어도 죽지 않음');
eq(C.decodeShareCode('jeonryeokkami://add?c=%').ok, false, '찾기: 깨진 딥링크는 실패로 (예외 아님)');
eq(C.findShareCode('https://m.site.com/view?a=1&c=xyz\n' + code), code, '찾기: 앞의 무관한 ?c= 링크에 속지 않음');
eq(C.findShareCode('안녕하세요'), null, '찾기: 코드 없음');
eq(C.findShareCode(null), null, '찾기: null');

/* ── 4. 손상 — 조용히 엉뚱한 값으로 풀리면 안 된다 ── */
eq(C.decodeShareCode('아무 말').reason, 'format', '손상: 코드 없음');
eq(C.decodeShareCode(code.slice(0, -3)).ok, false, '손상: 끝이 잘림');
{
  // 본문 한 글자만 바꿔도 체크섬이 잡아야 한다
  let caught = 0, total = 0;
  const body = code.slice(4, -2);
  for (let i = 0; i < body.length; i++) {
    const ch = body[i] === 'A' ? 'B' : 'A';
    const bad = 'JY1-' + body.slice(0, i) + ch + body.slice(i + 1) + code.slice(-2);
    total++;
    if (!C.decodeShareCode(bad).ok) caught++;
  }
  eq(caught, total, `손상: 한 글자 변조 ${total}곳 전부 거부`);
}
eq(C.decodeShareCode('JY2-abcdefghijk').reason, 'version', '손상: 다른 버전 코드는 업데이트 안내');
{
  // 체크섬은 맞지만 내용이 틀린 코드 (직접 조작)
  const forge = (arr) => {
    const json = JSON.stringify(arr);
    const bytes = []; for (const ch of Buffer.from(json, 'utf8')) bytes.push(ch);
    const body = C._b64urlEncode(bytes);
    return 'JY1-' + body + C._check(body);
  };
  eq(C.decodeShareCode(forge(['a', '20250230', 'army', 'soldier', 0, 18])).reason, 'data', '내용: 없는 날짜');
  eq(C.decodeShareCode(forge(['a', '20250310', 'space', 'soldier', 0, 18])).reason, 'data', '내용: 모르는 군별');
  eq(C.decodeShareCode(forge(['a', '20250310', 'army', 'soldier', 0, 0])).reason, 'data', '내용: 0개월');
  eq(C.decodeShareCode(forge(['a', '20250310', 'army', 'soldier', 0, 18.5])).reason, 'data', '내용: 소수 개월');
  eq(C.decodeShareCode(forge(['a', '20250310', 'army', 'soldier', 0, 18, '2025'])).reason, 'data', '내용: 진급일 형식 오류');
  eq(C.decodeShareCode(forge({ a: 1 })).reason, 'data', '내용: 배열 아님');
  eq(C.decodeShareCode(forge(['a', '20250310', 'army', 'soldier', 0, 18, '20250510'])).value.promotions, null, '내용: 진급일 일부만 있으면 무시');
}
eq(C.shareIdentity(soldier.militaryInfo), '2025-03-10|army|soldier', '동일인: 입대일|군별|신분');
ok(C.shareErrorMessage('checksum').length > 0, '문구: 체크섬');

/* ── 5. 백업 형식 ── */
const store = {
  activeId: 'p2',
  profiles: [
    { id: 'p1', name: '본인', photo: 'file:///x.jpg', data: { todos: [] } },
    { id: 'p2', name: '아들', photo: null, data: { militaryInfo: soldier.militaryInfo } },
  ],
};
const bk = B.buildBackup({ store, theme: { themeId: 'sunset' } }, new Date(2026, 9, 14, 9));
eq([bk.app, bk.schema], ['jeonryeokkami', 1], '백업: 헤더');
eq(bk.data.profiles.profiles[0].photo, null, '백업: 사진 제거');
eq(store.profiles[0].photo, 'file:///x.jpg', '백업: 원본은 건드리지 않음');
{
  const r = B.parseBackup(JSON.stringify(bk));
  eq(r.ok, true, '백업 파싱: 왕복');
  eq(r.value.store.activeId, 'p2', '백업 파싱: 활성 프로필');
  eq(r.summary, { count: 2, names: ['본인', '아들'], exportedAt: bk.exportedAt }, '백업 파싱: 요약');
  eq(r.value.theme, { themeId: 'sunset' }, '백업 파싱: 테마');
  eq(r.value.streak, null, '백업 파싱: 없는 항목은 null');
}
eq(B.parseBackup('﻿' + JSON.stringify(bk)).ok, true, '백업 파싱: BOM 허용 (메모장 저장)');
eq(B.parseBackup('not json').reason, 'json', '백업 파싱: JSON 아님');
eq(B.parseBackup('{"app":"x"}').reason, 'app', '백업 파싱: 다른 앱');
eq(B.parseBackup({ ...bk, schema: 99 }).reason, 'schema', '백업 파싱: 미래 스키마');
eq(B.parseBackup({ ...bk, data: { profiles: { profiles: [] } } }).reason, 'data', '백업 파싱: 프로필 없음');
eq(B.parseBackup({ ...bk, data: { profiles: { profiles: [{ id: 'a', name: 'x' }, { id: 'a', name: 'y' }] } } }).reason, 'data', '백업 파싱: 중복 id');
eq(B.parseBackup({ ...bk, data: { profiles: { profiles: [{ id: 'a', name: 1 }] } } }).reason, 'data', '백업 파싱: 이름 타입');
{
  const r = B.parseBackup({ ...bk, data: { profiles: { activeId: 'zz', profiles: [{ id: 'a', name: 'x', photo: 'file:///y' }] } } });
  eq([r.value.store.activeId, r.value.store.profiles[0].photo], ['a', null], '백업 파싱: 없는 activeId·사진 경로 보정');
}
eq(B.backupFileName(new Date(2026, 0, 5)), 'jeonryeokkami_backup_20260105.json', '백업: 파일명');

console.log('\n──────────── 공유 코드 · 백업 테스트 ────────────');
if (fail === 0) { console.log(`✓ 전체 통과: ${pass}건`); process.exit(0); }
console.log(`통과 ${pass} / 실패 ${fail}\n`);
fails.forEach((f) => console.log(f + '\n'));
process.exit(1);
