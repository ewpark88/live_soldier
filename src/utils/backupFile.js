/**
 * 백업 파일 입출력 — 내보내기는 공유 시트(카톡 나에게 보내기·드라이브·메일)로,
 * 가져오기는 파일 선택기로. 서버가 없으니 '어디에 둘지'는 사용자가 고른다.
 *
 * 네이티브 모듈(file-system / sharing / document-picker)이 없는 빌드에서는
 * available() 이 false 다 — 설정 화면이 행을 숨긴다.
 */
import { exportAll } from './storage';
import { parseBackup, backupFileName } from './backup';

let FS = null;
let Sharing = null;
let DocumentPicker = null;
try { FS = require('expo-file-system/legacy'); } catch (e) {}
try { Sharing = require('expo-sharing'); } catch (e) {}
try { DocumentPicker = require('expo-document-picker'); } catch (e) {}

export function backupAvailable() {
  return !!(FS && FS.cacheDirectory && Sharing && DocumentPicker);
}

/**
 * 전체 데이터를 JSON 파일로 만들어 공유 시트를 연다.
 * 실패하면 던진다 (호출부가 Alert).
 */
export async function exportBackupFile() {
  const backup = await exportAll();
  const uri = FS.cacheDirectory + backupFileName();
  await FS.writeAsStringAsync(uri, JSON.stringify(backup), { encoding: 'utf8' });
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
  await Sharing.shareAsync(uri, {
    mimeType: 'application/json',
    dialogTitle: '전역까지 백업 파일 저장',
    UTI: 'public.json',
  });
  return backup.data.profiles?.profiles?.length ?? 0;
}

/**
 * 파일을 골라 읽고 검증한다. 덮어쓰기는 하지 않는다 — 호출부가 확인을 받은 뒤
 * storage.importAll(text) 를 부른다.
 * @returns null(취소) | { ok, text?, summary?, reason? }
 */
export async function pickBackupFile() {
  const res = await DocumentPicker.getDocumentAsync({
    // 메신저·드라이브가 .json 을 text/plain 이나 octet-stream 으로 넘기는 경우가 많다
    type: ['application/json', 'text/plain', 'application/octet-stream', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  if (asset.size && asset.size > 5 * 1024 * 1024) return { ok: false, reason: 'data' };
  const text = await FS.readAsStringAsync(asset.uri, { encoding: 'utf8' });
  const parsed = parseBackup(text);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  return { ok: true, text, summary: parsed.summary };
}
