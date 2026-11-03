/**
 * 스토어 스크린샷 목업 (1080×1920) — 상단 카피 + 폰 프레임 안의 v1.3 화면(새벽 라이트)
 * generate-store-assets.js 가 SCREENS 를 순서대로 캡처한다.
 *
 * 화면 본문은 실제 화면 코드의 섹션 순서·라벨·토큰 색을 따른다. 1dp = 2px.
 * 시나리오 하나로 숫자를 맞춘다 (서로 어긋나면 스토어에서 바로 티 난다):
 *   오늘 2026-10-19 · 입대 2025-10-04 · 육군 18개월 · 전역 2027-04-04 (D-167)
 *   상병 13개월째 · 병장 진급 2026-12-01 (D-43) · 복무 380일 · 진행 69%
 *   월급 상병 1,200,000원 · 18개월 총 20,100,000원 (수령 12,900,000 / 남음 7,200,000)
 */

const fs = require('fs');
const path = require('path');

// 새벽(daybreak) 라이트 토큰 — src/theme/palettes/daybreak.js
const T = {
  primary: '#1366D6', primaryLight: '#5C97E8', primarySoft: '#E7F0FD', accent: '#0A7A60', accentSoft: '#E1F5EF',
  background: '#F4F7FC', card: '#FFFFFF', border: '#E3E9F1', sunken: '#F0F4FA', highlight: '#E8F1FD',
  text: '#0C1A2B', textSecondary: '#586A80', textLight: '#7D8A99',
  heroFrom: '#8FD0FF', heroTo: '#7BE9CF', heroText: '#0A2E4A', heroMuted: 'rgba(10,46,74,0.72)',
  heroTrack: 'rgba(0,0,0,0.14)', heroSheen: 'rgba(255,255,255,0.55)', heroBorder: 'rgba(0,0,0,0.08)',
  phaseAccent: '#13488D', success: '#0A7550', successSoft: '#E3F3EB', sat: '#2F66BC', sun: '#CE4034',
};

const rankImg = (name) => {
  const buf = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'ranks', `${name}.png`));
  return `data:image/png;base64,${buf.toString('base64')}`;
};

