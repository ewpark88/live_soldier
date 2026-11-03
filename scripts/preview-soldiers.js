/* eslint-disable no-console */
/**
 * 막대병 미리보기 — soldierRig.js 의 포즈·장비를 SVG 로 그려 PNG 로 저장한다.
 *
 *   node scripts/preview-soldiers.js [출력.png]
 *
 * 기기 없이 모양을 확인하려는 도구다. StickSoldier.js 의 View 중첩
 * (엉덩이 → 팔다리 관절 → 손 프레임)을 <g transform> 로 똑같이 따라간다.
 * 행 = 모습, 열 = 주기 위치 0 · ¼ · ½ · ¾ · 정지 포즈 · 만세.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
const babel = require(path.join(ROOT, 'node_modules', '@babel', 'core'));

function loadModule(rel) {
  const abs = path.join(ROOT, rel);
  const out = babel.transformSync(fs.readFileSync(abs, 'utf8'), {
    filename: abs,
    presets: [[path.join(ROOT, 'node_modules', 'babel-preset-expo'), { jsxRuntime: 'classic' }]],
    babelrc: false, configFile: false,
  }).code;
  const m = new Module(rel, null);
  m.filename = abs;
  m.paths = Module._nodeModulePaths(path.dirname(abs));
  m._compile(out, abs);
  return m.exports;
}

const { RIGS, cheerPose, dims } = loadModule('src/components/motion/soldierRig.js');
const { SOLDIER_SKINS } = loadModule('src/constants/soldierSkins.js');

const SIZE = 120;
const u = SIZE / 30;
const COLOR = '#1f6f5c';
const TAU = Math.PI * 2;

function bar(d, len) {
  return `<rect x="${-d.w / 2}" y="${-d.w / 2}" width="${d.w}" height="${len + d.w}" rx="${d.w / 2}" fill="${COLOR}"/>`;
}
function shapes(list, flash) {
  return (list || []).map((g) => {
    const o = g.flash ? flash : (g.o ?? 1);
    return `<rect x="${g.x * u}" y="${g.y * u}" width="${g.w * u}" height="${g.h * u}" rx="${(g.r || 0) * u}" fill="${COLOR}" opacity="${o}"/>`;
  }).join('');
}
function limb(d, a, upper, lower, la, faded, top, gear, flash) {
  return `<g transform="translate(0 ${top}) rotate(${a})" opacity="${faded ? 0.5 : 1}">${bar(d, upper)}`
    + `<g transform="translate(0 ${upper}) rotate(${la})">${bar(d, lower)}`
    + (gear ? `<g transform="translate(0 ${lower})">${shapes(gear, flash)}</g>` : '')
    + '</g></g>';
}

function figure(rig, p, celebrate) {
  const d = dims(u);
  const shoulder = -d.torso + d.w;
  const headCY = -d.torso - d.neck - d.headR;
  const handA = celebrate ? null : rig.hand;
  const handB = celebrate ? null : rig.handB;
  return `<g transform="translate(${d.hipX} ${d.hipY}) translate(0 ${p.bodyY * u}) rotate(${p.lean})">`
    + limb(d, p.armB, d.upperArm, d.forearm, p.forearmB, !celebrate, shoulder, handB, p.flash)
    + limb(d, p.thighB, d.thigh, d.shin, p.shinB, !celebrate, 0, null, 0)
    + (rig.back ? shapes(rig.back, 0) : '')
    + `<g transform="translate(0 ${-d.torso - d.w / 2})">${bar(d, d.torso)}</g>`
    + `<circle cx="0" cy="${headCY}" r="${d.headR}" fill="${COLOR}"/>`
    + (rig.head ? `<g transform="translate(0 ${headCY})">${shapes(rig.head, 0)}</g>` : '')
    + limb(d, p.thighA, d.thigh, d.shin, p.shinA, false, 0, null, 0)
    + limb(d, p.armA, d.upperArm, d.forearm, p.forearmA, false, shoulder, handA, p.flash)
    + '</g>';
}

const COLS = [0, 0.25, 0.5, 0.75, 'rest', 'cheer'];
const CELL = SIZE + 20;
const LABEL = 150;
const W = LABEL + CELL * COLS.length;
const H = 30 + CELL * SOLDIER_SKINS.length;

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
  + `<rect width="100%" height="100%" fill="#f4f1ea"/>`;
COLS.forEach((c, i) => {
  svg += `<text x="${LABEL + i * CELL + CELL / 2}" y="20" font-size="13" text-anchor="middle" font-family="sans-serif">${c}</text>`;
});
SOLDIER_SKINS.forEach((skin, row) => {
  const rig = RIGS[skin.id];
  const y0 = 30 + row * CELL;
  svg += `<text x="8" y="${y0 + CELL / 2}" font-size="13" font-family="sans-serif">${skin.id}</text>`;
  COLS.forEach((c, i) => {
    const celebrate = c === 'cheer';
    const t = c === 'rest' ? rig.rest : celebrate ? 0 : c;
    const p = celebrate ? cheerPose() : rig.pose(t * TAU);
    const x0 = LABEL + i * CELL + 10;
    svg += `<g transform="translate(${x0} ${y0 + 10})">`
      + `<rect width="${SIZE}" height="${SIZE}" fill="none" stroke="#ccc"/>`
      + figure(rig, p, celebrate) + '</g>';
  });
});
svg += '</svg>';

const out = process.argv[2] || path.join(require('os').tmpdir(), 'soldiers-preview.png');
require(path.join(ROOT, 'node_modules', 'sharp'))(Buffer.from(svg)).png().toFile(out)
  .then(() => console.log('saved', out))
  .catch((e) => { console.error(e); process.exit(1); });
