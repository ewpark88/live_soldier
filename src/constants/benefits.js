/**
 * 군인 혜택 모음 (정적 큐레이션)
 * ─────────────────────────────────────────────────────────────────────────
 * 서버 없이 제공하는 군 복무 중·전역 후 혜택 정보. 링크는 공식/대표 페이지 위주.
 * 혜택 내용·금액은 정책에 따라 변동될 수 있으므로 화면 하단에 주의 문구를 둔다.
 */

export const BENEFIT_CATEGORIES = [
  {
    key: 'finance',
    label: '금융·목돈',
    emoji: '💰',
    icon: 'wallet',
    items: [
      {
        title: '장병내일준비적금',
        desc: '월 최대 55만원 · 연 5% 금리에 정부가 원금의 100%를 매칭지원. 전역 시 목돈으로.',
        tag: '강력추천',
        url: 'https://www.mnd.go.kr/mbshome/mbs/mnd/subview.jsp?id=mnd_011302060000',
      },
      {
        title: '나라사랑카드 우대',
        desc: '입대 시 발급. 군 전용 금리·수수료 면제·생활 할인 등 혜택 제공.',
        url: 'https://www.narasarang.or.kr',
      },
      {
        title: '군 장병 우대 예·적금',
        desc: '각 은행이 현역 장병에게 제공하는 우대금리 적금 상품을 비교해 가입.',
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
        url: 'https://www.letskorail.com',
      },
      {
        title: '고속·시외버스 할인',
        desc: '군인(현역) 신분증 제시 시 일부 노선 운임 할인.',
      },
      {
        title: '정기 외출·휴가 교통비',
        desc: '부대·지자체별 휴가 교통비 지원 제도를 확인하세요.',
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
      },
      {
        title: '놀이공원·관광지 할인',
        desc: '에버랜드·롯데월드 등 다수 시설이 군인 할인 적용.',
      },
      {
        title: '국립 박물관·고궁 무료/할인',
        desc: '제복 착용 또는 군인 신분증 제시 시 무료·할인 입장.',
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
      },
      {
        title: '나라사랑 멤버십 제휴',
        desc: '나라사랑포털 제휴 통신·쇼핑 할인 혜택을 확인하세요.',
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
      },
      {
        title: '대학 학점 인정(군 복무 학점)',
        desc: '군 복무 중 이수한 과정·자격을 학점은행제 등으로 인정받을 수 있음.',
      },
      {
        title: '국가기술자격 응시료 지원',
        desc: '복무 중 자격증 취득 시 응시료 지원 제도를 확인하세요.',
        url: 'https://www.q-net.or.kr',
      },
      {
        title: 'K-MOOC 무료 강좌',
        desc: '대학 명품 강의를 무료로. 전역 후 진로·취업 준비에 활용.',
        url: 'https://www.kmooc.kr',
      },
    ],
  },
  {
    key: 'after',
    label: '전역 후',
    emoji: '🎓',
    icon: 'briefcase',
    items: [
      {
        title: '예비군 훈련 안내',
        desc: '전역 후 예비군 편성·훈련 일정은 예비군 홈페이지에서 확인·연기 신청.',
        url: 'https://www.yebigun1.mil.kr',
      },
      {
        title: '제대군인 취업·창업 지원',
        desc: '국가보훈부 제대군인지원센터의 취업·교육·창업 지원 프로그램.',
        url: 'https://www.vnet.go.kr',
      },
      {
        title: '복학·전직 지원',
        desc: '복학 시기·군 경력 활용 등 전역 후 진로 설계를 미리 준비하세요.',
      },
    ],
  },
];

export const BENEFIT_DISCLAIMER =
  '* 혜택 내용·금액·대상은 기관 정책에 따라 변동될 수 있습니다. 정확한 내용은 각 기관 공식 안내를 확인하세요.';
