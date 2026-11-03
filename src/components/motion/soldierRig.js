/**
 * 막대병 리그 — 포즈(worklet)와 장비 도형. **순수 모듈**: RN·reanimated import 금지.
 *
 * `StickSoldier.js`(실제 화면)와 `scripts/preview-soldiers.js`(SVG 미리보기)가
 * 둘 다 이 파일을 읽는다. 기기 없이 모양을 확인할 수 있게 하려는 것이다 —
 * 포즈를 고쳤으면 `npm run soldiers:preview` 로 그림부터 본다.
 *
 * ## 좌표 (설계 격자: 키 30 단위, 실제 크기는 u = size / 30 배)
 * - 몸 프레임: 원점 = 엉덩이. 몸통은 위(−y)로 뻗는다. 앞(진행 방향) = +x.
 * - 각도: CSS rotate 와 같다 — 양수 = 시계 방향. 아래로 늘어뜨린 팔다리를
 *   양수로 돌리면 **뒤(왼쪽)**, 음수면 **앞(오른쪽)** 으로 간다.
 * - `lean` 은 몸 전체 회전(양수 = 앞으로 숙임). v1.4.1 의 달리기는 rotate(−12)
 *   로 그려져 실제로는 뒤로 젖혀져 있었다 — 여기서 부호를 바로잡았다.
 * - 손 프레임: 아래팔 끝. +y = 아래팔이 뻗던 방향의 연장, +x = 그 오른쪽 수직.
 *   손에 드는 장비(소총·삽·깃발…)는 이 프레임에서 정의한다.
 *
 * ## 포즈 함수
 * `pose(phi)` (phi ∈ [0, 2π)) → { lean, bodyY, thighA, shinA, thighB, shinB,
 *   armA, forearmA, armB, forearmB, flash }. A = 가까운 쪽, B = 먼 쪽(흐리게).
 * UI 스레드에서 돌기 때문에 **모든 함수에 'worklet' 이 있어야 한다** —
 * 빠지면 홈 진입 즉시 "Object is not a function" 으로 죽는다 (v1.4.1 전례).
 * test-skins.js 가 소스를 정적으로 검사한다.
 */

export const G = {
  headR: 3.4,
  neck: 0.8,
  torso: 9,
  upperArm: 5,
  forearm: 4.5,
  thigh: 6,
  shin: 6,
  hipY: 17.4,
  hipX: 14,
};

export function dims(u) {
  return {
    w: Math.max(2, 2.6 * u),   // 선 두께
    headR: G.headR * u,
    neck: G.neck * u,
    torso: G.torso * u,
    upperArm: G.upperArm * u,
    forearm: G.forearm * u,
    thigh: G.thigh * u,
    shin: G.shin * u,
    hipX: G.hipX * u,
    hipY: G.hipY * u,
  };
}

/* ─── 포즈 ─────────────────────────────────────────────────────────── */

function knee(p) {
  'worklet';
  // 다리가 뒤에서 앞으로 감겨 올 때(cos 최대 근처) 가장 많이 접힌다
  const c = 0.5 + 0.5 * Math.cos(p + 0.3);
  return 12 + 62 * c * c;
}

function runPose(phi) {
  'worklet';
  return {
    lean: 12,
    bodyY: -1.2 * (0.5 + 0.5 * Math.cos(phi * 2)),
    thighA: -35 * Math.sin(phi),
    shinA: knee(phi),
    thighB: -35 * Math.sin(phi + Math.PI),
    shinB: knee(phi + Math.PI),
    armA: 40 * Math.sin(phi),
    forearmA: -75,
    armB: -40 * Math.sin(phi),
    forearmB: -75,
    flash: 0,
  };
}

function walkKnee(p, amp) {
  'worklet';
  const c = Math.max(0, Math.cos(p));
  return 4 + amp * c * c;
}

function marchPose(phi) {
  'worklet';
  return {
    lean: 18,
    bodyY: -0.7 * (0.5 + 0.5 * Math.cos(phi * 2)),
    thighA: -24 * Math.sin(phi),
    shinA: walkKnee(phi, 42),
    thighB: -24 * Math.sin(phi + Math.PI),
    shinB: walkKnee(phi + Math.PI, 42),
    // 멜빵을 잡은 손 — 팔은 거의 고정, 걸음에 맞춰 살짝만 흔들린다
    armA: -22 + 6 * Math.sin(phi),
    forearmA: -95,
    armB: -22 - 6 * Math.sin(phi),
    forearmB: -95,
    flash: 0,
  };
}

function messPose(phi) {
  'worklet';
  return {
    lean: 3,
    bodyY: -0.5 * (0.5 + 0.5 * Math.cos(phi * 2)),
    thighA: -20 * Math.sin(phi),
    shinA: walkKnee(phi, 34),
    thighB: -20 * Math.sin(phi + Math.PI),
    shinB: walkKnee(phi + Math.PI, 34),
    // 식판을 앞으로 받쳐 든 두 팔 — 아래팔이 수평이 되게
    armA: -30 + 2 * Math.sin(phi * 2),
    forearmA: -62,
    armB: -24 + 2 * Math.sin(phi * 2),
    forearmB: -68,
    flash: 0,
  };
}

