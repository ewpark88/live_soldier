# AsyncStorage 스키마 & Storage 유틸리티

> ⚠️ **현행 스키마는 아래 §0 이다.** §1 이하는 v1.0.x 단일 프로필 시절 키로,
> 지금은 최초 1회 마이그레이션(`storage._migrateLegacy`)에서만 읽힌다.

---

## 0. 현행 스키마 (v1.3)

| 키 | 범위 | 내용 |
|---|---|---|
| `@profiles_v1` | 프로필 | `{ activeId, profiles: [{ id, name, photo, data }] }` — 최대 12개 |
| `@profiles_v1.bak` | 프로필 | 마지막으로 정상 파싱된 스냅샷 (손상 복구용) |
| `@profiles_v1.preimport` | 프로필 | v1.3 — 백업 복원 **직전** 상태 (되돌리기 안전망) |
| `@theme_v2` | 기기 | `{ themeId, mode, unlocked[], introSeen }` |
| `@streak_v1` | 기기 | 출석 스트릭 |
| `@ui_prefs_v1` | 기기 | `{ haptics, reduceMotion }` |
| `@notif_prefs_v1` | 기기 | `{ master, discharge, leave, milestone, streak, daily, dailyHour }` — `leave` 는 v1.3 |
| `@notif_sig` | 기기 | 마지막 알림 예약 입력 해시 (재예약 생략 게이트) |

`data` 필드: `personnelType, militaryInfo, leaveRecords, leaveTotal, leaveBonus,
salaryInfo, todos, rankPromotions, savingsPlan, celebrated`.

- `photo` 는 v1.3 부터 `documentDirectory/profile-photos/` 의 파일 경로다 (예전엔 캐시 경로 —
  첫 실행 때 `ProfileBar` 가 옮긴다).
- 쓰기는 전부 `_serial` 큐(프로필) / `_themeSerial`(테마) / `_prefsChain`(알림 설정)로 직렬화된다.

### 백업 파일 (v1.3, `utils/backup.js`)

```json
{ "app": "jeonryeokkami", "schema": 1, "exportedAt": "ISO",
  "data": { "profiles": { "activeId", "profiles": [...] }, "theme", "streak", "uiPrefs" } }
```

사진(경로가 기기마다 다름)과 알림 설정(새 기기에선 권한부터 다시 받아야 함)은 싣지 않는다.
`schema` 가 앱이 아는 값보다 크면 거부한다 (업데이트 안내).

### 공유 코드 (v1.3, `utils/shareCode.js`)

`JY1-<base64url(JSON 배열)><체크섬 2자>` — `[이름, YYYYMMDD 입대일, 군별, 신분, 장교계급|0,
복무개월, 일병|0, 상병|0, 병장|0]`. 받는 쪽은 `addSharedProfile` / `updateProfileFromShare`
로 프로필을 만든다. 같은 사람 판정은 `입대일|군별|신분`.

---

## 1. 저장 키 전체 목록 (레거시 — 마이그레이션 전용)

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
| `id` | string | `타임스탬프_순번` — 같은 밀리초 충돌 방지 |
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
| `id` | string | `타임스탬프_순번` — 같은 밀리초 충돌 방지 |
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
