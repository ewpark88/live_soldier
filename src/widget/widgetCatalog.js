import { DischargeWidget } from './DischargeWidget';
import { DdaySimpleWidget } from './DdaySimpleWidget';

/**
 * 홈 화면 위젯 목록 — 헤드리스 태스크·갱신·위젯 화면이 모두 여기서 꺼낸다.
 *
 * `name` 은 안드로이드 receiver 클래스 이름(android/.../widget/<name>.java)이고,
 * 이미 사용자 홈 화면에 깔린 위젯과 묶여 있다. **바꾸거나 지우지 않는다** —
 * 새 위젯은 끝에 추가하고, receiver·provider XML·AndroidManifest 도 같이 만든다.
 *
 * preview 의 w/h 는 위젯 화면의 미리보기 크기(dp)다.
 */
export const WIDGETS = [
  {
    name: 'DdaySimple',
    title: '심플',
    size: '2×1',
    desc: '큰 D-Day 숫자와 진행 막대만. 한눈에 보기 좋아요.',
    Component: DdaySimpleWidget,
    preview: { w: 180, h: 84 },
  },
  {
    name: 'Discharge',
    title: '기본',
    size: '3×2',
    desc: 'D-Day · 진행률 · 계급 · 전역일 · 다음 휴가까지.',
    Component: DischargeWidget,
    preview: { w: 260, h: 150 },
  },
];

export const WIDGET_BY_NAME = Object.fromEntries(WIDGETS.map((w) => [w.name, w.Component]));