function shootPose(phi) {
  'worklet';
  // 한 주기에 한 발. 쏜 직후 k=1 → 0.2 주기 안에 0 으로 가라앉는다.
  const q = Math.max(0, 1 - phi / 1.3);
  const k = q * q;
  return {
    lean: 6 - 4 * k,
    bodyY: 0,
    thighA: -12,
    shinA: 3,
    thighB: 15,
    shinB: 2,
    armA: -70 - 6 * k,
    forearmA: -22,
    armB: -23 - 4 * k,
    forearmB: -109,
    flash: k,
  };
}

function salutePose(phi) {
  'worklet';
  return {
    lean: 0,
    bodyY: 0.25 * Math.sin(phi),       // 숨쉬기
    thighA: -3,
    shinA: 0,
    thighB: 3,
    shinB: 0,
    armA: -123,     // 위팔은 앞·위로
    forearmA: -85,  // 손끝이 이마 앞에 닿는다
    armB: 4,
    forearmB: -4,
    flash: 0,
  };
}

function digPose(phi) {
  'worklet';
  const s = 0.5 - 0.5 * Math.cos(phi);   // 0 = 들어 올림, 1 = 찔러 넣음
  return {
    lean: 8 + 24 * s,
    bodyY: 1.4 * s,
    thighA: -24,
    shinA: 8 + 14 * s,
    thighB: 20,
    shinB: 10 + 12 * s,
    armA: -62 + 30 * s,
    forearmA: -20,
    armB: -30 + 26 * s,
    forearmB: -55,
    flash: 0,
  };
}

function pushupPose(phi) {
  'worklet';
  const k = 0.5 - 0.5 * Math.cos(phi);   // 0 = 팔 편 위, 1 = 내려간 아래
  const lean = 63 + 11 * k;
  const armAbs = 60 * k;                  // 위팔: 수직 → 뒤·아래
  const foreAbs = -40 * k;                // 아래팔: 수직 → 앞·아래
  return {
    lean,
    bodyY: 5.2 + 2.1 * k,
    thighA: 0,
    shinA: 0,
    thighB: 0,
    shinB: 0,
    armA: armAbs - lean,
    forearmA: foreAbs - armAbs,
    armB: armAbs - lean - 4,
    forearmB: foreAbs - armAbs,
    flash: 0,
  };
}

function sweepPose(phi) {
  'worklet';
  const s = Math.sin(phi);
  return {
    lean: 16,
    bodyY: 0.6,
    thighA: -14,
    shinA: 6,
    thighB: 16,
    shinB: 6,
    armA: -26 + 16 * s,
    forearmA: -12,
    armB: -8 + 16 * s,
    forearmB: -40,
    flash: 0,
  };
}

function flagPose(phi) {
  'worklet';
  const r = runPose(phi);
  return {
    lean: r.lean,
    bodyY: r.bodyY,
    thighA: r.thighA,
    shinA: r.shinA,
    thighB: r.thighB,
    shinB: r.shinB,
    armA: -55 + 5 * Math.sin(phi),   // 깃대를 앞·위로 치켜든다
    forearmA: -110,
    armB: r.armB,
    forearmB: r.forearmB,
    flash: 0,
  };
}

function leavePose(phi) {
  'worklet';
  const r = runPose(phi);
  return {
    lean: 8,
    bodyY: -2.4 * (0.5 + 0.5 * Math.cos(phi * 2)),   // 깡충깡충
    thighA: r.thighA * 0.8,
    shinA: r.shinA,
    thighB: r.thighB * 0.8,
    shinB: r.shinB,
    armA: -105 + 10 * Math.sin(phi * 2),               // 앞으로 뻗어 손 흔들기 — 신났다
    forearmA: -55,
    armB: r.armB,
    forearmB: r.forearmB,
    flash: 0,
  };
}

/** 전역 당일·전역 후 — 어떤 모습이든 만세 */
export function cheerPose() {
  'worklet';
  return {
    lean: 0,
    bodyY: 0,
    thighA: -16,
    shinA: 0,
    thighB: 16,
    shinB: 0,
    armA: -150,
    forearmA: -10,
    armB: 150,
    forearmB: 10,
    flash: 0,
  };
}

/* ─── 장비 도형 ──────────────────────────────────────────────────────
 * { x, y, w, h, r?, o?, flash? } — 단위 u, 각 앵커 프레임의 좌상단 기준.
 * 색은 몸과 같은 한 가지(`color`)다 — 테마 12종 × 단계별 accent 를 그대로 따라간다.
 * 겹치는 곳이 구분되도록 큰 덩어리는 opacity 를 낮춘다. */

const HELMET = [
  { x: -4.2, y: -4.5, w: 8.4, h: 5.4, r: 2.7 },    // 돔
  { x: -4.8, y: -0.3, w: 9.6, h: 1.1, r: 0.55 },   // 챙
];
const CAP = [
  { x: -3.3, y: -5.4, w: 6.4, h: 3.6, r: 0.8 },    // 납작한 정수리
  { x: 2.2, y: -2.4, w: 3.4, h: 1.0, r: 0.5 },     // 앞 챙
];