// Ionicons 근사 (outline, 24 viewBox)
const ICONS = {
  home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
  calendar: '<rect x="4" y="6" width="16" height="14" rx="2"/><path d="M4 10h16M8 3v5M16 3v5"/>',
  wallet: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M15.5 13.5h2.5"/><path d="M6 7l9-3.5 1.2 3.5"/>',
  person: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18.5c1.3-2.3 3.2-3.5 5.5-3.5s4.2 1.2 5.5 3.5"/>',
  airplane: '<path d="M10.5 20.5l1.5-6-6 1v-2l6-3V4.5a1.5 1.5 0 0 1 3 0V10.5l6 3v2l-6-1 1.5 6-3-1z" transform="rotate(45 12 12)"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.8-3.4 3.1-5 6-5s5.2 1.6 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14c2.3.2 3.8 1.6 4.5 4"/>',
  map: '<path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4L15 6.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12"/><path d="M12 8C10 4 6.5 4.5 7.5 7.5M12 8c2-4 5.5-3.5 4.5-.5"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevron: '<path d="M9 5l7 7-7 7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  up: '<circle cx="12" cy="12" r="9"/><path d="M8 13.5l4-4 4 4"/>',
  hourglass: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  flame: '<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-4 3.5-6 4-10 2.5 1.5 3 4 3 5.5 1-1 1.5-2 1.5-3 2.5 2 4.5 4.6 4.5 7.5 0 3.4-2.5 6-6.5 6z"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4c0 3 1.5 4.5 3 4.5M17 6h3c0 3-1.5 4.5-3 4.5M12 14v4M8 20h8"/>',
  medal: '<circle cx="12" cy="14" r="5.5"/><path d="M8.5 9.5 6 3h4l2 4.5L14 3h4l-2.5 6.5"/>',
  share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>',
  heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l3 3M14 9l2 2"/>',
  send: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="M10 13l11-10"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  qr: '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 18h2v2h-2z"/>',
  options: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M11 18.5h2"/>',
  sunny: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.3l2.7 2.7L16 9.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  checkbox: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12.3l2.7 2.7L16 9.5"/>',
};
const ic = (name, color, size = 48, sw = 2) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none"
  stroke="${color}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" style="flex:none">${ICONS[name]}</svg>`;

const TABS = [['home', '홈'], ['calendar', '캘린더'], ['wallet', '급여'], ['person', '내 정보']];
const tabBar = (active) => `<div class="tabbar">${TABS.map(([k, label]) => {
  const on = k === active;
  return `<div class="tab ${on ? 'on' : ''}">${ic(k, on ? T.primary : T.textLight, 48, on ? 2.4 : 2)}<span>${label}</span></div>`;
}).join('')}</div>`;

// 공통 조각
const cardTitle = (icon, title, right = '') => `<div class="ct">
  <span class="cti">${ic(icon, T.primary, 34)}</span><span class="h3">${title}</span><span style="flex:1"></span>${right}</div>`;
const tintBox = (icon, color, bg, size = 72) => `<span class="tb" style="width:${size}px;height:${size}px;background:${bg}">${ic(icon, color, size * 0.55)}</span>`;
const appbar = (title, sub, back) => `<div class="appbar">${back ? ic('back', T.text, 52, 2.4) : ''}
  <div><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div></div>`;

const ring = (d, sw, pct, color, track) => {
  const r = (d - sw) / 2, c = 2 * Math.PI * r;
  return `<svg width="${d}" height="${d}" style="position:absolute;inset:0;transform:rotate(-90deg)">
    <circle cx="${d / 2}" cy="${d / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${sw}"/>
    <circle cx="${d / 2}" cy="${d / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"
      stroke-dasharray="${(c * pct).toFixed(1)} ${c.toFixed(1)}"/></svg>`;
};

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { word-break: keep-all; width: 1080px; height: 1920px; overflow: hidden; font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;
    background: radial-gradient(circle at 15% 6%, #1E5294 0%, rgba(30,82,148,0) 45%),
                linear-gradient(170deg, #143C73 0%, #0D2547 50%, #081530 100%); color: #fff; position: relative; }
  .deco { position: absolute; border-radius: 50%; border: 40px solid; opacity: .12; }
  .d1 { width: 760px; height: 760px; right: -330px; top: -260px; border-color: #5CF2C6 #58B4FF #58B4FF transparent; transform: rotate(25deg); }
  .d2 { width: 520px; height: 520px; left: -300px; bottom: 120px; border-color: #58B4FF; opacity: .08; }
  .cap { position: absolute; top: 96px; left: 0; right: 0; text-align: center; }
  .cap .tag { display: inline-block; padding: 8px 26px 10px; border-radius: 999px; font-size: 30px; font-weight: 800; color: #062A2A;
    background: linear-gradient(90deg, #5CF2C6, #58B4FF); }
  .cap h1 { margin-top: 28px; font-size: 74px; font-weight: 900; letter-spacing: -3px; line-height: 1.2; }
  .cap h1 b { color: #F7C43F; }
  .phone { position: absolute; left: 130px; top: 500px; width: 820px; height: 1680px; border-radius: 92px; padding: 18px;
    background: #0A0F1A; box-shadow: 0 40px 90px rgba(0,0,0,.55), 0 0 0 3px #2A3550; }
  .scr { position: relative; width: 100%; height: 100%; border-radius: 76px; overflow: hidden; background: ${T.background}; color: ${T.text}; }
  .status { height: 76px; display: flex; align-items: center; justify-content: space-between; padding: 10px 60px 0;
    font-size: 26px; font-weight: 700; color: ${T.text}; position: relative; z-index: 2; }
  .status .r { display: flex; gap: 8px; align-items: center; }
  .status .r i { display: inline-block; width: 7px; background: currentColor; border-radius: 2px; }
  .appbar { min-height: 112px; display: flex; align-items: center; gap: 12px; padding: 4px 32px 8px; }
  .appbar h2 { font-size: 52px; font-weight: 800; letter-spacing: -1.5px; line-height: 1.25; }
  .appbar .sub { font-size: 24px; font-weight: 600; color: ${T.textSecondary}; }
  .body { padding: 8px 32px 0; display: flex; flex-direction: column; gap: 24px; }
  .tabbar { position: absolute; left: 0; right: 0; bottom: 0; height: 156px; padding-bottom: 36px; background: ${T.card};
    border-top: 2px solid ${T.border}; display: flex; z-index: 5; }
  .tab { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    font-size: 22px; font-weight: 700; color: ${T.textLight}; }
  .tab.on { color: ${T.primary}; }
  .card { background: ${T.card}; border: 2px solid ${T.border}; border-radius: 40px; padding: 32px;
    box-shadow: 0 12px 36px rgba(18,58,94,.07); }
  .ct { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
  .cti { width: 56px; height: 56px; border-radius: 16px; background: ${T.primarySoft}; display: flex; align-items: center; justify-content: center; }
  .tb { border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; flex: none; }
  .h3 { font-size: 34px; font-weight: 700; letter-spacing: -.5px; }
  .t15 { font-size: 30px; font-weight: 700; letter-spacing: -.5px; }
  .cap12 { font-size: 24px; font-weight: 600; color: ${T.textSecondary}; }
  .lab13 { font-size: 26px; font-weight: 700; }
  .row { display: flex; align-items: center; gap: 20px; }
  .grow { flex: 1; min-width: 0; }
  .hero { color: ${T.heroText}; background: linear-gradient(135deg, ${T.heroFrom}, ${T.heroTo}); position: relative; overflow: hidden; }
  .sheen { background: ${T.heroSheen}; border: 2px solid ${T.heroBorder}; }
  .btn { height: 96px; border-radius: 28px; display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 32px; font-weight: 700; }
  .btn.p { background: ${T.primary}; color: #fff; }
  .btn.s { background: ${T.primarySoft}; color: ${T.primary}; }
  .divider { height: 2px; background: ${T.border}; }
`;

