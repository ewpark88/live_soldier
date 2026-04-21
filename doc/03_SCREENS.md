# 화면(Screen) 상세 문서

---

## 1. HomeScreen (`src/screens/HomeScreen.js`)

### 역할
앱의 메인 화면. 전역까지 남은 D-Day, 복무 진행률, 현재 계급, 응원 메시지를 표시.

### 로드하는 데이터
```
militaryInfo    → loadMilitaryInfo()
leaveRecords    → loadLeaveRecords()
leaveTotal      → loadLeaveTotal()
leaveBonusRecords → loadLeaveBonusRecords()
rankPromotions  → loadRankPromotions(enlistDate)
```

### 주요 계산
```js
dischargeDate = calcDischargeDate(enlistDate, months)
daysLeft      = calcDaysLeft(dischargeDate)
progress      = calcProgress(enlistDate, dischargeDate)
servedDays    = calcServedDays(enlistDate)
rank          = calcRankFromPromotions(rankPromotions) ?? calcRank(servedDays)

// 휴가 집계
usedDays  = leaveRecords.reduce((s, r) => s + r.days, 0)
bonusDays = leaveBonusRecords.reduce((s, r) => s + r.days, 0)
remaining = leaveTotal + bonusDays - usedDays
```

### phase (단계별 스타일 변경)
| 조건 | phase 값 |
|------|----------|
| daysLeft <= 0 | `done` |
| daysLeft <= 3 | `d3` |
| daysLeft <= 7 | `d7` |
| daysLeft <= 30 | `d30` |
| daysLeft <= 100 | `d100` |
| 그 외 | `normal` |

### 특수 컴포넌트
- **FloatingParticles**: phase가 `done/d3/d7`일 때 별/하트 파티클 애니메이션 (Animated.Value)
- **MilestoneBanner**: 복무 25%, 50%, 75%, 100% 달성 시 축하 배너 (spring 애니메이션)
- **RANK_IMAGES**: `assets/ranks/` 폴더의 계급 이미지를 `require()`로 정적 로드

### 광고 배치
- 상단: `AD_UNITS.HOME_TOP` (BannerAd)
- 하단: `AD_UNITS.HOME_BOTTOM` (BannerAd)

---

## 2. DischargeScreen (`src/screens/DischargeScreen.js`)

### 역할
군종/입대일 설정, 전역일 확인, 계급 진급일 커스텀 설정.

### 상태(State)
```js
branch       // 군종: 'army' | 'navy' | 'airforce' | 'marines'
enlistDate   // 입대일 (YYYY-MM-DD)
months       // 복무개월수 (군종별 자동)
saved        // 저장 완료 여부 (저장 후 날짜 입력 비활성화)
promoOpen    // 진급일 섹션 열기/닫기
promotions   // { 일병, 상병, 병장 } 날짜 객체
```

### 군종별 복무 개월
| 군종 | months | 상수 key |
|------|--------|----------|
| 육군 | 18 | `army` |
| 해군 | 20 | `navy` |
| 공군 | 21 | `airforce` |
| 해병대 | 18 | `marines` |

### 저장 로직
```js
handleSave():
  1. isValidDateString(enlistDate) 검증
  2. saveMilitaryInfo({ branch, enlistDate, months })
  3. resetRankPromotions() → 기본 진급일로 초기화
  4. saved = true (DatePickerField 비활성화)

handleSavePromo():
  1. 일병 < 상병 < 병장 날짜 순서 검증
  2. saveRankPromotions(promotions)
```

### 진급일 수정
- `promoOpen` 토글로 섹션 열기/닫기
- 각 계급(일병/상병/병장)에 DatePickerField 제공
- **저장된 입대일 변경** 시 → `saved = false` + `resetRankPromotions()` 자동 호출

### DatePickerField disabled 동작
- `saved = true`이면 🔒 아이콘 표시, 탭해도 피커 안 열림
- 수정하려면 "수정" 버튼 → `saved = false`

### 광고 배치
- 중간: `AD_UNITS.DISCHARGE_MIDDLE`
- 하단: `AD_UNITS.DISCHARGE_BOTTOM`

---

## 3. LeaveScreen (`src/screens/LeaveScreen.js`)

### 역할
연가 / 포상휴가 기록 추가·삭제, 잔여 휴가 조회.

### 상태(State)
```js
militaryInfo      // null이면 SetupRequired 표시
leaveRecords      // 연가 기록 배열
leaveBonusRecords // 포상휴가 기록 배열
leaveTotal        // 총 연가 (기본 21일)
modal             // MODAL_NONE | MODAL_USE | MODAL_BONUS
form              // { date, days, memo }
```

