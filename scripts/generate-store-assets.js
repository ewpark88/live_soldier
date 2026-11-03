/**
 * 플레이스토어 등록 이미지 생성
 * 실행: npm run store-assets   (먼저 npm run icon — 같은 아이콘 SVG 를 쓴다)
 *
 * 출력 (store-assets/ — 앱 번들 밖. assets/ 아래 두면 assetBundlePatterns 로 APK 에 실린다)
 *  · icon-512.png                 512×512, 알파 없음
 *  · feature-graphic-1024x500.png 1024×500, 알파 없음
 *  · screenshots/01~06.png        1080×1920 (9:16)
 *
 * 피처 그래픽·스크린샷은 HTML 을 Edge 헤드리스로 캡처한다 (Windows 기본 탑재).
 * 다른 OS 면 BROWSER 환경변수로 chrome/chromium 경로를 넘긴다.
 * 스크린샷 화면은 v1.3 실제 화면(새벽 라이트 테마)을 재현한 목업이다 —
 * 화면이 바뀌면 SCREENS 의 목업도 함께 고친다.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { squareSvg, render } = require('../generate-icon');
const { SCREENS, screenshotHtml } = require('./store/screens');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'store-assets');
const BROWSER = process.env.BROWSER
  || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const iconDataUri = async () => {
  const buf = await (await render(squareSvg(), 512)).png().toBuffer();
  return `data:image/png;base64,${buf.toString('base64')}`;
};

// HTML → PNG (헤드리스 브라우저 스크린샷 → sharp 로 알파 제거·크기 고정)
async function capture(html, w, h, outPath) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'store-'));
  const htmlPath = path.join(tmp, 'page.html');
  const pngPath = path.join(tmp, 'shot.png');
  fs.writeFileSync(htmlPath, html, 'utf8');
  execFileSync(BROWSER, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${w},${h}`, `--screenshot=${pngPath}`, `file:///${htmlPath.replace(/\\/g, '/')}`,
  ], { stdio: 'ignore', timeout: 60000 });
  await sharp(pngPath).resize(w, h, { fit: 'cover', position: 'top' })
    .flatten({ background: '#0B1E3A' }).png().toFile(outPath);
  fs.rmSync(tmp, { recursive: true, force: true });
}

const featureHtml = (icon) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1024px; height: 500px; overflow: hidden; font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
    background: radial-gradient(circle at 18% 10%, #1E5294 0%, rgba(30,82,148,0) 55%),
                linear-gradient(160deg, #143C73 0%, #0D2547 55%, #081530 100%); color: #fff; position: relative; }
  .ring { position: absolute; border-radius: 50%; border: 28px solid; opacity: .16; }
  .r1 { width: 560px; height: 560px; right: -170px; top: -150px; border-color: #5CF2C6 #58B4FF #58B4FF transparent; transform: rotate(20deg); }
  .r2 { width: 300px; height: 300px; left: -120px; bottom: -170px; border-color: #58B4FF; opacity: .1; }
  .wrap { position: absolute; inset: 0; display: flex; align-items: center; gap: 56px; padding: 0 70px 0 92px; }
  .icon { width: 250px; height: 250px; border-radius: 56px; flex: none;
    box-shadow: 0 24px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.08); }
  h1 { font-size: 92px; font-weight: 900; letter-spacing: -3px; line-height: 1; }
  .dday { display: inline-block; margin-top: 22px; padding: 6px 18px 8px; border-radius: 14px; font-size: 30px; font-weight: 800;
    color: #062A2A; background: linear-gradient(90deg, #5CF2C6, #58B4FF); }
  .sub { margin-top: 20px; font-size: 31px; font-weight: 700; letter-spacing: -1px; }
  .sub b { color: #F7C43F; }
  .chips { margin-top: 26px; display: flex; gap: 12px; }
  .chip { padding: 9px 20px 11px; border-radius: 999px; font-size: 22px; font-weight: 700;
    background: rgba(255,255,255,.1); border: 1.5px solid rgba(255,255,255,.22); }
</style></head><body>
  <div class="ring r1"></div><div class="ring r2"></div>
  <div class="wrap">
    <img class="icon" src="${icon}">
    <div>
      <h1>전역까지</h1>
      <div class="dday">전역 D-Day 카운터</div>
      <div class="sub">진급·휴가·월급까지 <b>군 생활 올인원</b></div>
      <div class="chips"><span class="chip">진급일</span><span class="chip">휴가 관리</span><span class="chip">월급·적금</span><span class="chip">가족 공유</span></div>
    </div>
  </div>
</body></html>`;

async function run() {
  fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
  const icon = await iconDataUri();

  await (await render(squareSvg(), 512, { flatten: '#0B1E3A' })).png().toFile(path.join(OUT, 'icon-512.png'));
  console.log('✅  store-assets/icon-512.png');

  await capture(featureHtml(icon), 1024, 500, path.join(OUT, 'feature-graphic-1024x500.png'));
  console.log('✅  store-assets/feature-graphic-1024x500.png');

  for (let i = 0; i < SCREENS.length; i++) {
    const name = `screenshots/${String(i + 1).padStart(2, '0')}.png`;
    await capture(screenshotHtml(SCREENS[i], icon), 1080, 1920, path.join(OUT, name));
    console.log(`✅  store-assets/${name}`);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