function screenshotHtml(s) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}${s.css || ''}</style></head><body>
  <div class="deco d1"></div><div class="deco d2"></div>
  <div class="cap"><span class="tag">${s.tag}</span><h1>${s.title}</h1></div>
  <div class="phone"><div class="scr">
    ${s.full ? '' : `<div class="status"><span>9:41</span><span class="r"><i style="height:12px"></i><i style="height:17px"></i><i style="height:22px"></i>&nbsp;100%</span></div>`}
    ${s.full || s.body}
    ${s.tab ? tabBar(s.tab) : ''}
  </div></div>
  ${s.extra || ''}
</body></html>`;
}

// ── 1. 홈 ──────────────────────────────────────────────────────────
const home = {
  tag: '전역 D-Day', title: '전역까지 며칠?<br><b>한눈에</b> 보인다', tab: 'home',
  full: `
  <div class="hero" style="padding-bottom:40px;box-shadow:0 28px 64px rgba(7,30,51,.22);border-radius:0 0 56px 56px">
    <div style="position:absolute;width:640px;height:640px;left:80px;top:180px;border-radius:50%;
      background:radial-gradient(circle, rgba(19,72,141,.16), rgba(19,72,141,0) 65%)"></div>
    <div class="status" style="color:${T.heroText}"><span>9:41</span><span class="r"><i style="height:12px"></i><i style="height:17px"></i><i style="height:22px"></i>&nbsp;100%</span></div>
    <div class="row" style="padding:8px 32px 0;align-items:flex-start">
      <div style="text-align:center">
        <div style="width:84px;height:84px;border-radius:50%;background:#fff;border:4px solid ${T.phaseAccent};display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;color:${T.phaseAccent}">민</div>
        <div style="font-size:22px;font-weight:700;margin-top:6px">김민준</div>
      </div>
      <div style="text-align:center;opacity:.8">
        <div style="width:84px;height:84px;border-radius:50%;border:3px dashed ${T.heroMuted};display:flex;align-items:center;justify-content:center">${ic('add', T.heroText, 40)}</div>
        <div style="font-size:22px;font-weight:700;margin-top:6px">추가</div>
      </div>
      <div class="grow"></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <span class="sheen" style="border-radius:999px;padding:4px 16px;font-size:24px;font-weight:800;display:flex;gap:6px;align-items:center">${ic('flame', '#E0631C', 26, 2.4)}12일</span>
        <img src="${rankImg('sangbyeong')}" style="width:72px">
        <span style="font-size:22px;font-weight:800">상병</span>
      </div>
    </div>
    <div style="position:relative;width:520px;height:520px;margin:4px auto 0">
      ${ring(520, 28, 0.69, T.phaseAccent, T.heroTrack)}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:26px;font-weight:700;letter-spacing:4px;color:${T.heroMuted}">전역까지</div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-top:4px">
          <span style="font-size:40px;font-weight:700;color:${T.heroMuted}">D-</span>
          <span style="font-size:150px;font-weight:900;letter-spacing:-5px;line-height:1;color:${T.phaseAccent}">167</span>
        </div>
        <div style="font-size:26px;font-weight:700;color:${T.heroMuted};margin-top:12px">복무 69%</div>
      </div>
    </div>
    <div class="row" style="justify-content:center;gap:20px;margin-top:16px">
      <span style="font-size:26px;font-weight:600;color:${T.heroMuted}">2027년 4월 4일 전역</span>
      <span class="sheen" style="border-radius:999px;padding:8px 22px;font-size:24px;font-weight:700;display:flex;gap:8px;align-items:center">${ic('share', T.heroText, 28)}자랑하기</span>
    </div>
    <div class="row" style="gap:16px;padding:28px 32px 0">
      ${[['복무 일수', '380일'], ['남은 휴가', '14일'], ['다음 진급 · 병장', 'D-43']].map(([l, v]) => `
      <div class="sheen grow" style="border-radius:28px;padding:20px 22px">
        <div style="font-size:24px;font-weight:600;color:${T.heroMuted}">${l}</div>
        <div style="font-size:44px;font-weight:800;margin-top:2px">${v}</div></div>`).join('')}
    </div>
  </div>
  <div class="body" style="padding-top:28px">
    <div class="card">
      ${cardTitle('time', '다가오는 일정')}
      ${[['airplane', T.primary, T.primarySoft, '다음 휴가', '10월 27일(화) ~ 10월 30일(금) · 4일', 'D-8'],
         ['cash', T.success, T.successSoft, '월급날', '11월 10일(화) · 예상 1,200,000원', 'D-22']].map(([i, c, bg, t, sub, d]) => `
      <div class="row" style="padding:14px 0">${tintBox(i, c, bg)}
        <div class="grow"><div class="t15">${t}</div><div class="cap12">${sub}</div></div>
        <span style="font-size:30px;font-weight:800;color:${T.primary}">${d}</span>${ic('chevron', T.textLight, 32)}</div>`).join('')}
    </div>
  </div>`,
};

// ── 2. 전역 로드맵 ────────────────────────────────────────────────
const RM = [
  ['flag', '입대', '2025년 10월 4일', 'done'],
  ['up', '일병 진급', '2025년 12월 1일', 'done'],
  ['calendar', '입대 100일', '2026년 1월 11일', 'done'],
  ['up', '상병 진급', '2026년 6월 1일', 'done'],
  ['hourglass', '반환점 (복무 절반)', '2026년 7월 4일', 'done'],
  ['star', '병장 진급', '2026년 12월 1일', 'D-43'],
  ['flame', '전역 100일 전', '2026년 12월 25일', 'D-67'],
  ['trophy', '전역', '2027년 4월 4일', 'D-167'],
];
let nextSeen = false;
const roadmap = {
  tag: '진급 · 로드맵', title: '다음 진급일까지<br><b>자동 계산</b>',
  body: `${appbar('전역 로드맵', '', true)}
  <div class="body">
    <div class="hero" style="border-radius:56px;padding:36px 40px;display:flex;align-items:center;gap:24px">
      <span class="sheen" style="width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center">${ic('medal', T.phaseAccent, 48)}</span>
      <div class="grow"><div class="lab13" style="font-size:30px">다음 진급 · 병장</div><div style="font-size:26px;font-weight:600;color:${T.heroMuted}">2026년 12월 1일</div></div>
      <div style="color:${T.phaseAccent}"><span style="font-size:28px;font-weight:700">D-</span><span style="font-size:64px;font-weight:900">43</span></div>
    </div>
    <div class="card">
      ${cardTitle('map', '전역 로드맵', '<span class="cap12">입대부터 전역까지 주요 순간</span>')}
      <div style="position:relative;height:56px;margin:4px 8px 4px">
        <div style="position:absolute;left:0;right:0;top:24px;height:10px;border-radius:5px;background:${T.border}"></div>
        <div style="position:absolute;left:0;width:69%;top:24px;height:10px;border-radius:5px;background:${T.primary}"></div>
        <div style="position:absolute;left:calc(69% - 26px);top:2px;width:52px;height:52px;border-radius:50%;background:${T.primary};border:5px solid #fff;box-shadow:0 4px 10px rgba(0,0,0,.15)"></div>
      </div>
      <div class="row" style="justify-content:space-between;margin:0 0 20px" ><span class="cap12">입대</span><span class="cap12">전역</span></div>
      ${RM.map(([i, label, date, st], idx) => {
        const done = st === 'done';
        const next = !done && !nextSeen; if (next) nextSeen = true;
        const bg = done ? T.primary : next ? T.accent : T.sunken;
        const col = done || next ? '#fff' : T.textLight;
        const tag = done ? `<span style="font-size:24px;font-weight:700;color:${T.primary}">완료</span>`
          : next ? `<span style="background:${T.accentSoft};color:${T.accent};border-radius:999px;padding:4px 16px;font-size:26px;font-weight:800">${st}</span>`
          : `<span style="font-size:26px;font-weight:700;color:${T.textLight}">${st}</span>`;
        return `<div class="row" style="align-items:stretch;gap:24px">
          <div style="display:flex;flex-direction:column;align-items:center;width:68px">
            <span style="width:68px;height:68px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;${next ? `box-shadow:0 0 0 10px ${T.accentSoft}` : ''}">${ic(i, col, 36, 2.2)}</span>
            ${idx < RM.length - 1 ? `<span style="flex:1;width:4px;min-height:30px;background:${done ? T.primary : T.border}"></span>` : ''}
          </div>
          <div class="grow" style="padding:8px 0 22px"><div class="t15">${label}</div><div class="cap12">${date}</div></div>
          <div style="padding-top:14px">${tag}</div></div>`;
      }).join('')}
    </div>
  </div>`,
};

// ── 3. 캘린더 ─────────────────────────────────────────────────────
const calendarGrid = () => {
  // 2026-10-01 은 목요일
  const cells = [];
  for (let i = 0; i < 4; i++) cells.push('');
  for (let d = 1; d <= 31; d++) cells.push(d);
  const leave = [27, 28, 29, 30], reward = [30], todo = [8, 14, 21, 23], today = 19, selected = 27;
  return cells.map((d, i) => {
    if (!d) return '<span></span>';
    const wd = i % 7;
    const isLeave = leave.includes(d), isSel = d === selected && !isLeave;
    let style = `color:${wd === 0 ? T.sun : wd === 6 ? T.sat : T.text};`;
    if (isLeave) style = `background:${T.primary};color:#fff;font-weight:800;`;
    if (d === today) style += `box-shadow:inset 0 0 0 3px ${T.accent};`;
    if (isSel) style += `background:${T.highlight};box-shadow:inset 0 0 0 3px ${T.primary};color:${T.primary};`;
    return `<span class="dc"><span class="dn" style="${style}">${d}</span>
      ${reward.includes(d) ? `<span class="mk">${ic('star', T.accent, 20, 2.6)}</span>` : todo.includes(d) ? `<span class="dot"></span>` : '<span class="mk"></span>'}</span>`;
  }).join('');
};
const calendar = {
  tag: '휴가 · 일정', title: '휴가와 일정을<br><b>달력 하나로</b>', tab: 'calendar',
  css: `
    .seg { display:flex; background:${T.sunken}; border-radius:28px; padding:8px; }
    .seg span { flex:1; height:80px; border-radius:20px; display:flex; align-items:center; justify-content:center; gap:10px; font-size:28px; font-weight:700; color:${T.textSecondary}; }
    .seg .on { background:#fff; color:${T.primary}; box-shadow:0 4px 12px rgba(18,58,94,.1); }
    .grid { display:grid; grid-template-columns:repeat(7,1fr); row-gap:6px; text-align:center; }
    .wd { font-size:24px; font-weight:700; padding-bottom:10px; }
    .dc { display:flex; flex-direction:column; align-items:center; height:98px; }
    .dn { width:72px; height:72px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:600; }
    .dot { width:10px; height:10px; border-radius:50%; background:${T.accent}; margin-top:6px; }
    .mk { height:22px; margin-top:2px; }`,
  body: `${appbar('캘린더')}
  <div class="body">
    <div class="seg"><span class="on">${ic('calendar', T.primary, 34)}달력</span><span>${ic('airplane', T.textSecondary, 34)}휴가</span><span>${ic('checkbox', T.textSecondary, 34)}일정</span></div>
    <div class="card" style="padding:28px 24px">
      <div class="row" style="justify-content:space-between;padding:0 8px 22px">${ic('back', T.primary, 40, 2.6)}<span class="h3">2026년 10월</span>${ic('chevron', T.primary, 40, 2.6)}</div>
      <div class="grid">
        ${['일', '월', '화', '수', '목', '금', '토'].map((w, i) => `<span class="wd" style="color:${i === 0 ? T.sun : i === 6 ? T.sat : T.textSecondary}">${w}</span>`).join('')}
        ${calendarGrid()}
      </div>
      <div class="row" style="gap:28px;padding:10px 8px 22px" >
        <span class="row cap12" style="gap:8px"><span style="width:18px;height:18px;border-radius:50%;background:${T.primary}"></span>연가 (3일)</span>
        <span class="row cap12" style="gap:8px">${ic('star', T.accent, 24, 2.4)}포상</span>
        <span class="row cap12" style="gap:8px"><span style="width:14px;height:14px;border-radius:50%;background:${T.accent}"></span>일정</span>
      </div>
      <div style="background:${T.sunken};border-radius:28px;padding:26px 28px">
        <div class="t15" style="margin-bottom:14px">2026년 10월 27일</div>
        <div class="row" style="gap:14px;padding:6px 0"><span style="width:14px;height:14px;border-radius:50%;background:${T.primary}"></span><span style="font-size:28px;font-weight:600">연가 3일</span></div>
        <div class="row" style="gap:14px;padding:6px 0">${ic('star', T.accent, 26, 2.4)}<span style="font-size:28px;font-weight:600">포상휴가 +1일</span></div>
      </div>
    </div>
  </div>`,
};

