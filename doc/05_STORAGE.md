# AsyncStorage 스키마 & Storage 유틸리티

---

## 1. 저장 키 전체 목록

| 키 상수 | 실제 키 문자열 | 데이터 타입 | 설명 |
|---------|---------------|-------------|------|
| `MILITARY_INFO` | `@military_info` | JSON Object | 군종, 입대일, 복무개월 |
| `LEAVE_RECORDS` | `@leave_records` | JSON Array | 연가 사용 기록 |
| `LEAVE_TOTAL` | `@leave_total` | String(숫자) | 총 연가 일수 |
| `LEAVE_BONUS` | `@leave_bonus` | JSON Array | 포상휴가 기록 |
| `SALARY_INFO` | `@salary_info` | JSON Object | 커스텀 월급 정보 |
| `TODOS` | `@todos` | JSON Array | 할 일 목록 |
| `RANK_PROMOTIONS` | `@rank_promotions` | JSON Object | 커스텀 진급일 |

---

## 2. 데이터 구조 상세

### 2.1 @military_info
```json
{
  "branch": "army",
  "enlistDate": "2024-01-15",
  "months": 18
}
```
| 필드 | 타입 | 값 |
|------|------|-----|
| `branch` | string | `"army"` \| `"navy"` \| `"airforce"` \| `"marines"` |
| `enlistDate` | string | `"YYYY-MM-DD"` 형식 |
| `months` | number | 육군 18, 해군 20, 공군 21, 해병 18 |

---

### 2.2 @leave_records (연가)
```json
[
  {
    "id": "1713600000000",
    "date": "2025-04-20",
    "days": 3,
    "memo": "청원휴가"
  }
]
```
| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | `Date.now().toString()` |
| `date` | string | `"YYYY-MM-DD"` |
| `days` | number | 사용 일수 |
| `memo` | string | 메모 (선택) |

---

### 2.3 @leave_total
- 타입: 문자열 (숫자)
- 기본값: `21` (일)
- 예시: `"25"` (사용자가 변경 가능)

---

### 2.4 @leave_bonus (포상휴가)
```json
[
  {
    "id": "1713600000001",
    "date": "2025-05-01",
    "days": 2,
    "memo": "우수병사 선발"
  }
]
```
연가 기록과 동일한 구조.

---

### 2.5 @salary_info
```json
{
  "rank": "상병",
  "amount": 1000000,
  "memo": "2025년 기준"
}
```
| 필드 | 타입 | 설명 |
|------|------|------|
| `rank` | string | 계급 (이병/일병/상병/병장) |
| `amount` | number | 월급 (원) |
| `memo` | string | 메모 (선택) |

> `null`이면 표준 월급표를 보여줌.

---

### 2.6 @todos
```json
[
  {
    "id": "1713600000000",
    "text": "유격훈련",
    "date": "2025-06-10",
    "endDate": "2025-06-12",
    "done": false
  }
]
```
| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string | `Date.now().toString()` |
| `text` | string | 할 일 내용 |
| `date` | string | 시작일 `"YYYY-MM-DD"` |
| `endDate` | string \| undefined | 종료일 (범위 모드일 때) |
| `done` | boolean | 완료 여부 |

---

### 2.7 @rank_promotions
```json
{
  "일병": "2024-03-15",
  "상병": "2024-09-15",
  "병장": "2025-03-15"
}
```
- 기본값: `calcDefaultPromotions(enlistDate)` — 입대일 +2/+8/+14 개월
- 사용자가 DischargeScreen에서 커스텀 가능
- 입대일 변경 시 자동 초기화 (`resetRankPromotions()`)

---

## 3. storage.js 함수 레퍼런스

### 군 정보
```js
saveMilitaryInfo(info)    // 저장
loadMilitaryInfo()        // 로드 (없으면 null)
```

### 연가
```js
saveLeaveRecords(records)     // 전체 저장
loadLeaveRecords()            // 로드 (없으면 [])
addLeaveRecord(record)        // 추가 (id 자동 생성)
deleteLeaveRecord(id)         // 삭제

saveLeaveTotal(total)         // 총 연가 일수 저장
loadLeaveTotal()              // 로드 (없으면 21)
```

### 포상휴가
```js
loadLeaveBonusRecords()       // 로드 (없으면 [])
saveLeaveBonusRecords(records)
addLeaveBonusRecord(record)   // 추가 (id 자동 생성)
deleteLeaveBonusRecord(id)    // 삭제
```

### 월급
```js
saveSalaryInfo(info)    // 저장
loadSalaryInfo()        // 로드 (없으면 null)
```

### 할 일
```js
saveTodos(todos)
loadTodos()             // 없으면 []
addTodo(todo)           // id, done: false 자동 추가
toggleTodo(id)          // done 토글
deleteTodo(id)
```

### 진급일
```js
calcDefaultPromotions(enlistDate)    // 표준 진급일 계산 (저장 안 함)
loadRankPromotions(enlistDate)       // 저장된 값 or 기본값 반환
saveRankPromotions(promotions)
resetRankPromotions()                // @rank_promotions 키 삭제
```

---

## 4. 데이터 초기화 방법

개발 중 전체 초기화가 필요할 경우:

```js
import AsyncStorage from '@react-native-async-storage/async-storage';

// 전체 삭제 (개발용)
await AsyncStorage.clear();

// 특정 키만 삭제
await AsyncStorage.removeItem('@military_info');
await AsyncStorage.removeItem('@rank_promotions');
```

또는 앱을 삭제 후 재설치하면 모든 데이터가 초기화됩니다.

---

## 5. 데이터 마이그레이션 고려사항

향후 데이터 구조 변경 시:
1. `loadXxx()` 함수에서 로드 후 구버전 포맷 감지
2. 새 포맷으로 변환 후 `saveXxx()`로 덮어쓰기
3. 마이그레이션 완료 플래그를 별도 키로 저장 (`@migration_v2` 등)
