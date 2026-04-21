# 아키텍처 & 데이터 흐름

---

## 1. 전체 구조 다이어그램

```
┌─────────────────────────────────────────────────┐
│                    App.js                        │
│  - ATT 권한 요청 (iOS)                           │
│  - MobileAds SDK 초기화                          │
│  - SafeAreaProvider 감싸기                       │
│  - NavigationContainer                           │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │  TabNavigator   │
         │ (Bottom Tabs)   │
         └──┬──┬──┬──┬──┬─┘
            │  │  │  │  │
         홈  전역 휴가 월급 할일
         Screen Screen Screen Screen Screen
            │
     ┌──────┼──────┐
     │      │      │
  Utils  Storage Components
(dateUtils) (AsyncStorage) (AdBanner 등)
```

---

## 2. 기술 스택 상세

### 2.1 React Navigation v6
- `@react-navigation/native`
- `@react-navigation/bottom-tabs`
- **SafeAreaProvider** : `react-native-safe-area-context`
- 탭 바 높이: `56 + insets.bottom` (기기별 홈 인디케이터 자동 대응)
- 인터스티셜 광고: 탭 전환 시 **10% 확률**로 표시 (400ms 딜레이)

### 2.2 상태 관리
- **전역 상태(Context/Redux) 없음** — 각 Screen이 `useState` + `useEffect` 로 AsyncStorage에서 독립적으로 로드
- 공유 데이터는 `@military_info` 키 하나를 여러 Screen이 각자 읽는 방식

### 2.3 AsyncStorage 키 목록

| 키 | 타입 | 용도 |
|----|------|------|
| `@military_info` | JSON Object | 군종, 입대일, 복무개월 |
| `@leave_records` | JSON Array | 연가 사용 기록 |
| `@leave_total` | String(Int) | 총 연가 일수 (기본 21) |
| `@leave_bonus` | JSON Array | 포상휴가 기록 |
| `@salary_info` | JSON Object | 커스텀 월급 정보 |
| `@todos` | JSON Array | 할 일 목록 |
| `@rank_promotions` | JSON Object | 진급일 (일병/상병/병장) |

### 2.4 광고 아키텍처

```
AdBanner.js
  ├── try { import BannerAd } catch → Expo Go 플레이스홀더
  └── 실 기기: 각 화면별 고유 AdUnit ID 사용

AdInterstitial.js
  ├── try { import InterstitialAd } catch → null (Expo Go)
  ├── 모듈 레벨에서 InterstitialAd.createForAdRequest() 한 번 생성
  ├── LOADED 이벤트 → 탭 전환 시 .show()
  └── CLOSED 이벤트 → 자동으로 다음 광고 preload
```

---

## 3. 앱 초기화 흐름 (App.js)

```
앱 시작
  │
  ├── (iOS only) requestTrackingPermissionsAsync()
  │     └── ATT 권한 창 표시
  │
  ├── MobileAdsModule.initialize()
  │     └── AdMob SDK 초기화
  │
  └── NavigationContainer 렌더링
        └── TabNavigator → 5개 화면
```

---

## 4. 화면별 데이터 로드 흐름

```
각 Screen onMount (useEffect)
  │
  ├── loadMilitaryInfo()
  │     ├── null  → SetupRequired 컴포넌트 표시 (홈 제외)
  │     └── 값 존재 → 화면 데이터 계산 및 표시
  │
  └── 각 화면 전용 데이터 로드
        HomeScreen     → leaveRecords, leaveBonusRecords, rankPromotions
        DischargeScreen → rankPromotions
        LeaveScreen    → leaveRecords, leaveTotal, leaveBonusRecords
        SalaryScreen   → salaryInfo, rankPromotions
        TodoScreen     → todos
```

---

## 5. 계급 계산 로직 우선순위

```
calcRankFromPromotions(rankPromotions)
  ├── rankPromotions 존재 → 저장된 진급일 기준으로 계급 반환
  │     병장 날짜 <= 오늘 → '병장'
  │     상병 날짜 <= 오늘 → '상병'
  │     일병 날짜 <= 오늘 → '일병'
  │     나머지 → '이병'
  │
  └── null 반환 → calcRank(servedDays) fallback
        30.44일 = 평균 1개월
        0~2개월 → 이병
        2~8개월 → 일병
        8~14개월 → 상병
        14개월+ → 병장
```

---

## 6. 색상 테마 (src/constants/colors.js)

| 상수명 | 색상 코드 | 용도 |
|--------|-----------|------|
| `primary` | `#2E5B4F` | 군사 초록 (메인 컬러) |
| `primaryDark` | `#1E3D35` | 진한 초록 |
| `primaryLight` | `#4A7A6B` | 연한 초록 |
| `accent` | `#F5A623` | 골드 (강조) |
| `background` | `#F0F4F3` | 배경 |
| `surface` | `#FFFFFF` | 카드 배경 |
| `text` | `#1A2E28` | 기본 텍스트 |
| `textSecondary` | `#5A7A72` | 보조 텍스트 |
| `border` | `#D0DDD9` | 테두리 |
| `danger` | `#E53935` | 오류/경고 |
| `success` | `#43A047` | 성공 |

---

## 7. 홈 화면 단계별 스타일 (phase)

| phase | 조건 | 주요 색상 효과 |
|-------|------|----------------|
| `done` | daysLeft <= 0 | 전역! 축하 효과 |
| `d3` | daysLeft <= 3 | 빨간 강조, FloatingParticles |
| `d7` | daysLeft <= 7 | 주황 강조, FloatingParticles |
| `d30` | daysLeft <= 30 | 노란 강조 |
| `d100` | daysLeft <= 100 | 연두 강조 |
| `normal` | 그 외 | 기본 군사 초록 |

---

## 8. 빌드 환경

### eas.json 프로파일

| 프로파일 | 목적 | 출력물 |
|----------|------|--------|
| `development` | 개발/디버깅 (dev client) | APK |
| `preview` | QA 테스트용 | APK |
| `production` | 스토어 제출 | AAB (App Bundle) |

- `appVersionSource: "remote"` → EAS 서버에서 versionCode 자동 증가
- `production` 프로파일만 autoIncrement 적용
