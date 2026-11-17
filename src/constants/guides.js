/**
 * 사용 가이드 본문 — 순수 데이터 (런타임 라이브러리 import 금지, serviceTerms 만 쓴다).
 *
 * 화면 우상단의 [?] 버튼(HelpButton)은 여기서 주제 하나를 꺼내 시트로 보여주고,
 * '가이드' 화면(GuideScreen)은 전체 목록과 상세를 보여준다. 문구는 한 곳에만 있다.
 *
 * 문구 규칙
 *  - '입대/전역/곰신' 같은 신분 의존 단어는 하드코딩하지 않는다 → termsFor(pt) 의 t.*
 *  - 신분에 없는 기능(대체복무의 진급·적금 등)은 아예 안내하지 않는다 → available()
 *  - 존댓말 '~해요' 체. 한 단락은 두세 문장. 버튼 이름은 화면에 보이는 그대로 ‘’ 로 감싼다.
 *
 * 주제 형태
 *   { id, title, icon, summary,
 *     sections: [{ title, body?, steps?: string[], tips?: string[] }],
 *     route?: { name, params? }   // '이 화면으로 가기' 버튼
 *   }
 */
import {
  benefitsFor,
} from './benefits';
import {
  hasSoldierRanks, isAlternative, isOfficer, josa, paydayEligible, savingsEligible, termsFor,
} from './serviceTerms';

/** 목록 순서 — 처음 쓰는 사람이 읽을 순서대로 */
export const GUIDE_ORDER = [
  'start', 'home', 'discharge', 'calendar', 'leave', 'todo', 'salary', 'savings',
  'roadmap', 'share', 'widget', 'notifications', 'dex', 'theme', 'backup', 'benefits',
];

/** 목록에서 묶어 보여줄 그룹 */
export const GUIDE_GROUPS = [
  { label: '시작하기', ids: ['start', 'home', 'discharge'] },
  { label: '기록하기', ids: ['calendar', 'leave', 'todo'] },
  { label: '돈·계획', ids: ['salary', 'savings', 'roadmap', 'benefits'] },
  { label: '더 편하게', ids: ['widget', 'notifications', 'share', 'dex', 'theme', 'backup'] },
];