// ── 4. 급여 ───────────────────────────────────────────────────────
const salary = {
  tag: '월급 · 적금', title: '이번 달 월급,<br><b>전역 목돈</b>까지',  tab: 'wallet',
  body: `${appbar('급여 계산')}
  <div class="body">
    <div class="hero" style="border-radius:56px;padding:40px">
      <span class="sheen" style="border-radius:999px;padding:6px 22px;font-size:26px;font-weight:800">상병</span>
      <div style="font-size:28px;font-weight:700;color:${T.heroMuted};margin-top:22px">이번 달 예상 급여</div>
      <div style="display:flex;align-items:baseline;gap:6px"><span style="font-size:96px;font-weight:900;letter-spacing:-3px">1,200,000</span><span style="font-size:40px;font-weight:700">원</span></div>
      <div style="font-size:26px;font-weight:600;color:${T.heroMuted}">복무 13개월째</div>
    </div>
    <div class="card">
      ${cardTitle('wallet', '급여 현황')}
      <div class="row"><div class="grow"><div class="t15">총 수령 예정액</div><div class="cap12">복무 18개월 기준</div></div><span style="font-size:40px;font-weight:800">20,100,000원</span></div>
      <div class="row" style="margin-top:26px"><span class="t15 grow">현재까지 수령</span><span style="font-size:32px;font-weight:800;color:${T.primary}">64%</span></div>
      <div style="position:relative;height:20px;border-radius:10px;background:${T.border};margin-top:16px;overflow:hidden">
        <div style="width:64%;height:100%;background:${T.primary};border-radius:10px"></div>
        ${[1 / 9, 4 / 9, 7 / 9].map((x) => `<span style="position:absolute;top:0;bottom:0;left:${(x * 100).toFixed(1)}%;width:3px;background:#fff"></span>`).join('')}
      </div>
      <div class="cap12" style="margin-top:10px">눈금은 계급이 바뀌는 지점이에요</div>
      <div class="row" style="gap:16px;margin-top:24px">
        <div class="grow" style="background:${T.primarySoft};border-radius:28px;padding:22px 26px"><div class="cap12">수령</div><div style="font-size:36px;font-weight:800;color:${T.primary}">12,900,000원</div></div>
        <div class="grow" style="background:${T.sunken};border-radius:28px;padding:22px 26px"><div class="cap12">남음</div><div style="font-size:36px;font-weight:800">7,200,000원</div></div>
      </div>
    </div>
    <div class="card" style="padding:12px 32px">
      ${[['list', T.primary, T.primarySoft, '병사 월급 가이드', '계급별 표준 월급 참고표'],
         ['calc', T.success, T.successSoft, '장병내일적금 계산기', '전역 시 받을 목돈을 미리 계산'],
         ['gift', T.textSecondary, T.sunken, '군인 혜택 모음', '금융·교통·문화·자기계발 할인과 지원']].map(([i, c, bg, t, sub], k) => `
      ${k ? '<div class="divider"></div>' : ''}
      <div class="row" style="padding:22px 0">${tintBox(i, c, bg)}<div class="grow"><div class="t15">${t}</div><div class="cap12">${sub}</div></div>${ic('chevron', T.textLight, 34)}</div>`).join('')}
    </div>
  </div>`,
};

