/**
 * 앱 아이콘 자동 생성 스크립트
 * 실행: npm run icon
 * 필요: npm install --save-dev sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// ── 아이콘 SVG 디자인 ───────────────────────────────────────────────
const iconSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경 (군녹색, 둥근 모서리) -->
  <rect width="512" height="512" fill="#2E5B4F" rx="${size * 0.18}"/>

  <!-- 빛나는 별 (황금색) -->
  <polygon
    points="256,80 290,175 392,175 312,232 342,328 256,272 170,328 200,232 120,175 222,175"
    fill="#F5A623"
    opacity="0.96"
  />

  <!-- 별 안 강조 -->
  <polygon
    points="256,112 283,188 364,188 300,232 323,308 256,264 189,308 212,232 148,188 229,188"
    fill="#FBBF47"
    opacity="0.5"
  />

  <!-- 하단 텍스트 배경 바 -->
  <rect x="52" y="350" width="408" height="110" rx="22" fill="rgba(0,0,0,0.25)"/>

  <!-- 전역까지 텍스트 -->
  <text
    x="256" y="410"
    font-family="'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
    font-weight="900"
    font-size="72"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle"
    letter-spacing="-2"
  >전역까지</text>
</svg>
`;

// 적응형 아이콘용 (배경 없이 중앙 요소만)
const adaptiveSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- 별 -->
  <polygon
    points="256,60 295,175 420,175 322,245 358,360 256,290 154,360 190,245 92,175 217,175"
    fill="#F5A623"
  />
  <!-- 별 하이라이트 -->
  <polygon
    points="256,100 288,190 396,190 313,246 344,336 256,280 168,336 199,246 116,190 224,190"
    fill="#FBBF47"
    opacity="0.5"
  />
  <!-- 텍스트 -->
  <text
    x="256" y="430"
    font-family="'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
    font-weight="900"
    font-size="68"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle"
  >전역까지</text>
</svg>
`;

// ── 생성할 파일 목록 ─────────────────────────────────────────────────
const targets = [
  { name: 'icon.png',          size: 1024, svg: iconSvg },
  { name: 'adaptive-icon.png', size: 1024, svg: adaptiveSvg },
  { name: 'splash-icon.png',   size: 512,  svg: iconSvg },
  { name: 'favicon.png',       size: 48,   svg: iconSvg },
];

const assetsDir = path.join(__dirname, 'assets');

async function run() {
  // assets 폴더 없으면 생성
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  console.log('🎨 아이콘 생성 시작...\n');

  for (const { name, size, svg } of targets) {
    const outPath = path.join(assetsDir, name);
    try {
      await sharp(Buffer.from(svg(size)))
        .resize(size, size)
        .png()
        .toFile(outPath);
      console.log(`✅  assets/${name}  (${size}×${size}px)`);
    } catch (err) {
      console.error(`❌  assets/${name} 실패:`, err.message);
    }
  }

  console.log('\n🎉 완료! assets/ 폴더에서 확인하세요.');
  console.log('   icon.png          → 앱 아이콘 (iOS/Android 공통)');
  console.log('   adaptive-icon.png → Android 적응형 아이콘 전경');
  console.log('   splash-icon.png   → 스플래시 화면');
  console.log('   favicon.png       → 웹 파비콘');
}

run();
