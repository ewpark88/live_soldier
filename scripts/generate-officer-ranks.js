/**
 * 간부(부사관·장교) 계급장 이미지 생성 스크립트
 * 실행: node scripts/generate-officer-ranks.js   (또는 npm run ranks)
 * 필요: sharp (devDependencies), 인터넷 연결
 *
 * 대한민국 국군(육군) 표준 견장 계급장 SVG를 위키미디어 커먼즈에서 내려받아
 * 그대로 PNG로 변환한다. (출처: ko.wikipedia.org/wiki/대한민국_국군 계급장 도판)
 *  - 라이선스: 대한민국 정부 공식 계급장 기호(자유 이용 가능)
 *  - 파일: SouthKorea-Army-OR/OF-*.svg  (NATO 코드 기반 표준 도판)
 *
 * Special:FilePath 는 파일 실제 업로드 URL로 리다이렉트되는 안정적 주소다.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'ranks');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const API = 'https://commons.wikimedia.org/w/api.php';

/* 계급(한글) → { 위키미디어 커먼즈 SVG 파일명, 출력 PNG 파일명(ASCII) }
 * ⚠️ 출력 파일명은 반드시 ASCII. Metro가 한글 파일명을 동일 안드로이드 리소스로
 *    충돌시켜 계급장이 뒤바뀌므로(중위→대령 등) 로마자 파일명을 사용한다. */
const RANKS = {
  // 부사관 (OR: Other Ranks)
  하사: { file: 'SouthKorea-Army-OR-5.svg', out: 'hasa' },
  중사: { file: 'SouthKorea-Army-OR-6.svg', out: 'jungsa' },
  상사: { file: 'SouthKorea-Army-OR-7.svg', out: 'sangsa' },
  원사: { file: 'SouthKorea-Army-OR-8.svg', out: 'wonsa' },
  // 위관 (OF: Officers)
  소위: { file: 'SouthKorea-Army-OF-1a.svg', out: 'sowi' },
  중위: { file: 'SouthKorea-Army-OF-1b.svg', out: 'jungwi' },
  대위: { file: 'SouthKorea-Army-OF-2.svg', out: 'daewi' },
  // 영관
  소령: { file: 'SouthKorea-Army-OF-3.svg', out: 'soryeong' },
  중령: { file: 'SouthKorea-Army-OF-4.svg', out: 'jungryeong' },
  대령: { file: 'SouthKorea-Army-OF-5.svg', out: 'daeryeong' },
};

/* 견장 높이 기준으로 렌더(세로로 긴 도판). 투명 배경 유지. */
const RENDER_HEIGHT = 512;

const UA = 'jeonryeokkami-rank-fetch/1.0 (build script)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchBuffer(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 && i < tries - 1) {
      await sleep(3000 * (i + 1)); // 백오프 후 재시도
      continue;
    }
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
}

/* imageinfo API 한 번으로 모든 파일의 실제 CDN URL을 해석한다. */
async function resolveUrls(files) {
  const titles = files.map((f) => 'File:' + f).join('|');
  const api = `${API}?action=query&format=json&prop=imageinfo&iiprop=url&titles=${encodeURIComponent(titles)}`;
  const data = await fetchJson(api);
  const map = {};
  for (const page of Object.values(data.query.pages)) {
    const title = page.title.replace(/^File:/, '').replace(/ /g, '_');
    map[title] = page.imageinfo[0].url;
  }
  return map;
}

(async () => {
  // 이미 생성된 파일은 건너뛴다(레이트리밋 시 재개 가능). FORCE=1 이면 전부 재생성.
  const force = process.env.FORCE === '1';
  const pending = Object.entries(RANKS).filter(
    ([, { out }]) => force || !fs.existsSync(path.join(OUT_DIR, `${out}.png`))
  );
  if (pending.length === 0) {
    console.log('모든 계급장이 이미 존재합니다. (FORCE=1 로 강제 재생성)');
    return;
  }

  const urls = await resolveUrls(pending.map(([, { file }]) => file));
  for (const [name, { file, out: outName }] of pending) {
    const url = urls[file];
    if (!url) throw new Error(`URL 해석 실패: ${file}`);
    const svg = await fetchBuffer(url);
    const out = path.join(OUT_DIR, `${outName}.png`);
    await sharp(svg, { density: 300 })
      .resize({ height: RENDER_HEIGHT, fit: 'inside', withoutEnlargement: false })
      .png()
      .toFile(out);
    console.log('generated', name, '→', `${outName}.png`, '←', file);
    await sleep(6000); // 커먼즈 레이트리밋 회피
  }
  console.log('done:', Object.keys(RANKS).length, 'images');
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
