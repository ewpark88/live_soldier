# AdMob 광고 설정 가이드

---

## 1. AdMob 계정 정보

| 항목 | 값 |
|------|-----|
| AdMob 앱 ID (Android) | `ca-app-pub-8353634332299342~7516567553` |
| 패키지명 | `com.jeonryeokkami.app` |
| 관리 계정 | jjho8364@gmail.com |

---

## 2. 광고 단위 ID 전체 목록

### 배너 광고 (Banner)

| 상수명 | 위치 | 실제 광고 단위 ID |
|--------|------|-----------------|
| `HOME_TOP` | 홈 화면 상단 | `ca-app-pub-8353634332299342/XXXXXXXXXX` |
| `HOME_BOTTOM` | 홈 화면 하단 | `ca-app-pub-8353634332299342/XXXXXXXXXX` |
| `DISCHARGE_MIDDLE` | 전역 화면 중간 | `ca-app-pub-8353634332299342/XXXXXXXXXX` |
| `DISCHARGE_BOTTOM` | 전역 화면 하단 | `ca-app-pub-8353634332299342/XXXXXXXXXX` |
| `LEAVE_MIDDLE` | 휴가 화면 중간 | `ca-app-pub-8353634332299342/XXXXXXXXXX` |
| `LEAVE_BOTTOM` | 휴가 화면 하단 | `ca-app-pub-8353634332299342/3622163389` |
| `SALARY_MIDDLE` | 월급 화면 중간 | `ca-app-pub-8353634332299342/XXXXXXXXXX` |
| `SALARY_BOTTOM` | 월급 화면 하단 | `ca-app-pub-8353634332299342/XXXXXXXXXX` |
| `TODO_MIDDLE` | 할일 화면 중간 | `ca-app-pub-8353634332299342/XXXXXXXXXX` |
| `TODO_BOTTOM` | 할일 화면 하단 | `ca-app-pub-8353634332299342/XXXXXXXXXX` |

### 전면 광고 (Interstitial)

| 상수명 | 위치 | 실제 광고 단위 ID |
|--------|------|-----------------|
| `INTERSTITIAL_TAB` | 탭 전환 시 | `ca-app-pub-8353634332299342/XXXXXXXXXX` |

> **참고:** 위 테이블에서 `XXXXXXXXXX`는 실제 ID로 `src/constants/adUnits.js` 파일을 직접 확인하세요.

---

## 3. adUnits.js 구조

```js
// src/constants/adUnits.js
export const AD_UNITS = {
  HOME_TOP: {
    testId: 'ca-app-pub-3940256099942544/6300978111',  // Google 공식 테스트 ID
    realId: 'ca-app-pub-8353634332299342/XXXXXXXXXX',  // 실제 ID
  },
  // ... 나머지 단위들
};
```

### 광고 ID 선택 로직 (AdBanner.js 내부)
```js
const adUnitId = __DEV__ ? unit.testId : unit.realId;
```
- 개발 모드(`__DEV__ = true`): 테스트 ID 사용 → 실수로 실제 광고 클릭 걱정 없음
- 프로덕션 빌드(`__DEV__ = false`): 실제 ID 사용

---

## 4. app.json 광고 설정

```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-8353634332299342~7516567553",
          "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
        }
      ]
    ]
  }
}
```

---

## 5. iOS ATT (App Tracking Transparency) 설정

`app.json`에 포함:
```json
{
  "ios": {
    "infoPlist": {
      "NSUserTrackingUsageDescription": "맞춤형 광고 제공을 위해 기기 광고 식별자를 사용합니다."
    },
    "SKAdNetworkItems": [
      { "SKAdNetworkIdentifier": "cstr6suwn9.skadnetwork" },
      { "SKAdNetworkIdentifier": "4fzdc2evr5.skadnetwork" }
      // ... 구글 제공 SKAdNetwork 목록
    ]
  }
}
```

`App.js` 초기화:
```js
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';

if (Platform.OS === 'ios') {
  const { status } = await requestTrackingPermissionsAsync();
  // status: 'authorized' | 'denied' | 'restricted' | 'unavailable'
}
```

---

## 6. 구글 애드몹 정책 준수 사항

### 광고 배치 규칙
1. **각 화면마다 고유한 광고 단위 ID** 사용 (동일 ID 여러 위치 금지)
2. **광고 레이블** : 모든 배너에 "광고" 텍스트 또는 AdChoices 아이콘 표시 (SDK 자동 처리)
3. **클릭 유도 금지** : 광고 옆에 "여기를 누르세요" 같은 문구 불가
4. **전면 광고** : 자연스러운 전환점(탭 전환)에서만 표시, 앱 로드 직후 표시 금지
5. **닫기 버튼** : 전면 광고는 항상 닫기 버튼 접근 가능 (SDK 자동 처리)
6. **탭 바 근처 광고** : 탭 바와 배너 광고 사이에 충분한 여백 필요 (실수 클릭 방지)

### 전면 광고 빈도 설정
```js
// TabNavigator.js
if (Math.random() < 0.1) {   // 10% 확률
  setTimeout(() => showInterstitialAd(), 400);  // 400ms 딜레이 후 표시
}
```
- 너무 자주 표시하면 정책 위반 및 사용자 이탈 원인
- 현재 10% 확률 = 탭 10번 중 평균 1번 표시

---

## 7. 새 광고 단위 추가 방법

1. [AdMob 콘솔](https://apps.admob.com) → 앱 선택 → 광고 단위 → 새 광고 단위 만들기
2. 광고 형식 선택: 배너 / 전면
3. 생성된 ID를 `src/constants/adUnits.js`에 추가:
   ```js
   NEW_SCREEN_BANNER: {
     testId: 'ca-app-pub-3940256099942544/6300978111',
     realId: 'ca-app-pub-8353634332299342/새ID',
   },
   ```
4. 해당 화면에서 `<AdBanner unit={AD_UNITS.NEW_SCREEN_BANNER} />` 추가

---

## 8. 광고 테스트 방법

```bash
# Expo Go에서는 광고 표시 안 됨 (플레이스홀더만)
npx expo start

# 실제 광고 테스트는 Dev Build 필요
eas build --platform android --profile development
# → APK 설치 후: npx expo start --dev-client
```

> Dev Build에서 `__DEV__ = true`이므로 테스트 광고 ID가 사용됨.  
> 테스트 광고는 클릭해도 수익이 발생하지 않으므로 자유롭게 테스트 가능.
