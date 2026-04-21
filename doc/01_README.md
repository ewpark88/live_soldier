# 전역까지 (Live Soldier) — 프로젝트 개요 및 빠른 시작 가이드

> 다른 PC / 환경에서 작업을 이어받을 때 이 파일부터 읽으세요.

---

## 1. 앱 소개

| 항목 | 내용 |
|------|------|
| 앱 이름 | 전역까지 |
| 플랫폼 | Android (iOS 코드 포함, 미출시) |
| 패키지명 | `com.jeonryeokkami.app` |
| iOS 번들 ID | `com.jeonryeokkami.app` |
| 개발자 이메일 | jjho8364@gmail.com |
| GitHub | https://github.com/ewpark88/live_soldier |
| EAS 프로젝트 ID | `3a3a8b40-0f20-4ad5-b7a7-0635c8888388` |

### 주요 기능
- **전역 D-Day 카운트다운** — 입대일·군종 입력으로 전역일 자동 계산
- **휴가 관리** — 연가/포상휴가 사용·잔여 추적
- **월급 조회** — 계급별 표준 월급 안내 및 커스텀 입력
- **할 일 관리** — 군 훈련 프리셋 포함 Todo 리스트
- **계급 진급일 관리** — 표준 또는 커스텀 진급일 입력

---

## 2. 기술 스택

| 구분 | 버전 / 도구 |
|------|-------------|
| React Native | 0.81.5 |
| React | 19.1.0 |
| Expo SDK | ~54.0.0 |
| 내비게이션 | React Navigation v6 (Bottom Tabs) |
| 로컬 저장소 | @react-native-async-storage/async-storage |
| 광고 | react-native-google-mobile-ads ^15.0.0 |
| 날짜 선택 | @react-native-community/datetimepicker ^8.3.0 |
| iOS ATT | expo-tracking-transparency ~4.0.2 |
| 빌드 | EAS Build (cloud) |

---

## 3. 로컬 개발 환경 세팅 (새 PC)

### 3.1 필수 소프트웨어 설치

```bash
# 1) Node.js (LTS) — https://nodejs.org
node --version   # v20.x 이상 권장

# 2) Git — https://git-scm.com

# 3) Expo CLI
npm install -g expo-cli

# 4) EAS CLI (배포용)
npm install -g eas-cli
```

### 3.2 소스 코드 내려받기

```bash
git clone https://github.com/ewpark88/live_soldier.git
cd live_soldier
npm install
```

> **PowerShell 스크립트 오류가 날 경우**
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

### 3.3 Expo Go로 빠른 테스트 (권장)

```bash
npx expo start
```

1. 스마트폰에 **Expo Go** 앱 설치 (Android / iOS)
2. 터미널에 나타난 QR 코드 스캔
3. Expo Go 내에서 앱 실행

> **주의:** `react-native-google-mobile-ads`는 네이티브 모듈이라 Expo Go에서 실행되지 않습니다.  
> 광고 관련 코드는 try/catch로 감싸져 있어 **Expo Go에서도 앱 자체는 정상 동작**합니다 (광고만 플레이스홀더로 표시).

### 3.4 실제 광고가 포함된 개발 빌드 실행

```bash
# 최초 한 번만 — EAS 로그인
eas login   # jjho8364@gmail.com

# Development Build 생성 (APK, 사이드로드)
eas build --platform android --profile development

# 빌드 완료 후 APK를 폰에 설치, 터미널에서:
npx expo start --dev-client
```

---

## 4. 프로젝트 폴더 구조

