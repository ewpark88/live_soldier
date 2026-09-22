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
| `INTERSTITIAL_TAB` | **주요 저장 직후** (이름만 TAB, 탭 전환에는 쓰지 않는다) | `ca-app-pub-8353634332299342/XXXXXXXXXX` |

> `HOME_TOP` 은 v1.2 에서 **쓰지 않는다.** 홈 본문 인라인 배너를 걷어냈다 —
> 한 화면에 배너가 둘이면 콘텐츠보다 광고가 먼저 읽힌다. 상수는 AdMob 콘솔과
> 어긋나지 않도록 남겨둔다.

> **참고:** 위 테이블에서 `XXXXXXXXXX`는 실제 ID로 `src/constants/adUnits.js` 파일을 직접 확인하세요.

---

## 3. adUnits.js 구조

```js
// src/constants/adUnits.js
export const AD_UNITS = {
  HOME_BOTTOM: { id: 'home_bottom', label: '홈 하단', realId: 'ca-app-pub-...' },
  // ... 나머지 단위들
};
```

### 광고 ID 선택 로직 — `getAdUnitId(unit, kind)` 하나를 반드시 거친다
```js
export function getAdUnitId(unit, kind = 'banner') {
  if (!unit || !unit.realId) return null;
  if (!__DEV__) return unit.realId;
  return kind === 'interstitial' ? TEST_INTERSTITIAL : TEST_BANNER;
}
```
- 개발 빌드(`__DEV__ = true`)에서는 **실제 ID 가 절대 나가지 않는다.**
  개발 중 실제 광고를 띄우면 AdMob 이 무효 트래픽으로 보고 계정을 정지시킨다.
- 호출부는 셋뿐이다: `AdBanner.js`, `AdFooter.js`, `adManager.js`.
- 단위 객체에 `testId` 필드는 없다 (테스트 ID 는 이 함수가 갖는다).

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
0. **배너는 화면당 하나, 푸터에만.** `<Screen ad={AD_UNITS.X}>` 가 유일한 배선이다
   (`Screen.js` → `AdFooter` → `AdBanner`). 본문에 배너를 직접 넣지 않는다.
1. **각 화면마다 고유한 광고 단위 ID** 사용 (동일 ID 여러 위치 금지)
2. **광고 레이블** : 모든 배너에 "광고" 텍스트 또는 AdChoices 아이콘 표시 (SDK 자동 처리)
3. **클릭 유도 금지** : 광고 옆에 "여기를 누르세요" 같은 문구 불가
4. **전면 광고** : 자연스러운 전환점(탭 전환)에서만 표시, 앱 로드 직후 표시 금지
5. **닫기 버튼** : 전면 광고는 항상 닫기 버튼 접근 가능 (SDK 자동 처리)
6. **탭 바 근처 광고** : 탭 바와 배너 광고 사이에 충분한 여백 필요 (실수 클릭 방지)

### 전면 광고는 '주요 저장' 에서만 뜬다 (v1.2)
앱 실행이나 탭 전환에서는 **뜨지 않는다.** v1.1 까지는 홈이 포커스되고 6초 뒤
자동 노출이 있었는데, 홈이 첫 탭이라 사실상 "앱을 켜면 광고"였다.

노출 지점은 네 곳뿐이다:

| 화면 | 핸들러 |
|---|---|
| `DischargeScreen` | `handleSave` (입대·전역 정보 저장) |
| `LeaveScreen` | `handleAddUse` / `handleAddBonus` (휴가 기록 추가) |
| `TodoScreen` | `handleAdd` (할 일 추가) |
| `SalaryScreen` | `handleSave` (급여 정보 저장) |

토글·테마 변경·기본값 저장 같은 가벼운 동작에는 붙이지 않는다.

빈도 제한은 `src/utils/adManager.js` 가 강제한다 (화면별 오버라이드 없음):
```js
const MAX_PER_DAY  = 2;               // 하루 최대 2회
const MIN_INTERVAL = 30 * 60 * 1000;  // 최소 30분 간격
```
- 카운트는 `AdEventType.OPENED`(실제 노출) 후에만 차감한다.
- 로드 전 호출은 한도를 쓰지 않고 그냥 건너뛴다.
- 홈에서도 `useShowInterstitial()` 을 호출하는데, 노출이 아니라 **프리로드**
  목적이다 (홈이 첫 화면이라 여기서 미리 받아두면 저장 시점 성공률이 오른다).

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
