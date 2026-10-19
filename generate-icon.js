/**
 * 앱 아이콘 자동 생성 스크립트
 * 실행: npm run icon
 *
 * 디자인 컨셉 ── "병장 계급장 + 전역 진행 링" (v1.3.2~)
 *  · 짙은 네이비 바탕 (새벽 테마 swatch #12386F 계열)
 *  · 민트→하늘 그라데이션 진행 링이 92% 까지 차 있고, 끝점이 빛난다 ("전역 직전")
 *  · 가운데 금색 병장 계급장 4줄 — 작은 크기에서도 군 앱으로 읽힌다
 *  · 글자는 넣지 않는다 (48px 런처에서 뭉개진다. 앱 이름은 런처 라벨이 보여 준다)
 *
 * ⚠️ bare 워크플로라 런처 아이콘은 android/…/mipmap-* 의 webp 가 실제로 쓰인다.
 *    이 스크립트가 assets/ 와 mipmap 을 함께 갱신한다. 하나만 고치면 어긋난다.
 *    스토어 등록 이미지는 scripts/generate-store-assets.js (npm run store-assets).
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const BG_COLOR = '#0B1E3A';   // 적응형 배경·스플래시 배경 (colors.xml iconBackground 와 같아야 함)
const PROGRESS = 0.92;        // 링 채움 비율

// ── 공통 defs (그라데이션·필터) ─────────────────────────────────────
const defs = `
  <defs>
    <linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="256" y1="0" x2="256" y2="512">
      <stop offset="0" stop-color="#16437F"/>
      <stop offset="0.55" stop-color="#0F2B55"/>
      <stop offset="1" stop-color="#0A1A33"/>
    </linearGradient>
    <radialGradient id="bgSheen" gradientUnits="userSpaceOnUse" cx="150" cy="90" r="330">
      <stop offset="0" stop-color="#5FA8FF" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#5FA8FF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ring" gradientUnits="userSpaceOnUse" x1="300" y1="90" x2="170" y2="430">
      <stop offset="0" stop-color="#5CF2C6"/>
      <stop offset="0.5" stop-color="#4FD8E8"/>
      <stop offset="1" stop-color="#58B4FF"/>
    </linearGradient>
    <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="12"/>
    </filter>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="5"/>
    </filter>
  </defs>`;

// ── 엠블럼 (링 + 병장 계급장), 512 좌표계 중심 기준 ─────────────────
// mono: 테마 아이콘(Android 13)용 흰 실루엣
function emblem({ mono = false } = {}) {
  const cx = 256, cy = 256, R = 150, SW = 34;
  const C = 2 * Math.PI * R;
  const on = C * PROGRESS;

  // 링 끝점 (12시에서 시계방향)
  const a = PROGRESS * 2 * Math.PI;
  const ex = (cx + R * Math.sin(a)).toFixed(1);
  const ey = (cy - R * Math.cos(a)).toFixed(1);

  // 병장 4줄
  const BW = 142, BH = 27, GAP = 9;
  const total = BH * 4 + GAP * 3;
  const top = cy - total / 2;
  const bars = [0, 1, 2, 3].map((i) => {
    const y = top + i * (BH + GAP);
    const x = cx - BW / 2;
    if (mono) return `<rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="5" fill="#FFFFFF"/>`;
    return `
      <rect x="${x}" y="${y + 5}" width="${BW}" height="${BH}" rx="5" fill="#020A18" opacity="0.45" filter="url(#soft)"/>
      <rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="5" fill="url(#goldBar${i})"/>
      <rect x="${x + 6}" y="${y + 3}" width="${BW - 12}" height="4" rx="2" fill="#FFFBE6" opacity="0.75"/>
      <rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="5" fill="none" stroke="#8A5A06" stroke-opacity="0.55" stroke-width="1.5"/>`;
  }).join('');

  // 막대마다 자기 높이 기준 그라데이션 (objectBoundingBox 대신 userSpace 로 정확히)
  const barGrads = mono ? '' : `<defs>${[0, 1, 2, 3].map((i) => {
    const y = top + i * (BH + GAP);
    return `<linearGradient id="goldBar${i}" gradientUnits="userSpaceOnUse" x1="0" y1="${y}" x2="0" y2="${y + BH}">
      <stop offset="0" stop-color="#FFF1B8"/><stop offset="0.45" stop-color="#F7C43F"/><stop offset="1" stop-color="#C98A10"/>
    </linearGradient>`;
  }).join('')}</defs>`;

  // 계급장 패치 (바탕판 + 금색 테두리) — 막대만 있으면 햄버거 메뉴로 읽힌다
  const PW = BW + 34, PH = total + 34;
  const px = cx - PW / 2, py = cy - PH / 2;
  const patch = mono
    ? `<rect x="${px}" y="${py}" width="${PW}" height="${PH}" rx="16" fill="none" stroke="#FFFFFF" stroke-width="7"/>`
    : `
    <rect x="${px}" y="${py + 8}" width="${PW}" height="${PH}" rx="16" fill="#020A18" opacity="0.5" filter="url(#soft)"/>
    <rect x="${px}" y="${py}" width="${PW}" height="${PH}" rx="16" fill="#0A1D3C"/>
    <rect x="${px + 3.5}" y="${py + 3.5}" width="${PW - 7}" height="${PH - 7}" rx="13" fill="none" stroke="#E9B53A" stroke-width="5"/>`;

  if (mono) {
    return `
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#FFFFFF" stroke-width="${SW}" stroke-linecap="round"
            stroke-dasharray="${on.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>
    ${patch}${bars}`;
  }

  return `${barGrads}
    <!-- 남은 구간 트랙 -->
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#FFFFFF" stroke-opacity="0.13" stroke-width="${SW}"/>
    <!-- 링 광채 -->
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="url(#ring)" stroke-width="${SW}" stroke-linecap="round"
            stroke-dasharray="${on.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})" opacity="0.55" filter="url(#glow)"/>
    <!-- 진행 링 -->
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="url(#ring)" stroke-width="${SW}" stroke-linecap="round"
            stroke-dasharray="${on.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>
    <!-- 끝점 빛 -->
    <circle cx="${ex}" cy="${ey}" r="26" fill="#BFFFF0" opacity="0.8" filter="url(#glow)"/>
    <circle cx="${ex}" cy="${ey}" r="11" fill="#FFFFFF"/>
    <!-- 병장 계급장 -->
    ${patch}${bars}`;
}

const svg = (body) => `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">${defs}${body}</svg>`;
const background = (shape) => `${shape('url(#bg)')}${shape('url(#bgSheen)')}`;
const scaled = (s, inner) => `<g transform="translate(256,256) scale(${s}) translate(-256,-256)">${inner}</g>`;

// 둥근 사각 앱 아이콘 (assets/icon.png, 레거시 런처)
const iconSvg = () => svg(`${background((f) => `<rect width="512" height="512" rx="112" fill="${f}"/>`)}${scaled(1.12, emblem())}`);
// 원형 레거시 런처
const roundSvg = () => svg(`${background((f) => `<circle cx="256" cy="256" r="256" fill="${f}"/>`)}${scaled(1.08, emblem())}`);
// 풀블리드 정사각 (스토어 512 — 스토어가 직접 마스킹)
const squareSvg = () => svg(`${background((f) => `<rect width="512" height="512" fill="${f}"/>`)}${scaled(1.12, emblem())}`);
// 적응형 전경: 108dp 중 66dp 안전원(반지름 156/512) 안에 링 바깥(167×s)이 들어오게
const adaptiveSvg = () => svg(scaled(0.86, emblem()));
// 적응형 배경: 단색 대신 네이비 그라데이션 + 광택 (런처가 마스킹)
const adaptiveBgSvg = () => svg(background((f) => `<rect width="512" height="512" fill="${f}"/>`));
const monoSvg = () => svg(scaled(0.86, emblem({ mono: true })));
// 스플래시: 투명, BG_COLOR 위에 표시
const splashSvg = () => svg(scaled(0.9, emblem()));

const ROOT = __dirname;
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const targets = [
  { out: 'assets/icon.png', size: 1024, svg: iconSvg },
  { out: 'assets/adaptive-icon.png', size: 1024, svg: adaptiveSvg },
  { out: 'assets/splash-icon.png', size: 1024, svg: splashSvg },
  { out: 'assets/favicon.png', size: 64, svg: iconSvg },
];
for (const [d, k] of Object.entries(DENSITIES)) {
  const dir = path.relative(ROOT, path.join(RES, `mipmap-${d}`));
  targets.push(
    { out: `${dir}/ic_launcher.webp`, size: 48 * k, svg: iconSvg },
    { out: `${dir}/ic_launcher_round.webp`, size: 48 * k, svg: roundSvg },
    { out: `${dir}/ic_launcher_foreground.webp`, size: 108 * k, svg: adaptiveSvg },
    { out: `${dir}/ic_launcher_background.webp`, size: 108 * k, svg: adaptiveBgSvg },
    { out: `${dir}/ic_launcher_monochrome.webp`, size: 108 * k, svg: monoSvg },
  );
}

async function render(svgStr, size, { flatten } = {}) {
  let img = sharp(Buffer.from(svgStr), { density: 384 }).resize(size, size);
  if (flatten) img = img.flatten({ background: flatten });
  return img;
}

async function run() {
  console.log('🎨  아이콘(병장 계급장 + 전역 진행 링) 생성...\n');
  for (const t of targets) {
    const outPath = path.join(ROOT, t.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const img = await render(t.svg(), t.size);
    if (outPath.endsWith('.webp')) await img.webp({ lossless: true }).toFile(outPath);
    else await img.png().toFile(outPath);
    console.log(`✅  ${t.out}  (${t.size}×${t.size})`);
  }
  console.log(`\n적응형 배경색: ${BG_COLOR} (android/…/values/colors.xml iconBackground · app.json 과 일치시킬 것)`);
}

module.exports = { iconSvg, squareSvg, emblem, defs, BG_COLOR, render };

if (require.main === module) run();
