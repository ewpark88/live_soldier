/* eslint-disable no-console */
/**
 * 사용 가이드(constants/guides.js) · [?] 배선 검증.
 *
 *   node scripts/test-guides.js
 *
 * 지키는 것
 *  - 모든 신분 × 모든 주제가 예외 없이 만들어지고, 문장에 'undefined'·'null' 이 새지 않는다
 *  - 대체복무 문구에 '입대·전역·곰신·진급' 이 하드코딩돼 새지 않는다 (앱 이름 ‘전역까지’ 만 예외)
 *  - 간부 문구에 병 계급(일병·상병) 진급 안내가 나오지 않는다
 *  - 신분에 없는 기능(적금·혜택)은 주제 자체가 빠진다
 *  - 주제의 '이 화면으로 가기' 라우트가 실제 네비게이터에 있다
 *  - 화면의 <HelpButton topic="…"> 이 전부 존재하는 주제를 가리킨다
 *  - 위젯 카탈로그 이름마다 receiver 클래스 · provider XML · 매니페스트 항목이 있다
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
const babel = require(path.join(ROOT, 'node_modules', '@babel', 'core'));
global.__DEV__ = false;

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
  const realRequire = m.require.bind(m);
  m.require = (id) => {
    if (id.startsWith('.')) {
      const dep = path.resolve(path.dirname(abs), id.endsWith('.js') ? id : `${id}.js`);
      return loadModule(path.relative(ROOT, dep));
    }
    return realRequire(id);
  };
  m._compile(out, abs);
  return m.exports;
}

let pass = 0, fail = 0;
const fails = [];
function ok(cond, label) {
  if (cond) pass++;
  else { fail++; fails.push(`✗ ${label}`); }
}

const G = loadModule('src/constants/guides.js');
const T = loadModule('src/constants/serviceTerms.js');
const B = loadModule('src/constants/benefits.js');

const TYPES = [null, ...T.PERSONNEL_TYPES.map((p) => p.key)];

/** 주제의 모든 문자열 */
function strings(g) {
  const out = [g.title, g.summary];
  for (const s of g.sections) {
    out.push(s.title, s.body, ...(s.steps || []), ...(s.tips || []));
  }
  return out.filter((x) => x != null);
}