// ── 5. 가족 공유 ──────────────────────────────────────────────────
const qr = () => {
  // 목업용 QR 모양 (실제 코드 아님)
  const N = 25; let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const finder = (x, y) => x < 7 && y < 7 || x >= N - 7 && y < 7 || x < 7 && y >= N - 7;
  let cells = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let on;
    if (finder(x, y)) {
      const fx = x < 7 ? x : x - (N - 7), fy = y < 7 ? y : y - (N - 7);
      on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4);
    } else if ((x === 7 || x === N - 8) && y < 8 || (y === 7 || y === N - 8) && x < 8) on = false;
    else on = rnd() > 0.52;
    if (on) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return `<svg viewBox="0 0 ${N} ${N}" width="300" height="300" shape-rendering="crispEdges">${cells}</svg>`;
};
const share = {
  tag: '가족 공유', title: '곰신·부모님과<br><b>D-Day 함께 세기</b>',
  body: `${appbar('가족에게 공유', '곰신·부모님과 전역일 함께 세기', true)}
  <div class="body">
    <div class="card row" style="align-items:flex-start;gap:24px">
      ${tintBox('heart', T.primary, T.primarySoft, 88)}
      <div class="grow"><div style="font-size:32px;font-weight:800">2027년 4월 4일 전역 · D-167</div>
      <div class="cap12" style="margin-top:6px;line-height:1.45">받는 사람의 앱에 이 전역일이 프로필로 추가돼요. 위젯·알림도 그쪽에서 그대로 동작해요.</div></div>
    </div>
    <div class="card">
      ${cardTitle('key', '공유 코드')}
      <div style="background:${T.sunken};border-radius:20px;padding:24px 28px;font-size:32px;font-weight:800;letter-spacing:.5px;color:${T.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">JY1-6rmA7JuQ7KSALCIyMDI1LTEwLTA0…</div>
      <div class="btn p" style="margin-top:22px">${ic('send', '#fff', 40)}메시지로 보내기</div>
      <div class="btn s" style="margin-top:16px">${ic('copy', T.primary, 40)}코드만 복사</div>
    </div>
    <div class="card">
      ${cardTitle('qr', '옆에 있다면 QR 로')}
      <div class="cap12" style="line-height:1.45">상대방 폰의 기본 카메라로 찍으면 '전역까지' 앱이 열려요. (앱이 설치되어 있어야 해요)</div>
      <div style="margin:24px auto 0;width:364px;background:#fff;border:2px solid ${T.border};border-radius:28px;padding:32px">${qr()}</div>
    </div>
  </div>`,
};