```
live_soldier/
├── App.js                      # 앱 진입점 (ATT 초기화, MobileAds SDK 초기화)
├── app.json                    # Expo 설정 (패키지명, AdMob 앱 ID, 권한, 플러그인)
├── eas.json                    # EAS 빌드 프로파일 설정
├── package.json
├── generate-icon.js            # 앱 아이콘 자동 생성 스크립트 (sharp 사용)
├── assets/
│   ├── icon.png                # 앱 아이콘 (1024×1024)
│   ├── adaptive-icon.png       # Android 적응형 아이콘 (1024×1024, 배경 없음)
│   ├── splash.png              # 스플래시 화면
│   └── ranks/                  # 계급 이미지 (이병/일병/상병/병장.png)
├── src/
│   ├── constants/
│   │   ├── colors.js           # 색상 테마
│   │   └── adUnits.js          # AdMob 광고 단위 ID 목록
│   ├── navigation/
│   │   └── TabNavigator.js     # 하단 탭 내비게이터
│   ├── screens/
│   │   ├── HomeScreen.js       # 홈 (D-Day, 진행률, 계급)
│   │   ├── DischargeScreen.js  # 전역 설정 (군종, 입대일, 진급일)
│   │   ├── LeaveScreen.js      # 휴가 관리
│   │   ├── SalaryScreen.js     # 월급 조회
│   │   └── TodoScreen.js       # 할 일 관리
│   ├── components/
│   │   ├── AdBanner.js         # 배너 광고 컴포넌트
│   │   ├── AdInterstitial.js   # 전면 광고 컴포넌트
│   │   ├── Card.js             # 공통 카드 UI
│   │   ├── DatePickerField.js  # 날짜 선택 필드 (네이티브 피커)
│   │   ├── ProgressBar.js      # 진행률 바
│   │   └── SetupRequired.js    # 군 정보 미설정 안내 화면
│   └── utils/
│       ├── dateUtils.js        # 날짜 계산 유틸리티
│       └── storage.js          # AsyncStorage CRUD 헬퍼
└── doc/                        # ← 이 문서들이 있는 폴더
    ├── 01_README.md
    ├── 02_ARCHITECTURE.md
    ├── 03_SCREENS.md
    ├── 04_COMPONENTS.md
    ├── 05_STORAGE.md
    ├── 06_ADS.md
    └── 07_DEPLOY.md
```

---

## 5. 환경별 실행 방법 요약

| 목적 | 명령어 |
|------|--------|
| Expo Go 테스트 | `npx expo start` |
| Android 에뮬레이터 실행 | `npx expo run:android` |
| iOS 시뮬레이터 실행 | `npx expo run:ios` |
| APK 빌드 (preview) | `eas build --platform android --profile preview` |
| AAB 빌드 (production) | `eas build --platform android --profile production` |
| 아이콘 재생성 | `npm run icon` |

---

## 6. 자주 발생하는 오류 & 해결책

| 오류 | 원인 | 해결 |
|------|------|------|
| `TurboModuleRegistry ... 'RNGoogleMobileAdsModule'` | Expo Go에서 네이티브 모듈 불가 | Expo Go는 광고 없이 정상 동작, 실 기기 테스트는 dev build 사용 |
| `npm : 스크립트를 실행할 수 없으므로` | PowerShell 실행 정책 제한 | `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| `Project is incompatible with this version of Expo Go` | SDK 버전 불일치 | 폰의 Expo Go 앱 업데이트 or `npx expo install --fix` |
| `ERESOLVE unable to resolve dependency tree` | peer dependency 충돌 | `npm install --legacy-peer-deps` |
| `node:sea mkdir` 오류 (Windows) | Expo 50/51 Windows 버그 | 이미 Expo 54로 해결됨 |

---

## 7. 다른 문서 안내

| 파일 | 내용 |
|------|------|
| `02_ARCHITECTURE.md` | 전체 아키텍처, 데이터 흐름, 상태 관리 |
| `03_SCREENS.md` | 각 화면 상세 스펙 및 로직 |
| `04_COMPONENTS.md` | 공통 컴포넌트 Props/사용법 |
| `05_STORAGE.md` | AsyncStorage 스키마 전체 |
| `06_ADS.md` | AdMob 광고 단위 ID 및 정책 |
| `07_DEPLOY.md` | EAS Build / Google Play 배포 가이드 |
