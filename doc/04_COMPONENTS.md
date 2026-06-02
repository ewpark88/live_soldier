# 공통 컴포넌트 문서

---

## 1. AdBanner (`src/components/AdBanner.js`)

### 역할
AdMob 배너 광고를 표시. Expo Go에서는 플레이스홀더 View를 표시.

### Props
| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `unit` | Object | ✅ | `AD_UNITS.XXX` 객체 (realId 포함) |
| `style` | StyleObject | ❌ | 추가 스타일 |

### AD_UNITS 객체 구조
```js
{
  testId: 'ca-app-pub-3940256099942544/6300978111',  // 테스트 ID
  realId: 'ca-app-pub-8353634332299342/XXXXXXXXXX',  // 실제 ID
}
```
> 배포 빌드(`__DEV__ === false`)에서는 realId를 사용.

### 동작 원리
```js
// try/catch로 Expo Go 호환
try {
  const { BannerAd, BannerAdSize, TestIds } = 
    require('react-native-google-mobile-ads');
  // → 실제 배너 광고 렌더링
} catch {
  // → 회색 플레이스홀더 View 렌더링
}
```

### 사용 예시
```jsx
import AdBanner from '../components/AdBanner';
import { AD_UNITS } from '../constants/adUnits';

<AdBanner unit={AD_UNITS.HOME_TOP} />
<AdBanner unit={AD_UNITS.LEAVE_BOTTOM} style={{ marginTop: 8 }} />
```

---

## 2. AdInterstitial (`src/components/AdInterstitial.js`)

### 역할
전면 광고(Interstitial) 관리. JSX 없음 (UI는 AdMob SDK가 처리).

### 동작 방식
```js
// 모듈 레벨에서 단 한 번 생성
const interstitial = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL_TAB.realId);

// 이벤트 리스너
LOADED  → adLoaded = true
CLOSED  → adLoaded = false, 자동으로 interstitial.load() 호출
ERROR   → adLoaded = false
```

### 전역 함수 export
```js
export function showInterstitialAd() {
  if (adLoaded) interstitial.show();
}
```

### TabNavigator에서 사용
```js
// 탭 전환 시 10% 확률로 광고 표시
if (Math.random() < 0.1) {
  setTimeout(() => showInterstitialAd(), 400);
}
```

### 주의 사항
- Expo Go에서는 try/catch로 전체 무시됨 (`showInterstitialAd()` 호출해도 아무 일 없음)
- `<AdInterstitial />` 을 App.js 또는 TabNavigator 안에 반드시 렌더링해야 이벤트 리스너가 등록됨

---

## 3. Card (`src/components/Card.js`)

### 역할
일관된 카드 스타일의 컨테이너 컴포넌트.

### Props
| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `children` | ReactNode | - | 카드 내부 콘텐츠 |
| `style` | StyleObject | `{}` | 추가 스타일 |

### 기본 스타일
```js
{
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 16,
  marginVertical: 8,
  elevation: 4,          // Android 그림자
  shadowColor: '#000',   // iOS 그림자
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
}
```

### 사용 예시
```jsx
import Card from '../components/Card';

<Card style={{ marginHorizontal: 16 }}>
  <Text>카드 내용</Text>
</Card>
```

---

## 4. DatePickerField (`src/components/DatePickerField.js`)

### 역할
네이티브 날짜 선택기를 감싼 입력 필드.
- Android: 캘린더 다이얼로그 (`display="calendar"`)
- iOS: 모달 내 스피너 (`display="spinner"`)

### Props
| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `label` | string | ✅ | 필드 레이블 |
| `value` | string | ✅ | `'YYYY-MM-DD'` 형식 현재 값 |
| `onChange` | function | ✅ | `(dateString) => void` 콜백 |
| `disabled` | boolean | ❌ | `true`이면 🔒 표시, 탭 비활성 |
| `placeholder` | string | ❌ | 값 없을 때 표시 문자열 |

### 내부 동작
```
사용자 탭
  ├── disabled = true → 아무 동작 없음
  └── disabled = false
        ├── Android → DateTimePicker 직접 표시 (모달 없음)
        └── iOS → 커스텀 Modal 열기
                   ├── 취소 → 변경 없이 닫기
                   └── 완료 → onChange(YYYY-MM-DD) 호출
```

### 사용 예시
```jsx
<DatePickerField
  label="입대일"
  value={enlistDate}
  onChange={(date) => setEnlistDate(date)}
  disabled={saved}
  placeholder="날짜를 선택하세요"
/>
```

---

## 5. ProgressBar (`src/components/ProgressBar.js`)

### 역할
복무 진행률을 시각적으로 표시하는 애니메이션 바.

### Props
| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `progress` | number | `0` | 0~100 진행률 |
| `trackColor` | string | `'#D0DDD9'` | 배경 트랙 색상 |
| `fillColor` | string | `'#2E5B4F'` | 채워지는 색상 |
| `labelColor` | string | `'#FFFFFF'` | 퍼센트 텍스트 색상 |
| `style` | StyleObject | `{}` | 추가 스타일 |

### 애니메이션
```js
Animated.timing(animValue, {
  toValue: progress,
  duration: 800,
  useNativeDriver: false,  // width 애니메이션은 JS 드라이버 사용
})
```

### 사용 예시
```jsx
<ProgressBar
  progress={calcProgress(enlistDate, dischargeDate)}
  fillColor={COLORS.accent}
  trackColor={COLORS.border}
/>
```

---

## 6. SetupRequired (`src/components/SetupRequired.js`)

### 역할
군 정보(입대일 등)가 설정되지 않았을 때 표시하는 안내 컴포넌트.

### 표시 조건
```js
militaryInfo === null  // 로딩 완료 후 데이터 없음
```

> `undefined`는 아직 로딩 중을 의미하므로 SetupRequired를 표시하지 않음.

### 동작
- "전역 정보 설정하기" 버튼 탭 → `navigation.navigate('Discharge')`

### 사용 예시
```jsx
// LeaveScreen, SalaryScreen, TodoScreen에서 공통 사용
if (militaryInfo === null) {
  return <SetupRequired navigation={navigation} />;
}
```

---

## 7. dateUtils.js 주요 함수

| 함수 | 인자 | 반환 | 설명 |
|------|------|------|------|
| `calcDischargeDate(enlistDate, months)` | string, number | Date | 입대일 + 복무개월 - 1일 → 전역일(만료일) |
| `calcDaysLeft(targetDate)` | Date/string | number | 오늘 기준 남은 일수 (음수 가능) |
| `calcProgress(enlistDate, dischargeDate)` | string, Date | number 0~100 | 복무 진행률 |
| `calcServedDays(enlistDate)` | string | number | 복무한 일수 |
| `calcServedMonths(enlistDate)` | string | number | 복무한 개월수 |
| `calcRank(servedDays)` | number | string | 복무일 기준 계급 |
| `calcRankFromPromotions(promotionDates)` | Object | string/null | 진급일 기준 계급 |
| `nextPromotion(promotionDates)` | Object | `{rank,date,daysLeft}`/null | 다음 진급 D-Day (병장 완료 시 null) |
| `formatDate(date)` | Date | string | `'YYYY-MM-DD'` 포맷 |
| `formatDateKo(date)` | Date | string | `'YYYY년 MM월 DD일'` 포맷 |
| `isValidDateString(str)` | string | boolean | 날짜 문자열 유효성 검사 |
| `getMessageForPhase(phase)` | string | string | 복무 단계별 맞춤 응원 메시지 |
| `getRandomMessage()` | - | string | 랜덤 응원 메시지 (normal 풀에서 1개) |