// ── 6. 테마 + 위젯 ────────────────────────────────────────────────
const THEMES = [
  ['새벽', '밝아오는 하늘빛과 민트', ['#8FD0FF', '#7BE9CF'], '#13488D', '#1366D6', '#0A7A60', true],
  ['야간투시', '심야 벙커의 민트 네온', ['#8BEBCB', '#6FD5FF'], '#00543D', '#007F59', '#5B3FE0'],
  ['포레스트', '깊은 숲 그린과 메탈릭 골드', ['#96DCBC', '#CDEBA6'], '#0C573D', '#234E44', '#D99A2B'],
  ['오로라', '흐르는 빛의 그라데이션', ['#C9B8FF', '#E3A8E8', '#A8D8FF'], '#4C2894', '#5B4BD6', '#D6417F'],
  ['노을', '연병장에 내리는 저녁 빛', ['#FFC9A8', '#FFAF9C'], '#7D270A', '#BA4F1E', '#B87700'],
  ['벚꽃', '면회 온 봄날', ['#FFC8DA', '#FFD8E4'], '#9D184D', '#B4436B', '#5F7241'],
];
const themeCard = ([name, desc, grad, acc, p, a, sel]) => `
  <div style="background:#fff;border:${sel ? `4px solid ${T.primary}` : `2px solid ${T.border}`};border-radius:28px;padding:16px;${sel ? '' : 'margin:2px'}">
    <div style="height:148px;border-radius:20px;background:linear-gradient(135deg,${grad.join(',')});padding:20px 22px;display:flex;flex-direction:column;justify-content:space-between">
      <span style="font-size:44px;font-weight:900;color:${acc};letter-spacing:-1px">D-123</span>
      <span style="height:10px;border-radius:5px;background:rgba(0,0,0,.14);overflow:hidden"><span style="display:block;width:62%;height:100%;background:${acc}"></span></span>
    </div>
    <div class="row" style="gap:8px;margin-top:14px">
      ${[0, 1, 2].map(() => `<span style="width:12px;height:12px;border-radius:50%;background:${T.border}"></span>`).join('')}
      <span class="grow"></span><span style="width:26px;height:26px;border-radius:8px;background:${p}"></span><span style="width:26px;height:26px;border-radius:8px;background:${a}"></span>
    </div>
    <div class="row" style="gap:8px;margin-top:12px"><span style="font-size:30px;font-weight:800">${name}</span>${sel ? ic('check', T.primary, 34, 2.4) : ''}</div>
    <div class="cap12" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${desc}</div>
  </div>`;
