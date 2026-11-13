/**
 * 군인 혜택 모음 (정적 큐레이션)
 * ─────────────────────────────────────────────────────────────────────────
 * 서버 없이 제공하는 군 복무 중·전역 후 혜택 정보. 링크는 공식/대표 페이지 위주.
 * 혜택 내용·금액은 정책에 따라 변동될 수 있으므로 화면 하단에 주의 문구를 둔다.
 */

import { SAVINGS } from '../utils/savingsUtils';

/* 적금 수치는 계산기(savingsUtils.SAVINGS)와 한 곳에서 — 제도가 바뀌면 SAVINGS 만 고친다 */
const SAVINGS_DESC =
  `월 최대 ${SAVINGS.MONTHLY_MAX / 10000}만원 · 연 ${Math.round(SAVINGS.DEFAULT_RATE * 100)}% 금리에 ` +
  `정부가 원금의 ${Math.round(SAVINGS.DEFAULT_MATCH * 100)}%를 매칭지원. 전역 시 목돈으로.`;
const SAVINGS_DESC_ALT = SAVINGS_DESC.replace('전역 시', '복무를 마치면');

/*
 * for: 이 항목이 해당하는 **대체복무** 신분 (v1.6). 없으면 현역 전용.
 * 확실한 것만 태그한다 — 군인 할인·장병 요금제·예비군·제대군인 지원은
 * 대체복무자에게 해당하지 않는다. altDesc/altLabel 은 대체복무에게 보여줄 문구.
 */
const ALT_ALL = ['social', 'industrial', 'research', 'professional', 'artsports'];

/*
 * cadre: 간부(부사관·준사관·장교)에게 이 항목이 해당하는가 (v1.6). **모든 항목에 명시한다.**
 *   'yes' — 해당. 그대로 보여준다.
 *   'ask' — 시설·기관·카드사마다 달라 단정할 수 없다. 보여주되 '판매처 문의'를 단다.
 *   'no'  — 제도 정의상 병사 전용(장병내일준비적금·병사 요금제·병 휴가 교통비). 숨긴다.
 * 확실하지 않으면 'no' 가 아니라 'ask' — 받을 수 있는 혜택을 숨기는 것도 손해다.
 */
const CADRE = ['nco', 'warrant', 'officer'];
export const CADRE_ASK_NOTE = '간부 적용 여부는 판매처 문의';

