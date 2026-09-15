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

## 2. 전면 광고 (`src/utils/adManager.js` + `src/hooks/useShowInterstitial.js`)

### 역할
전면 광고 관리. 렌더링할 컴포넌트가 없다 — UI 는 AdMob SDK 가 그린다.

### 구조
인스턴스는 `adManager` 가 **앱 전체에서 하나만** 소유하고 리스너도 한 번만 등록한다.
예전에는 화면마다 `<AdInterstitial />` 을 렌더해서 같은 모듈 싱글톤에 리스너가
중복 등록되고, 인스턴스별 loadedRef 때문에 광고 없이 하루 한도만 소진됐다.

```js
// 화면에서는 훅만 쓴다
const { show: showAd } = useShowInterstitial();
// ... 저장/추가 등 주요 동작을 마친 뒤
showAd();
```

### 빈도 제한 (`adManager`)
- 하루 최대 2회, 최소 30분 간격
- 카운트는 `AdEventType.OPENED`(실제 노출) 후에만 차감한다
- 로드 전 호출은 한도를 쓰지 않고 건너뛴다
- ERROR 후에도 간격을 늘려가며 최대 3회 재시도
- `show()` 후 CLOSED 가 오지 않는 경우를 대비한 5분 안전장치

### 광고 ID
`getAdUnitId(unit, kind)` 를 반드시 거친다 — `__DEV__` 면 Google 테스트 ID.
개발 빌드에서 실제 광고를 띄우면 AdMob 이 무효 트래픽으로 보고 계정을 정지시킬 수 있다.


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
| `rankFromServedMonths(months)` | number | string | 복무 개월수 → 계급 (판정 단일 기준) |
| `calcRankByEnlistDate(enlistDate)` | string | string | 입대일 → 현재 계급 |
| `parseDate(value)` | string/Date | Date/null | 'YYYY-MM-DD' → 로컬 자정 (UTC 파싱 회피) |
| `calcPromotionDate(enlistDate, months)` | string, number | string/null | 진급일 (말일 클램프, -1일 없음) |
| `calcRankFromPromotions(promotionDates)` | Object | string/null | 진급일 기준 계급 |
| `nextPromotion(promotionDates)` | Object | `{rank,date,daysLeft}`/null | 다음 진급 D-Day (병장 완료 시 null) |
| `formatDate(date)` | Date | string | `'YYYY-MM-DD'` 포맷 |
| `formatDateKo(date)` | Date | string | `'YYYY년 MM월 DD일'` 포맷 |
| `isValidDateString(str)` | string | boolean | 날짜 문자열 유효성 검사 |
| `getMessageForPhase(phase)` | string | string | 복무 단계별 맞춤 응원 메시지 |
| `getRandomMessage()` | - | string | 랜덤 응원 메시지 (normal 풀에서 1개) |