/* ── 모든 신분 × 모든 주제 ── */
for (const pt of TYPES) {
  const topics = G.guideTopics(pt);
  ok(topics.length >= 10, `${pt}: 주제가 10개 이상 (${topics.length})`);
  for (const g of topics) {
    const tag = `${pt}/${g.id}`;
    ok(typeof g.title === 'string' && g.title.length > 0, `${tag}: title`);
    ok(typeof g.icon === 'string' && g.icon.length > 0, `${tag}: icon`);
    ok(typeof g.summary === 'string' && g.summary.length > 0, `${tag}: summary`);
    ok(Array.isArray(g.sections) && g.sections.length > 0, `${tag}: sections`);
    for (const s of g.sections) {
      ok(!!(s.body || s.steps?.length || s.tips?.length), `${tag}/${s.title}: 내용 있음`);
    }
    for (const line of strings(g)) {
      ok(!/undefined|null|NaN|\[object/.test(line), `${tag}: 값 누수 없음 — "${line}"`);
      ok(typeof line === 'string', `${tag}: 문자열`);
    }

    // 대체복무 — 현역 용어가 새지 않는다 (앱 이름 ‘전역까지’ 는 고정 이름이라 예외)
    if (T.isAlternative(pt)) {
      for (const line of strings(g)) {
        const scrubbed = line.replace(/‘전역까지’/g, '');
        ok(!/전역|입대|곰신|진급|계급장/.test(scrubbed), `${tag}: 현역 용어 없음 — "${line}"`);
      }
    }
    // 간부 — 병 계급 진급 안내가 없다
    if (T.isOfficer(pt)) {
      for (const line of strings(g)) {
        ok(!/일병|상병|병장/.test(line), `${tag}: 병 계급 없음 — "${line}"`);
      }
    }
  }

  // 신분에 없는 기능은 주제가 빠진다
  const ids = topics.map((g) => g.id);
  ok(ids.includes('savings') === T.savingsEligible(pt), `${pt}: 적금 주제 ⇔ savingsEligible`);
  ok(ids.includes('benefits') === (B.benefitsFor(pt).length > 0), `${pt}: 혜택 주제 ⇔ benefitsFor`);
}

/* ── 그룹이 순서 목록을 빠짐없이 덮는다 ── */
const grouped = G.GUIDE_GROUPS.flatMap((g) => g.ids);
for (const id of G.GUIDE_ORDER) ok(grouped.includes(id), `GUIDE_GROUPS 에 ${id} 포함`);
ok(new Set(grouped).size === grouped.length, 'GUIDE_GROUPS 중복 없음');

/* ── 라우트가 실제로 있다 ── */
const navSrc = ['src/navigation/RootNavigator.js', 'src/navigation/TabNavigator.js']
  .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
const routes = new Set([...navSrc.matchAll(/name="([^"]+)"/g)].map((m) => m[1]));
for (const pt of TYPES) {
  for (const g of G.guideTopics(pt)) {
    if (g.route) ok(routes.has(g.route.name), `${pt}/${g.id}: 라우트 '${g.route.name}' 존재`);
  }
}
ok(routes.has('guide') && routes.has('widgets'), '가이드·위젯 화면이 루트 스택에 등록됨');

/* ── 화면의 [?] 가 존재하는 주제를 가리킨다 ── */
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []);
}
let helpCount = 0;
for (const f of walk(path.join(ROOT, 'src'))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/<HelpButton[^>]*topic="([^"]+)"/g)) {
    helpCount++;
    ok(G.GUIDE_ORDER.includes(m[1]), `${path.relative(ROOT, f)}: HelpButton topic '${m[1]}' 존재`);
  }
}
ok(helpCount >= 14, `HelpButton 이 화면 곳곳에 있다 (${helpCount}개)`);
// 캘린더는 세그먼트 key 를 주제로 쓴다 — leave·todo 가 있어야 한다
ok(G.GUIDE_ORDER.includes('leave') && G.GUIDE_ORDER.includes('todo') && G.GUIDE_ORDER.includes('calendar'),
  '캘린더 세그먼트 주제(calendar·leave·todo) 존재');

/* ── 위젯: 카탈로그 이름 ↔ 네이티브 등록 ── */
const catalogSrc = fs.readFileSync(path.join(ROOT, 'src/widget/widgetCatalog.js'), 'utf8');
const widgetNames = [...catalogSrc.matchAll(/name: '([A-Za-z]+)'/g)].map((m) => m[1]);
ok(widgetNames.length >= 2, `위젯 2종 이상 (${widgetNames.join(', ')})`);
const manifest = fs.readFileSync(path.join(ROOT, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
const javaDir = path.join(ROOT, 'android/app/src/main/java/com/jeonryeokkami/app/widget');
for (const n of widgetNames) {
  ok(fs.existsSync(path.join(javaDir, `${n}.java`)), `위젯 ${n}: receiver 클래스`);
  ok(fs.existsSync(path.join(ROOT, `android/app/src/main/res/xml/widgetprovider_${n.toLowerCase()}.xml`)), `위젯 ${n}: provider XML`);
  ok(manifest.includes(`android:name=".widget.${n}"`), `위젯 ${n}: 매니페스트 receiver`);
  ok(manifest.includes(`@xml/widgetprovider_${n.toLowerCase()}`), `위젯 ${n}: 매니페스트 provider 연결`);
}
ok(manifest.includes('RNWidgetCollectionService'), '매니페스트: 위젯 컬렉션 서비스');
const mainApp = fs.readFileSync(path.join(ROOT, 'android/app/src/main/java/com/jeonryeokkami/app/MainApplication.kt'), 'utf8');
ok(/add\(WidgetPinPackage\(\)\)/.test(mainApp), 'MainApplication: WidgetPinPackage 등록');

/* ── 결과 ── */
if (fail) {
  console.log(fails.join('\n'));
  console.log(`\nguides: ${pass} passed, ${fail} failed`);
  process.exit(1);
}
console.log(`guides: ${pass} passed, 0 failed`);