const theme = {
  tag: '테마 12종 · 홈 위젯', title: '내 스타일대로,<br><b>홈 화면</b>에서 바로',
  body: `${appbar('테마', '앱 전체 색을 바꿉니다', true)}
  <div class="body">
    <div class="card row" style="padding:16px;gap:12px">
      ${[['phone', '시스템', true], ['sunny', '라이트'], ['moon', '다크']].map(([i, l, on]) => `
      <span class="grow row" style="justify-content:center;gap:10px;height:76px;border-radius:20px;font-size:28px;font-weight:700;
        ${on ? `background:${T.primarySoft};color:${T.primary}` : `color:${T.textSecondary}`}">${ic(i, on ? T.primary : T.textSecondary, 34)}${l}</span>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">${THEMES.map(themeCard).join('')}</div>
  </div>`,
  // 위젯: 폰 프레임 아래쪽에 겹쳐 띄운다 (테마의 다크 팔레트 — 새벽은 #12386F)
  extra: `<div style="position:absolute;left:96px;right:96px;bottom:70px;height:330px;border-radius:44px;background:#12386F;
      padding:34px 40px;box-shadow:0 30px 70px rgba(0,0,0,.6), 0 0 0 3px rgba(255,255,255,.12);color:#EAF3FF;z-index:9">
    <div class="row" style="justify-content:space-between"><span style="font-size:30px">김민준</span><span style="font-size:30px;font-weight:800;color:#3DE0B8">상병</span></div>
    <div style="font-size:104px;font-weight:900;color:#3DE0B8;line-height:1.1;letter-spacing:-2px">D-167</div>
    <div style="height:14px;border-radius:7px;background:rgba(255,255,255,.22);margin-top:8px"><div style="width:69%;height:100%;border-radius:7px;background:#3DE0B8"></div></div>
    <div class="row" style="justify-content:space-between;margin-top:14px">
      <span style="font-size:26px;color:rgba(234,243,255,.68)">복무 69% · 2027년 4월 4일</span>
      <span style="font-size:26px;font-weight:800;color:#3DE0B8">다음 휴가 D-8</span></div>
  </div>`,
};

const SCREENS = [home, roadmap, calendar, salary, share, theme];

module.exports = { SCREENS, screenshotHtml, T };