### 모달 종류
| 상수 | 값 | 용도 |
|------|----|------|
| `MODAL_NONE` | `0` | 모달 닫힘 |
| `MODAL_USE` | `1` | 연가 추가 |
| `MODAL_BONUS` | `2` | 포상휴가 추가 |

### 휴가 집계 계산
```js
usedDays  = leaveRecords.reduce((s, r) => s + (r.days || 0), 0)
bonusDays = leaveBonusRecords.reduce((s, r) => s + (r.days || 0), 0)
totalDays = leaveTotal + bonusDays    // 총 사용 가능 일수
remaining = totalDays - usedDays      // 잔여 일수
```

### 연가 기록 구조
```json
{
  "id": "1713600000000",
  "date": "2025-04-20",
  "days": 3,
  "memo": "청원휴가"
}
```

### 포상휴가 기록 구조
```json
{
  "id": "1713600000001",
  "date": "2025-05-01",
  "days": 2,
  "memo": "우수병사"
}
```

### SetupRequired 조건
- `militaryInfo === null` (로딩 완료 후 데이터 없음)
- `militaryInfo === undefined` → 로딩 중 (아무것도 표시 안 함)

### 광고 배치
- 중간: `AD_UNITS.LEAVE_MIDDLE`
- 하단: `AD_UNITS.LEAVE_BOTTOM`

---

## 4. SalaryScreen (`src/screens/SalaryScreen.js`)

### 역할
현재 계급 기준 월급 안내, 커스텀 월급 입력, 표준 월급 참고표 제공.

### 상태(State)
```js
militaryInfo   // null이면 SetupRequired
salaryInfo     // 커스텀 월급 { rank, amount, memo }
rankPromotions // 진급일 데이터
guideOpen      // 표준 월급 참고표 토글
```

### 표준 월급 (SALARY_GUIDE)
| 계급 | 월급 | 적용 기간 |
|------|------|-----------|
| 이병 | 640,000원 | 복무 0~1개월 |
| 일병 | 800,000원 | 복무 2~7개월 |
| 상병 | 1,000,000원 | 복무 8~13개월 |
| 병장 | 1,250,000원 | 복무 14개월~ |

> **참고:** 2025년 기준 법정 최저 군인 봉급 기준. 매년 인상될 수 있음.

### 계급 결정 흐름
```
calcRankFromPromotions(rankPromotions) → 진급일 기준
  └── null이면 calcRank(servedDays) → 복무일수 기준
```

### 커스텀 월급 저장
```js
saveSalaryInfo({ rank, amount, memo })
```

### 표준으로 초기화
```js
handleResetToStandard():
  AsyncStorage에서 @salary_info 삭제
  salaryInfo = null
```

### 광고 배치
- 중간: `AD_UNITS.SALARY_MIDDLE`
- 하단: `AD_UNITS.SALARY_BOTTOM`

---

## 5. TodoScreen (`src/screens/TodoScreen.js`)

### 역할
군 생활 할 일 관리. 훈련 프리셋, 날짜 범위 지원.

### 상태(State)
```js
todos         // 할 일 배열
showPresets   // 프리셋 패널 열기/닫기
useRange      // 날짜 범위 모드 (시작일~종료일)
form          // { text, date, endDate }
```

### 할 일 데이터 구조
```json
{
  "id": "1713600000000",
  "text": "유격훈련",
  "date": "2025-06-10",
  "endDate": "2025-06-12",
  "done": false
}
```

### 12개 훈련 프리셋
| 프리셋 | 기본 기간 |
|--------|-----------|
| 혹한기 훈련 | 3일 |
| 유격 훈련 | 3일 |
| 화생방 훈련 | 1일 |
| 사격 훈련 | 1일 |
| 체력검정 | 1일 |
| 야간 훈련 | 1일 |
| 비상소집 | 1일 |
| 전술 훈련 | 2일 |
| 구급법 교육 | 1일 |
| 사이버 교육 | 1일 |
| 정신교육 | 1일 |
| 대테러 훈련 | 2일 |

### 날짜 범위 헬퍼
```js
// 날짜 범위 내 포함 여부
isInRange(todo): todo.endDate && today between todo.date~todo.endDate

// 범위 포맷
formatRange(date, endDate): '04월 10일 ~ 04월 12일'

// 기간 계산
calcDuration(date, endDate): '(3일간)'

// 날짜 + N일
addDays(dateStr, n): Date → 'YYYY-MM-DD'
```

### 완료/삭제
- 체크박스 탭 → `toggleTodo(id)` → `done` 토글
- 삭제 버튼 → `deleteTodo(id)` → 목록에서 제거

### 광고 배치
- 중간: `AD_UNITS.TODO_MIDDLE`
- 하단: `AD_UNITS.TODO_BOTTOM`