const PACK = [
  { x: -8.0, y: -10.4, w: 6.6, h: 9.2, r: 1.8, o: 0.8 },   // 군장
  { x: -8.4, y: -12.4, w: 6.8, h: 2.2, r: 1.1, o: 0.8 },   // 위에 말아 얹은 침낭
];

// 손 프레임: +y = 아래팔 연장. 아래팔이 앞을 향하면(−90°) +x = 위. 주석의 '앞/위' 는 해당 포즈 기준.
const RIFLE = [
  { x: -0.4, y: -9.4, w: 1.2, h: 14.6, r: 0.4 },   // 총몸·총열 (앞 = +y)
  { x: -1.8, y: -9.8, w: 2.6, h: 3.4, r: 0.6 },    // 개머리판
  { x: -3.0, y: -3.6, w: 2.6, h: 1.4, r: 0.4 },    // 탄창 (아래 = −x)
  { x: 0.6, y: -1.6, w: 1.0, h: 1.2, r: 0.3 },     // 가늠자 (위 = +x)
  { x: -1.1, y: 5.0, w: 2.6, h: 2.6, r: 1.3, flash: true },   // 총구 화염
];
const TRAY = [
  { x: 0.4, y: -3.8, w: 0.9, h: 7.6, r: 0.45 },    // 식판 (위 = +x)
  { x: 1.1, y: -2.8, w: 1.7, h: 1.7, r: 0.85, o: 0.85 },    // 밥
  { x: 1.1, y: 0.4, w: 1.5, h: 2.0, r: 0.6, o: 0.85 },      // 국그릇
];
const SHOVEL = [
  { x: -0.45, y: -3.6, w: 0.9, h: 10.8, r: 0.45 },  // 자루
  { x: -1.3, y: -4.4, w: 2.6, h: 0.9, r: 0.45 },    // 손잡이
  { x: -1.8, y: 6.6, w: 3.6, h: 3.8, r: 1.1 },      // 삽날
];
const BROOM = [
  { x: -0.4, y: -4.0, w: 0.8, h: 10.6, r: 0.4 },    // 자루
  { x: -2.4, y: 6.0, w: 4.8, h: 3.0, r: 0.6, o: 0.85 },     // 빗자루 털
];
const FLAG = [
  { x: -0.4, y: -3.0, w: 0.8, h: 12.0, r: 0.4 },    // 깃대
  { x: 0.2, y: 4.6, w: 6.0, h: 4.2, r: 0.5, o: 0.8 },      // 깃발 (+x = 뒤쪽으로 나부낀다)
  { x: -0.9, y: 8.6, w: 1.8, h: 1.8, r: 0.9 },      // 깃대 끝
];
// 몸 프레임 — 어깨에 둘러멘 더플백 (등 뒤로 가로로 눕는다)
const DUFFEL = [
  { x: -8.6, y: -9.6, w: 7.6, h: 4.0, r: 2.0, o: 0.8 },
  { x: -2.2, y: -9.2, w: 1.0, h: 3.2, r: 0.5, o: 0.8 },   // 멜빵
];

/**
 * 모습 id → 리그. 카탈로그(`constants/soldierSkins.js`)와 id 가 같아야 한다.
 *  cycle  한 주기 (ms)       rest   정지 포즈의 주기 위치 (0..1)
 *  lines  달릴 때 속도선      head/back/hand/handB  장비
 *  impulse 주기 경계에서 일부러 튄다 (사격 반동) — 연속성 검사 제외
 */
export const RIGS = {
  run:    { pose: runPose,    cycle: 560,  rest: 0.25, lines: true },
  march:  { pose: marchPose,  cycle: 1150, rest: 0.25, head: HELMET, back: PACK },
  mess:   { pose: messPose,   cycle: 950,  rest: 0.25, head: CAP, hand: TRAY },
  // impulse — 주기 시작에 반동이 '탕' 하고 튄다 (의도된 불연속)
  shoot:  { pose: shootPose,  cycle: 1500, rest: 0.6,  head: HELMET, hand: RIFLE, impulse: true },
  salute: { pose: salutePose, cycle: 2600, rest: 0,    head: CAP },
  dig:    { pose: digPose,    cycle: 1300, rest: 0.5,  head: HELMET, hand: SHOVEL },
  pushup: { pose: pushupPose, cycle: 1700, rest: 0 },
  sweep:  { pose: sweepPose,  cycle: 1100, rest: 0.25, hand: BROOM },
  flag:   { pose: flagPose,   cycle: 560,  rest: 0.25, lines: true, hand: FLAG },
  leave:  { pose: leavePose,  cycle: 680,  rest: 0.25, lines: true, head: CAP, back: DUFFEL },
};

export const DEFAULT_RIG = 'run';

export function rigFor(id) {
  return RIGS[id] || RIGS[DEFAULT_RIG];
}
