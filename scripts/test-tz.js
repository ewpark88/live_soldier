/* eslint-disable no-console */
/**
 * 시간대 교차 검증 — scripts/test-calc.js 를 여러 TZ 로 반복 실행한다.
 *
 *   node scripts/test-tz.js
 *
 * 'YYYY-MM-DD' 를 new Date() 에 그대로 넘기면 UTC 자정으로 파싱되는데 읽을 때는
 * 로컬 게터를 쓴다. UTC 오프셋이 음수인 기기에서 날짜가 하루 밀리는 이 버그는
 * 한국 시간대에서만 돌려보면 절대 드러나지 않는다.
 *
 * DST 가 있는 시간대(New_York, Sao_Paulo, Sydney)와 극단 오프셋
 * (Kiritimati +14, Midway -11), 30분 단위 오프셋(Kathmandu +5:45)을 포함한다.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const ZONES = [
  'Asia/Seoul',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Australia/Sydney',
  'Pacific/Kiritimati',
  'Pacific/Midway',
  'Asia/Kathmandu',
];

const target = path.join(__dirname, 'test-calc.js');
let failed = 0;

console.log('\n──────────── 시간대 교차 검증 ────────────');
for (const tz of ZONES) {
  const res = spawnSync(process.execPath, [target], {
    env: { ...process.env, TZ: tz },
    encoding: 'utf8',
  });
  const out = (res.stdout || '') + (res.stderr || '');
  const line = out.split('\n').find((l) => l.includes('통과')) || '(출력 없음)';
  const ok = res.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ${tz.padEnd(22)} ${line.trim()}`);
  if (!ok) {
    out.split('\n').filter((l) => l.startsWith('✗') || l.includes('기대:') || l.includes('실제:'))
      .forEach((l) => console.log('    ' + l));
  }
}

console.log('');
if (failed === 0) {
  console.log(`✓ 전체 통과: ${ZONES.length}개 시간대`);
  process.exit(0);
}
console.log(`${failed}개 시간대 실패`);
process.exit(1);