export const BENEFIT_CATEGORIES = [
  {
    key: 'finance',
    label: '금융·목돈',
    emoji: '💰',
    icon: 'wallet',
    items: [
      {
        title: '장병내일준비적금',
        desc: SAVINGS_DESC,
        altDesc: SAVINGS_DESC_ALT,
        tag: '강력추천',
        cadre: 'no',   // 병사 대상 제도 (간부는 가입 대상이 아니다)
        for: ['social'],   // 현역병·사회복무요원 대상 (산업기능요원 등은 아님)
        url: 'https://www.mnd.go.kr/mbshome/mbs/mnd/subview.jsp?id=mnd_011302060000',
      },
      {
        title: '나라사랑카드 우대',
        desc: '입대 시 발급. 군 전용 금리·수수료 면제·생활 할인 등 혜택 제공.',
        cadre: 'ask',   // 병역의무자 카드 — 간부 발급·우대 여부는 카드사마다 다르다
        url: 'https://www.narasarang.or.kr',
      },
      {
        title: '군 장병 우대 예·적금',
        desc: '각 은행이 현역 장병에게 제공하는 우대금리 적금 상품을 비교해 가입.',
        cadreDesc: '각 은행이 현역 군인(간부 포함)에게 제공하는 우대금리 상품을 비교해 가입.',
        cadre: 'yes',
      },
    ],
  },
  {
    key: 'transport',
    label: '교통',
    emoji: '🚆',
    icon: 'train',
    items: [
      {
        title: 'KTX·SRT 군인 할인',
        desc: '현역 군인 운임 할인. 나라사랑포털/앱에서 군인 인증 후 예매.',
        cadre: 'ask',
        url: 'https://www.letskorail.com',
      },
      {
        title: '고속·시외버스 할인',
        desc: '군인(현역) 신분증 제시 시 일부 노선 운임 할인.',
        cadre: 'ask',
      },
      {
        title: '정기 외출·휴가 교통비',
        desc: '부대·지자체별 휴가 교통비 지원 제도를 확인하세요.',
        cadre: 'no',   // 병사 정기휴가 교통비
      },
    ],
  },
  {
    key: 'culture',
    label: '문화·여가',
    emoji: '🎬',
    icon: 'film',
    items: [
      {
        title: '영화관 군인 할인',
        desc: 'CGV·롯데시네마·메가박스 등 군인 할인 요금. 신분증 지참.',
        cadre: 'ask',
      },
      {
        title: '놀이공원·관광지 할인',
        desc: '에버랜드·롯데월드 등 다수 시설이 군인 할인 적용.',
        cadre: 'ask',
      },
      {
        title: '국립 박물관·고궁 무료/할인',
        desc: '제복 착용 또는 군인 신분증 제시 시 무료·할인 입장.',
        cadre: 'ask',
      },
    ],
  },
  {
    key: 'telecom',
    label: '통신',
    emoji: '📱',
    icon: 'phone-portrait',
    items: [
      {
        title: '군 장병 전용 요금제',
        desc: '통신 3사 모두 병사 전용 요금제·데이터 혜택 운영. 통신사 앱/대리점에서 신청.',
        cadre: 'no',   // 이름 그대로 병사 전용
      },
      {
        title: '나라사랑 멤버십 제휴',
        desc: '나라사랑포털 제휴 통신·쇼핑 할인 혜택을 확인하세요.',
        cadre: 'ask',
        url: 'https://www.narasarang.or.kr',
      },
    ],
  },
  {
    key: 'growth',
    label: '자기계발',
    emoji: '📚',
    icon: 'school',
    items: [
      {
        title: '국방모바일 e러닝',
        desc: '복무 중 무료 온라인 강좌·자격 준비. 자투리 시간 활용에 좋음.',
        cadre: 'yes',   // 국방부 장병 대상 (간부 포함)
      },
      {
        title: '대학 학점 인정(군 복무 학점)',
        desc: '군 복무 중 이수한 과정·자격을 학점은행제 등으로 인정받을 수 있음.',
        cadre: 'ask',   // 대학·과정마다 인정 대상이 다르다
      },
      {
        title: '국가기술자격 응시료 지원',
        desc: '복무 중 자격증 취득 시 응시료 지원 제도를 확인하세요.',
        cadre: 'ask',   // 병사 자기개발 지원과 겹쳐 간부 적용은 기관 확인 필요
        url: 'https://www.q-net.or.kr',
      },
      {
        title: 'K-MOOC 무료 강좌',
        desc: '대학 명품 강의를 무료로. 전역 후 진로·취업 준비에 활용.',
        altDesc: '대학 명품 강의를 무료로. 복무를 마친 뒤 진로·취업 준비에 활용.',
        url: 'https://www.kmooc.kr',
        cadre: 'yes',
        for: ALT_ALL,   // 누구나 무료
      },
    ],
  },
  {
    key: 'after',
    label: '전역 후',
    altLabel: '복무 후',
    emoji: '🎓',
    icon: 'briefcase',
    items: [
      {
        title: '예비군 훈련 안내',
        desc: '전역 후 예비군 편성·훈련 일정은 예비군 홈페이지에서 확인·연기 신청.',
        cadre: 'yes',
        url: 'https://www.yebigun1.mil.kr',
      },
      {
        title: '제대군인 취업·창업 지원',
        desc: '국가보훈부 제대군인지원센터의 취업·교육·창업 지원 프로그램.',
        cadreTag: '중·장기복무 추천',
        cadre: 'yes',
        url: 'https://www.vnet.go.kr',
      },
      {
        title: '복학·전직 지원',
        desc: '복학 시기·군 경력 활용 등 전역 후 진로 설계를 미리 준비하세요.',
        cadreDesc: '군 경력 인정·전직 지원 교육 등 전역 후 진로 설계를 미리 준비하세요.',
        cadre: 'yes',
      },
    ],
  },
];

export const BENEFIT_DISCLAIMER =
  '* 혜택 내용·금액·대상은 기관 정책에 따라 변동될 수 있습니다. 정확한 내용은 각 기관 공식 안내를 확인하세요.';

/**
 * 신분에 맞는 혜택 카테고리 (v1.6). 비어 있으면 진입점(홈·설정·급여)을 숨긴다.
 * 병사는 전부. 간부는 cadre 'no' 를 빼고, 'ask' 항목엔 `ask: true` 를 붙인다(화면이
 * '판매처 문의'를 단다). 대체복무는 해당 항목만 (항목의 `for` 태그).
 */
export function benefitsFor(personnelType) {
  if (CADRE.includes(personnelType)) {
    // 간부: 병사 전용 항목을 빼고, 간부용 설명·태그가 있으면 그것으로
    return BENEFIT_CATEGORIES
      .map((c) => ({
        ...c,
        items: c.items
          .filter((it) => it.cadre !== 'no')
          .map((it) => ({
            ...it,
            desc: it.cadreDesc ?? it.desc,
            // '판매처 문의' 항목엔 '강력추천' 같은 태그를 달지 않는다 (받을 수 있는지부터 불확실)
            tag: it.cadre === 'ask' ? undefined : (it.cadreTag ?? it.tag),
            ask: it.cadre === 'ask',
          })),
      }))
      .filter((c) => c.items.length > 0);
  }
  if (!ALT_ALL.includes(personnelType)) return BENEFIT_CATEGORIES;
  return BENEFIT_CATEGORIES
    .map((c) => ({
      ...c,
      label: c.altLabel ?? c.label,
      items: c.items
        .filter((it) => Array.isArray(it.for) && it.for.includes(personnelType))
        .map((it) => ({ ...it, desc: it.altDesc ?? it.desc })),
    }))
    .filter((c) => c.items.length > 0);
}
