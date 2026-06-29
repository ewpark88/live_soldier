/**
 * 앱 아이콘 / 스토어 이미지 자동 생성 스크립트
 * 실행: npm run icon
 * 필요: npm install --save-dev sharp
 *
 * 디자인 컨셉 ── "메탈릭 골드 별 + 글로우"
 *  · 딥 그린 그라데이션 배경 (브랜드 컬러 #2E5B4F 계열, 깊이감)
 *  · 입체 금속 질감의 골드 별 + 은은한 외곽 광채 + 상단 시트(빛 반사)
 *  · 깔끔한 흰색 "전역까지" 워드마크 (촌스러운 검은 바 제거) + 가는 골드 언더라인
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// ── 5각 별 path 계산 ────────────────────────────────────────────────
function starPath(cx, cy, outer, inner) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (-90 + i * 36) * (Math.PI / 180); // 꼭짓점이 정확히 위를 향하도록 -90°에서 시작
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

const FONT = `'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR','Pretendard',sans-serif`;

// ── 공통 defs (그라데이션·필터) ─────────────────────────────────────
const defs = `
  <defs>
    <!-- 배경 딥 그린 그라데이션 -->
    <linearGradient id="bg" gradientUnits="userSpaceOnUse" x1="256" y1="0" x2="256" y2="512">
      <stop offset="0"    stop-color="#34695B"/>
      <stop offset="0.52" stop-color="#234C42"/>
      <stop offset="1"    stop-color="#15352B"/>
    </linearGradient>
    <!-- 배경 상단 광택(시트) -->
    <radialGradient id="bgSheen" gradientUnits="userSpaceOnUse" cx="200" cy="110" r="300">
      <stop offset="0"   stop-color="#5BA08C" stop-opacity="0.40"/>
      <stop offset="1"   stop-color="#5BA08C" stop-opacity="0"/>
    </radialGradient>
    <!-- 금속 골드 그라데이션 -->
    <linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="168" y1="78" x2="346" y2="322">
      <stop offset="0"    stop-color="#FFF0BC"/>
      <stop offset="0.40" stop-color="#F7BA42"/>
      <stop offset="0.74" stop-color="#E79A22"/>
      <stop offset="1"    stop-color="#C9781A"/>
    </linearGradient>
    <!-- 별 상단 하이라이트(빛 반사) -->
    <radialGradient id="starSheen" gradientUnits="userSpaceOnUse" cx="214" cy="150" r="120">
      <stop offset="0"    stop-color="#FFFFFF" stop-opacity="0.65"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.10"/>
      <stop offset="1"    stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <!-- 언더라인 골드 -->
    <linearGradient id="line" gradientUnits="userSpaceOnUse" x1="156" y1="0" x2="356" y2="0">
      <stop offset="0"   stop-color="#F7BA42" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#FBC85B" stop-opacity="1"/>
      <stop offset="1"   stop-color="#F7BA42" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow"  x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="13"/>
    </filter>
    <filter id="soft"  x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
  </defs>`;

// ── 엠블럼(별 + 워드마크) ───────────────────────────────────────────
// withText: 텍스트 포함 여부, cy: 별 중심 Y
function emblem({ withText = true } = {}) {
  const cx = 256, cy = withText ? 196 : 232;
  const star = starPath(cx, cy, 128, 50);
  const clipId = withText ? 'cT' : 'cN';
  const text = withText ? `
    <!-- 텍스트 그림자 -->
    <text x="256" y="423" font-family="${FONT}" font-weight="800" font-size="76"
          fill="#0C261F" fill-opacity="0.35" text-anchor="middle" dominant-baseline="middle"
          letter-spacing="-1" filter="url(#soft)" transform="translate(0,3)">전역까지</text>
    <!-- 워드마크 -->
    <text x="256" y="420" font-family="${FONT}" font-weight="800" font-size="76"
          fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle"
          letter-spacing="-1">전역까지</text>
    <!-- 골드 언더라인 -->
    <rect x="156" y="455" width="200" height="5" rx="2.5" fill="url(#line)"/>` : '';

  return `
    <clipPath id="${clipId}"><path d="${star}"/></clipPath>
    <!-- 외곽 광채 -->
    <path d="${star}" fill="#F6B73C" opacity="0.55" filter="url(#glow)"/>
    <!-- 별 본체 -->
    <path d="${star}" fill="url(#gold)"/>
    <!-- 별 상단 빛 반사 -->
    <ellipse cx="214" cy="150" rx="120" ry="92" fill="url(#starSheen)" clip-path="url(#${clipId})"/>
    <!-- 별 외곽 림(빛 받는 가장자리) -->
    <path d="${star}" fill="none" stroke="#FFE8AE" stroke-width="2" stroke-opacity="0.7"/>
    ${text}`;
}

// ── SVG 빌더 ────────────────────────────────────────────────────────
// rounded 앱 아이콘 (iOS/공통)
const iconSvg = () => `
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="512" height="512" rx="114" fill="url(#bg)"/>
  <rect width="512" height="512" rx="114" fill="url(#bgSheen)"/>
  ${emblem({ withText: true })}
</svg>`;

// Android 적응형 전경 (안전영역 안으로 축소, 배경 투명)
const adaptiveSvg = () => `
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <g transform="translate(256,262) scale(0.64) translate(-256,-262)">
    ${emblem({ withText: true })}
  </g>
</svg>`;

// 스플래시 (배경 투명 → 스플래시 backgroundColor 위에 표시)
const splashSvg = () => `
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  ${emblem({ withText: true })}
</svg>`;

// 플레이스토어 512×512 (풀 블리드 정사각, 투명 없음 → 스토어가 마스킹)
const storeSvg = () => `
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="512" fill="url(#bgSheen)"/>
  ${emblem({ withText: true })}
</svg>`;

// ── 생성 대상 ───────────────────────────────────────────────────────
const targets = [
  { name: 'icon.png',           size: 1024, svg: iconSvg,     flatten: false },
  { name: 'adaptive-icon.png',  size: 1024, svg: adaptiveSvg, flatten: false },
  { name: 'splash-icon.png',    size: 1024, svg: splashSvg,   flatten: false },
  { name: 'favicon.png',        size: 64,   svg: iconSvg,     flatten: false },
  // 플레이스토어 등록용 (투명 제거: 일부 콘솔이 알파를 거부)
  { name: 'store-icon-512.png', size: 512,  svg: storeSvg,    flatten: '#15352B' },
];

const assetsDir = path.join(__dirname, 'assets');

async function run() {
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  console.log('🎨  새 로고(메탈릭 골드 별) 생성 시작...\n');

  for (const { name, size, svg, flatten } of targets) {
    const outPath = path.join(assetsDir, name);
    try {
      let img = sharp(Buffer.from(svg()), { density: 384 }).resize(size, size);
      if (flatten) img = img.flatten({ background: flatten });
      await img.png().toFile(outPath);
      console.log(`✅  assets/${name}  (${size}×${size}px)`);
    } catch (err) {
      console.error(`❌  assets/${name} 실패:`, err.message);
    }
  }

  console.log('\n🎉 완료! assets/ 폴더에서 확인하세요.');
  console.log('   icon.png           → 앱 아이콘 (iOS/Android 공통, 인앱 헤더)');
  console.log('   adaptive-icon.png  → Android 적응형 아이콘 전경');
  console.log('   splash-icon.png    → 스플래시 화면');
  console.log('   favicon.png        → 웹 파비콘');
  console.log('   store-icon-512.png → 구글 플레이스토어 등록용 512×512');
}

run();
