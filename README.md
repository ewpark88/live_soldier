# 전역까지 - 군생활 관리 앱

React Native (Expo) 기반 군 복무 관리 앱입니다.

## 폴더 구조

```
전역까지/
├── App.js                          # 앱 진입점
├── app.json                        # Expo 설정
├── babel.config.js
├── package.json
├── assets/                         # 이미지/아이콘 리소스
└── src/
    ├── constants/
    │   └── colors.js               # 컬러 테마
    ├── navigation/
    │   └── TabNavigator.js         # 하단 탭 네비게이션
    ├── screens/
    │   ├── HomeScreen.js           # 홈 (D-Day, 진행률, 응원 메시지)
    │   ├── DischargeScreen.js      # 전역일 계산
    │   ├── LeaveScreen.js          # 휴가 관리
    │   ├── SalaryScreen.js         # 급여 계산
    │   └── TodoScreen.js           # 일정 (ToDo)
    ├── components/
    │   ├── Card.js                 # 카드 컴포넌트
    │   ├── ProgressBar.js          # 진행률 바
    │   ├── AdBanner.js             # 배너 광고 플레이스홀더
    │   └── ErrorBoundary.js        # (해당 없음 — 현재 구조는 doc/01_README.md 참고)
    └── utils/
        ├── dateUtils.js            # 날짜 계산 유틸리티
        └── storage.js              # AsyncStorage CRUD 유틸리티
```

## 실행 방법

### 1. 사전 준비

- Node.js 18 이상
- Expo CLI

```bash
npm install -g expo-cli
```

### 2. 패키지 설치

```bash
cd 전역까지
npm install
```

### 3. 앱 실행

```bash
# 개발 서버 시작
npx expo start

# Android 에뮬레이터
npx expo start --android

# iOS 시뮬레이터 (Mac 전용)
npx expo start --ios
```

### 4. 실기기 테스트

1. 핸드폰에 **Expo Go** 앱 설치
2. `npx expo start` 실행
3. QR코드를 Expo Go로 스캔

---

## 기능 설명

### 홈 화면
- 전역 D-Day 대형 표시
- 복무 진행률 애니메이션 바
- 랜덤 응원 메시지 (탭하여 새 메시지)
- 남은 휴가 / 복무 일수 요약 카드
- 하단 배너 광고 영역

### 전역일 계산
- 입대일 입력 (YYYY-MM-DD)
- 군별 선택: 육군(18개월) / 해군(20개월) / 공군(21개월)
- 자동 전역일 계산
- 현재 계급 표시
- AsyncStorage 저장

### 휴가 관리
- 총 휴가 일수 설정 (기본: 군종별 — 육군·해병대 24 / 해군 27 / 공군 28일)
- 휴가 기록 추가 (날짜, 일수, 메모)
- 사용/잔여 휴가 자동 계산
- 리스트 중간 광고 플레이스홀더

### 급여 계산
- 2026년 기준 계급별 월급 참고표 (`src/constants/salaryGuide.js`, SALARY_YEAR)
- 직접 월급 입력 가능
- 총 수령 예정액 / 현재까지 수령액 계산

### 일정 관리
- 할 일 추가 (제목, 날짜, 메모)
- 체크박스로 완료 처리
- 날짜별 그룹 표시
- 오늘 일정 최상단 표시

---

## 광고 연동 방법 (실제 배포 시)

현재 광고는 플레이스홀더로 구현되어 있습니다.
실제 배포 시 **Google AdMob** 연동:

```bash
npx expo install expo-ads-admob
# 또는
npx expo install react-native-google-mobile-ads
```

AdMob 은 이미 연동돼 있습니다. 광고 단위는 `src/constants/adUnits.js`,
전면광고 인스턴스와 빈도 제한은 `src/utils/adManager.js` 가 관리합니다.
개발 빌드(`__DEV__`)에서는 Google 테스트 광고 ID 가 자동으로 쓰입니다.

---

## 로컬 데이터 저장 키

| 키 | 내용 |
|---|---|
| `@military_info` | 입대일, 군별, 전역일 |
| `@leave_records` | 휴가 사용 기록 배열 |
| `@leave_total` | 총 휴가 일수 |
| `@salary_info` | 월급, 복무개월 설정 |
| `@todos` | 할 일 목록 배열 |