function build(id, pt) {
  const t = termsFor(pt);
  const ranks = hasSoldierRanks(pt);
  const officer = isOfficer(pt);
  const alt = isAlternative(pt);
  const endUntil = `${t.end}까지`;

  switch (id) {
    case 'start':
      return {
        title: '처음 시작하기',
        icon: 'rocket-outline',
        summary: `${josa(t.info, '을/를')} 한 번만 입력하면 ${[t.endDate, ranks ? '진급일' : null, paydayEligible(pt) ? '월급날' : null, alt ? '남은 날' : null]
          .filter(Boolean).join('·')}을 앱이 알아서 계산해요.`,
        sections: [
          {
            title: '3단계면 준비 끝',
            steps: [
              `‘내 정보’ 탭 → ‘${t.infoScreen}’에서 ${t.startDate}${alt ? '와 복무 유형' : ranks ? '과 군별' : '·계급·복무 개월'}을 입력해요.`,
              `저장하면 홈에 ${t.end} D-Day 와 복무 진행률이 바로 나타나요.`,
              '휴가·일정은 ‘캘린더’ 탭에서, 급여는 ‘급여’ 탭에서 기록해요.',
            ],
          },
          {
            title: '아래 탭 4개',
            tips: [
              `홈 — ${t.end} D-Day, 다가오는 일정, 이번 주 할 일`,
              '캘린더 — 달력 · 휴가 · 일정을 한곳에서',
              '급여 — 이번 달 예상 급여와 누적 수령액',
              `내 정보 — ${t.infoScreen}, 테마, 알림, 백업 같은 설정`,
            ],
          },
          {
            title: '모르겠으면 [?] 를 눌러요',
            body: '화면 오른쪽 위의 물음표 버튼을 누르면 그 화면 사용법이 바로 열려요. 이 가이드는 ‘내 정보’ 탭의 ‘사용 가이드’에서 언제든 다시 볼 수 있어요.',
          },
          {
            title: '내 데이터는 내 폰에만',
            body: '회원가입이 없고 모든 기록은 이 기기에만 저장돼요. 폰을 바꿀 땐 ‘백업 파일 만들기’로 옮겨 주세요.',
          },
        ],
      };

    case 'home':
      return {
        title: '홈 화면 보는 법',
        icon: 'home-outline',
        summary: `가운데 링이 차오를수록 ${t.end}에 가까워져요. 링 안 숫자가 남은 날이에요.`,
        sections: [
          {
            title: '링과 D-Day',
            tips: [
              `링 — 지금까지 복무한 비율이에요. 한 바퀴를 다 채우면 ${t.end}!`,
              'D-Day 숫자 — 한 번 누르면 숫자가 다시 올라가는 연출을 볼 수 있어요.',
              '링 안 막대병 — 누르면 ‘막대병 도감’에서 모습을 바꿀 수 있어요.',
            ],
          },
          {
            title: '위쪽 줄',
            tips: [
              '프로필 이름 — 눌러서 프로필을 바꾸거나 새로 추가해요 (가족 여러 명도 OK).',
              '불꽃 배지 — 연속 출석 일수예요. 눌러서 기록을 볼 수 있어요.',
              ranks ? '계급장 — 오늘 날짜 기준의 계급이에요. 진급일은 자동 계산돼요.' : officer ? '계급장 — 지금 계급이에요.' : '아이콘 — 복무 유형을 나타내요.',
            ],
          },
          {
            title: '아래로 내리면',
            tips: [
              '다가오는 일정 — 다음 휴가, 월급날, 다음 이정표를 D-Day 로 보여줘요.',
              '이번 주 — 이번 주 달력과 오늘 할 일. 체크박스로 바로 완료할 수 있어요.',
              '오늘의 한마디 — 매일 바뀌는 응원 문구예요.',
              '바로가기 — 자주 쓰는 화면으로 한 번에 이동해요.',
            ],
          },
          {
            title: '출석 스트릭',
            body: '하루에 한 번 앱을 열면 출석이 쌓여요. 훈련으로 하루를 놓쳐도 2주에 한 번은 자동으로 보호돼서 기록이 끊기지 않아요.',
          },
        ],
      };

    case 'discharge':
      return {
        title: `${t.infoScreen} 입력`,
        icon: 'flag-outline',
        summary: `${t.startDate}${ranks ? '과 군별' : ''}만 넣으면 ${josa(t.endDate, '은/는')} 자동으로 계산돼요.`,
        route: { name: 'discharge' },
        sections: [
          {
            title: '입력하는 방법',
            steps: alt
              ? [
                  '복무 유형(세부 유형이 있으면 함께)을 확인해요.',
                  `${t.startDate}을 달력에서 골라요.`,
                  '복무 개월은 유형별 기본값이 채워져 있어요. 다르면 고쳐 주세요.',
                  `‘저장’을 누르면 ${josa(t.endDate, '이/가')} 계산돼요.`,
                ]
              : ranks
                ? [
                    `${t.startDate}을 달력에서 골라요.`,
                    '육군·해군·공군·해병대 중 군별을 골라요. 복무 개월은 자동이에요.',
                    `‘저장’을 누르면 ${t.endDate}과 진급일이 계산돼요.`,
                  ]
                : [
                    `${t.startDate}과 현재 계급을 입력해요.`,
                    '총 복무 개월을 입력해요 (의무복무기간 기준).',
                    `‘저장’을 누르면 ${t.endDate}과 호봉 추정이 계산돼요.`,
                  ],
          },
          ranks ? {
            title: '진급일이 다르다면',
            body: '표준 진급일(일병 2개월·상병 8개월·병장 14개월)로 먼저 계산돼요. 실제로 조기·지연 진급했다면 ‘진급일 관리’에서 직접 고쳐 주세요. 계급·봉급·로드맵·알림이 모두 따라 바뀌어요.',
          } : null,
          officer ? {
            title: '복무를 연장했다면',
            body: `저장 뒤 ‘복무 연장’에 연장 개월과 결정일을 기록하세요. ${josa(t.endDate, '이/가')} 그만큼 늦춰지고, 원래 ${t.endDate}도 함께 남아요. 진급하면 ‘진급 이력’에 남겨 두세요.`,
          } : null,
          {
            title: '알아두면 좋아요',
            tips: [
              `${josa(t.endDate, '은/는')} 실제 명령과 하루 이틀 차이가 날 수 있어요. 참고용으로 봐 주세요.`,
              '프로필마다 정보를 따로 가질 수 있어요 (내 것 + 가족 것).',
            ],
          },
        ].filter(Boolean),
      };

    case 'calendar':
      return {
        title: '캘린더 탭',
        icon: 'calendar-outline',
        summary: '위쪽 ‘달력 · 휴가 · 일정’ 버튼으로 보기를 바꿔요.',
        route: { name: 'calendar', params: { section: 'month' } },
        sections: [
          {
            title: '세 가지 보기',
            tips: [
              `달력 — 휴가·일정·${t.endDate}이 한 달 달력에 표시돼요.`,
              '휴가 — 남은 휴가와 사용 기록을 관리해요.',
              '일정 — 할 일과 훈련 일정을 체크리스트로 관리해요.',
            ],
          },
          {
            title: '날짜를 누르면',
            body: '달력에서 날짜를 누르면 그날의 휴가와 일정이 아래에 모여 보여요.',
          },
        ],
      };

    case 'leave':
      return {
        title: '휴가 관리',
        icon: 'airplane-outline',
        summary: officer
          ? '올해 연가를 입력하고 쓴 날을 기록하면 남은 연가를 계산해 줘요.'
          : '총 휴가 일수를 넣고 쓴 날을 기록하면 잔여 휴가를 계산해 줘요.',
        route: { name: 'calendar', params: { section: 'leave' } },
        sections: [
          {
            title: '처음 한 번',
            body: officer
              ? '‘올해 연가 입력’을 눌러 올해 받은 연가 일수를 넣어요. 해가 바뀌면 새로 입력해요.'
              : '기본 휴가 일수가 미리 채워져 있어요(비어 있으면 ‘총 휴가 일수 입력’). 다르면 ‘기본 N일 수정’을 눌러 고쳐요.',
          },
          {
            title: '휴가를 다녀오면',
            steps: [
              '‘휴가 사용’을 눌러요.',
              '달력에서 출발일과 복귀일을 골라요. 일수는 자동 계산돼요.',
              '메모(예: 정기휴가 1차)를 남기고 ‘저장’.',
            ],
          },
          {
            title: `${t.bonusLeave}을 받았다면`,
            body: `‘${t.bonusLeave} 추가’로 받은 날과 일수를 기록하면 잔여 휴가에 더해져요. ${t.bonusLeaveHint}`,
          },
          {
            title: '알아두면 좋아요',
            tips: [
              '미래 날짜로 기록하면 홈에 ‘다음 휴가 D-N’이 떠요.',
              '휴가 전날 저녁 9시에 알림을 받을 수 있어요 (알림 설정).',
              '기록을 누르면 수정하거나 지울 수 있어요.',
            ],
          },
        ],
      };

    case 'todo':
      return {
        title: '일정 · 할 일',
        icon: 'checkbox-outline',
        summary: '훈련·면회·외출 같은 일정을 체크리스트로 관리해요.',
        route: { name: 'calendar', params: { section: 'todo' } },
        sections: [
          {
            title: '추가하는 법',
            steps: [
              '오른쪽 아래 + 버튼을 눌러요.',
              '할 일 내용을 쓰고, 필요하면 날짜와 메모를 더해요.',
              '훈련 프리셋(혹한기·유격 등)을 누르면 기간이 한 번에 채워져요.',
            ],
          },
          {
            title: '관리하기',
            tips: [
              '체크박스를 누르면 완료 — 홈 ‘이번 주’에서도 바로 체크돼요.',
              '‘전체 · 미완료 · 완료’ 필터로 골라 볼 수 있어요.',
              '날짜를 정한 일정은 알림을 받을 수 있어요.',
            ],
          },
        ],
      };

    case 'salary':
      return {
        title: '급여 계산',
        icon: 'wallet-outline',
        summary: ranks
          ? '계급별 표준 월급으로 이번 달 급여와 지금까지 받은 돈을 계산해요.'
          : officer
            ? '초임 기준 봉급을 참고로 보여주고, 실제 월급을 직접 넣을 수도 있어요.'
            : '근무처 급여를 직접 넣으면 누적 수령액을 계산해요.',
        route: { name: 'salary' },
        sections: [
          {
            title: '보는 법',
            tips: [
              '맨 위 — 이번 달 예상 급여',
              `급여 현황 — 지금까지 받은 돈과 ${t.end}까지 남은 돈`,
              ranks ? '진급하면 그달부터 자동으로 금액이 바뀌어요.' : null,
            ].filter(Boolean),
          },
          {
            title: '실제 금액이 다르면',
            body: '‘급여 설정’에서 월 지급액을 직접 입력하세요. 직접 입력을 지우면 다시 기본 계산으로 돌아가요.',
          },
          paydayEligible(pt) ? {
            title: '월급날',
            body: '매월 10일이에요 (주말이면 앞당겨 계산). 공휴일은 반영하지 않아요. 알림을 켜면 당일 오전 9시에 알려 드려요.',
          } : null,
        ].filter(Boolean),
      };

    case 'savings':
      if (!savingsEligible(pt)) return null;
      return {
        title: '장병내일적금',
        icon: 'calculator-outline',
        summary: `월 납입액과 기간을 정하면 ${t.end} 때 받을 목돈을 미리 계산해요.`,
        route: { name: 'savings' },
        sections: [
          {
            title: '사용법',
            steps: [
              '월 납입액을 골라요 (1인 최대 월 55만원).',
              '가입 기간(개월)을 골라요.',
              '아래 ‘상세 내역’에서 원금·이자·정부 매칭지원금을 확인해요.',
            ],
          },
          {
            title: '알아두면 좋아요',
            tips: [
              '정부 매칭지원금은 납입 원금의 100% 기준으로 계산해요.',
              '은행 이자는 연 5% 단리 기준 추정이에요. 실제는 은행·제도에 따라 달라요.',
              `입력한 계획은 저장되고, 홈 ‘다가오는 일정’에 만기(${t.end})가 떠요.`,
            ],
          },
        ],
      };

    case 'roadmap':
      return {
        title: t.roadmapTitle,
        icon: 'map-outline',
        summary: `${t.start}부터 ${t.end}까지 이정표를 한 줄로 보여줘요.`,
        route: { name: 'roadmap' },
        sections: [
          {
            title: '무엇이 나오나요',
            tips: [
              ranks ? '진급일 (일병 · 상병 · 병장)' : officer ? '기록한 진급' : null,
              `${t.start} 100일 · 반환점 · ${t.end} 100일 전 같은 마일스톤`,
              `${t.end} 당일`,
            ].filter(Boolean),
          },
          {
            title: '이정표에 도착하면',
            body: '그날 앱을 열면 축하 화면이 떠요. 지난 이정표는 체크 표시로 남아요.',
          },
        ],
      };

    case 'share':
      return {
        title: `${t.familyAnd}에게 공유`,
        icon: 'people-outline',
        summary: `공유 코드 하나로 ${t.family}도 같은 ${t.end} D-Day 를 볼 수 있어요.`,
        route: { name: 'shareProfile' },
        sections: [
          {
            title: '보내는 쪽',
            steps: [
              '받는 사람에게 보일 이름을 확인해요.',
              '‘메시지로 보내기’로 카톡 등에 공유하거나 ‘코드만 복사’를 눌러요.',
              '옆에 있다면 QR 을 보여주고 상대 폰 카메라로 찍게 해도 돼요.',
            ],
          },
          {
            title: '받는 쪽',
            steps: [
              '코드를 복사한 채로 앱을 열면 자동으로 ‘추가할까요?’가 떠요.',
              '안 뜨면 홈 위쪽 프로필 이름 → ‘추가’ → ‘공유 코드로 추가’.',
            ],
          },
          {
            title: '무엇이 공유되나요',
            body: `이름 · ${t.startDate} · 복무 정보${ranks ? ' · 직접 고친 진급일' : ''}만 담겨요. 휴가 · 일정 · 급여 · 사진은 공유되지 않아요. 서버를 거치지 않는 코드라 계정도 필요 없어요.`,
          },
        ],
      };

    case 'widget':
      return {
        title: '홈 화면 위젯',
        icon: 'apps-outline',
        summary: '앱을 열지 않아도 폰 바탕화면에서 D-Day 를 바로 볼 수 있어요.',
        route: { name: 'widgets' },
        sections: [
          {
            title: '가장 쉬운 방법',
            steps: [
              '‘내 정보’ → ‘홈 화면 위젯’으로 가요.',
              '마음에 드는 위젯(심플 · 기본)의 ‘홈 화면에 추가’를 눌러요.',
              '뜨는 창에서 ‘추가’를 누르면 바탕화면에 놓여요.',
            ],
          },
          {
            title: '직접 추가하려면',
            steps: [
              '바탕화면 빈 곳을 길게 눌러요.',
              '‘위젯’을 눌러 목록에서 ‘전역까지’를 찾아요.',
              '원하는 위젯을 길게 눌러 바탕화면으로 끌어다 놓아요.',
            ],
          },
          {
            title: '알아두면 좋아요',
            tips: [
              '위젯을 길게 누르면 크기를 바꿀 수 있어요.',
              '30분마다, 그리고 정보를 저장할 때마다 새로 그려져요.',
              '색은 지금 고른 테마를 따라가요.',
              '위젯을 누르면 앱이 열려요.',
            ],
          },
        ],
      };

    case 'notifications':
      return {
        title: '알림 설정',
        icon: 'notifications-outline',
        summary: '필요한 알림만 골라서 켤 수 있어요.',
        route: { name: 'notifications' },
        sections: [
          {
            title: '켜는 법',
            steps: [
              '‘알림 받기’를 켜요. 처음이면 휴대폰이 권한을 물어봐요 — ‘허용’.',
              '받고 싶은 이벤트만 하나씩 켜요.',
              '‘다가오는 알림’에서 예약된 알림을 미리 확인해요.',
            ],
          },
          {
            title: '이런 알림이 있어요',
            tips: [
              `${t.end} D-100 · 30 · 7 · 1 · 당일`,
              ranks ? '진급 당일' : null,
              '휴가 전날 · 일정 · 마일스톤 전날',
              paydayEligible(pt) ? '월급날' : null,
              '출석을 놓친 날 · 매일 정한 시각 D-Day',
            ].filter(Boolean),
          },
          {
            title: '알림이 안 와요',
            body: '‘휴대폰 알림 권한이 꺼져 있어요’가 보이면 눌러서 설정에서 허용해 주세요. 배터리 절전 앱이 알림을 막는 경우도 있어요.',
          },
        ],
      };

    case 'dex':
      return {
        title: '막대병 도감',
        icon: 'body-outline',
        summary: '홈 링 안에서 달리는 막대병의 모습을 바꿔요.',
        route: { name: 'soldierDex' },
        sections: [
          {
            title: '사용법',
            steps: [
              '홈 링 안 막대병을 누르거나 ‘내 정보’ → ‘막대병 도감’으로 가요.',
              '열린 모습은 눌러서 바로 장착해요.',
              '잠긴 모습은 안내를 읽고 ‘광고 보고 받기’로 열 수 있어요 (선택 사항).',
            ],
          },
          {
            title: '알아두면 좋아요',
            body: '한 번 연 모습은 계속 내 것이에요. 백업 파일에도 함께 담겨요.',
          },
        ],
      };

    case 'theme':
      return {
        title: '테마',
        icon: 'color-palette-outline',
        summary: '앱 전체 색과 밝기를 바꿔요. 위젯 색도 함께 바뀌어요.',
        route: { name: 'theme' },
        sections: [
          {
            title: '사용법',
            tips: [
              '밝기 — 시스템(폰 설정 따라감) · 라이트 · 다크',
              '테마 카드를 누르면 바로 적용돼요.',
              '자물쇠가 있는 테마는 복무 이정표에 도착하면 열려요.',
            ],
          },
        ],
      };

    case 'backup':
      return {
        title: '백업 · 복원',
        icon: 'cloud-upload-outline',
        summary: '폰을 바꾸기 전에 백업 파일을 만들어 두세요.',
        route: { name: 'settings' },
        sections: [
          {
            title: '백업하기',
            steps: [
              '‘내 정보’ → ‘백업 파일 만들기’.',
              '공유 창에서 카톡 ‘나와의 채팅’이나 드라이브에 보관해요.',
            ],
          },
          {
            title: '새 폰에서 복원',
            steps: [
              '앱을 설치하고 보관한 백업 파일을 폰에 받아 둬요.',
              '‘내 정보’ → ‘백업에서 복원’ → 파일을 골라요.',
            ],
          },
          {
            title: '주의',
            tips: [
              '복원하면 지금 기기의 데이터를 덮어써요.',
              '프로필 사진과 알림 설정은 백업에 들어가지 않아요.',
            ],
          },
        ],
      };

    case 'benefits':
      if (benefitsFor(pt).length === 0) return null;
      return {
        title: t.benefitsTitle,
        icon: 'gift-outline',
        summary: `복무 중 받을 수 있는 할인과 지원을 모았어요.`,
        route: { name: 'benefits' },
        sections: [
          {
            title: '보는 법',
            body: '위쪽 분류를 누르면 해당 묶음으로 바로 이동해요. 링크가 있는 항목은 눌러서 안내 페이지를 열 수 있어요. 제도는 바뀔 수 있으니 이용 전 해당 기관에 꼭 확인해 주세요.',
          },
        ],
      };

    default:
      return null;
  }
}

/** 주제 하나 — 이 신분에 해당하지 않으면 null */
export function guideTopic(id, personnelType) {
  const g = build(id, personnelType);
  return g ? { id, ...g } : null;
}

/** 이 신분에서 볼 수 있는 주제들 (GUIDE_ORDER 순) */
export function guideTopics(personnelType) {
  return GUIDE_ORDER.map((id) => guideTopic(id, personnelType)).filter(Boolean);
}
