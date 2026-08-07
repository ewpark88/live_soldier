# 디자인 시스템 (v1.0.7~, v1.1 갱신)

전 화면을 토큰 + 공용 프리미티브 위에서 다시 짰다. 새 화면을 만들거나
기존 화면을 고칠 때 이 문서의 규칙을 따른다.

---

## 1. 토큰 — `src/theme/tokens.js`

의존성이 없는 순수 데이터 파일이다. `src/widget/*` 는 `react-native-android-widget`
런타임에서 돌기 때문에 Reanimated 같은 게 딸려 들어가면 위젯이 죽는다.
**절대 이 파일에 import 를 추가하지 말 것.**

| 토큰 | 내용 |
|---|---|
| `space` | 4pt 그리드 — `xxs2 xs4 sm8 md12 lg16 xl20 xxl24 xxxl32 huge40` |
| `radius` | `xs6 sm10 md14 lg20 xl28 pill999` (`lg20` = Card 기본) |
| `type` | 역할별 타이포 — `display hero title subtitle section bodyLg body bodySm label caption micro statValue statLabel button buttonSm` |
| `tabular` | `fontVariant: ['tabular-nums']` — 변하는 숫자엔 **반드시** |
| `motion` | `duration / stagger / bezier / spring` |
| `elev(tc)` | 그림자 팩토리 (색이 테마 의존이라 함수) — `sm md lg hero` |

색상은 **`src/theme/palettes/`** 의 테마 레지스트리가 소유한다 (v1.1~).
`src/constants/colors.js` 는 하위호환 shim 으로만 남아 있다.

| 파일 | 역할 |
|---|---|
| `palettes/base.js` | 구조 기준 팔레트 (포레스트). 모든 키가 여기 다 있다 |
| `palettes/<id>.js` | 테마별 **부분 오버라이드** + `{id, name, desc, schemes, lock, swatch}` |
| `palettes/index.js` | `resolvePalette(themeId, scheme)` · `effectiveScheme` · `THEME_LIST` |
| `theme/contrastPairs.js` | 대비 검증 페어 표 |

**`src/theme/palettes/*` 와 `contrastPairs.js` 는 `tokens.js` 와 같은 등급으로
런타임 라이브러리 import 가 금지된다.** 이유가 둘이다.
1. `src/widget/widgetData.js` 가 이 레지스트리를 읽는다 (헤드리스 런타임).
2. `scripts/check-contrast.js` 가 맨 Node 에서 이 파일들을 실행한다.
형제 팔레트 파일끼리의 import(index.js 가 테마를 모으는 것)만 허용된다.

### 새 테마를 추가할 때
1. `palettes/<id>.js` 에 부분 오버라이드를 쓴다. 라이트를 정직하게 만들 수 없으면
   `schemes: ['dark']` 로 다크 전용을 선언한다 (기본 테마만 둘 다 필수).
2. **`npm run theme:check` 를 통과해야 한다.** 576개 페어를 전수 검사한다.
   `KNOWN_ISSUES` 는 비어 있어야 정상이고, 새 테마에 예외를 추가하지 않는다.
3. 카운트다운 단계 색은 `phase.{normal,d100,d30,d7,d3,done}` 에 넣는다.
   아이콘·문구·불티 밀도는 색이 아니므로 `src/constants/phases.js` 가 갖는다.

### 대비 계약 (요약)
`onPrimary`↔`primary`, `onGold`↔`goldFrom`/`goldTo`, `onDanger`↔`danger`,
`phase[*].accent`↔그라데이션 양 끝은 **4.5:1**. 본문 `text`↔`card` 는 7:1.
장식(`textLight`)만 3:1. 자세한 건 `contrastPairs.js`.

### 타이포에 lineHeight 가 전부 박혀 있는 이유
안드로이드는 `lineHeight < fontSize × 1.3` 이면 한글 받침을 잘라먹고,
`includeFontPadding` 이 위아래로 유령 여백을 넣어 큰 숫자가 시각적으로 어긋난다.
역할만 고르면 자동으로 따라오게 만들어 두었다 — 직접 `fontSize` 를 쓰지 말 것.

### 사용법 (기존 `makeStyles(tc)` 패턴 그대로)
```js
import { useThemeColors } from '../theme/ThemeContext';
import { elev, radius as r, space as sp, type as ty } from '../theme/tokens';

const styles = useMemo(() => makeStyles(tc), [tc]);

const makeStyles = (tc) => {
  const e = elev(tc);
  return StyleSheet.create({
    card: { backgroundColor: tc.card, borderRadius: r.lg, padding: sp.lg, ...e.md },
    title: { ...ty.section, color: tc.text },
  });
};
```

---

## 2. 프리미티브 — `src/components/ui/`

| 컴포넌트 | 요지 |
|---|---|
| `Screen` | 모든 화면의 껍데기. `insets.top`·스크롤·좌우 거터·광고 푸터를 전담한다 |
| `AppHeader` | 상단 바 (제목 + 햄버거). `collapsible` + `scrollY` 로 접히는 헤더 |
| `Section` | **세로 간격의 유일한 주인** + 진입 스태거 |
| `HeroCard` | 유일한 그라데이션 히어로 표면. `overflow:'hidden'` 항상 켜짐 |
| `Grid` | 폭을 실제로 재서 셀을 나눈다 (퍼센트 폭 금지) |
| `Button` | `primary / accent / secondary / ghost / danger` × `sm / md / lg` |
| `PressScale` | 눌리는 모든 표면의 기반 (스프링 + 햅틱) |
| `Chip` `StatTile` `ListRow` `EmptyState` `Divider` `Txt` | — |
| `AdFooter` | `Screen` 이 알아서 그린다 (`ad` prop). 본문 인라인 광고는 `AdBanner` 를 직접 |
| `Screen` 추가 prop (v1.1) | `standalone` — 루트 스택 화면(탭바 없음)의 하단 safe area / `overlay` — 루트 위 오버레이(`box-none`) |
| `AppHeader` 변경 (v1.1) | `menu`/`current` 제거(햄버거 삭제), `back` 추가 |

모션: `src/components/motion/` — `AnimatedNumber`(카운트업), `BottomSheet`.

---

## 2-1. 네비게이션 (v1.1~)

```
NavigationContainer
└─ RootStack (native-stack, headerShown:false)
   ├─ tabs → 홈 / 캘린더 / 급여 / 내 정보
   └─ discharge · roadmap · savings · benefits · salaryGuide · officerPay · theme
```

- **라우트 이름은 트리 전체에서 유일해야 한다.** 크로스 네비게이터 `navigate` 가
  여기에 의존한다.
- **`navigate` 버블링은 위로만 간다.** 스택 화면에서 탭 자식으로는 못 간다 —
  그래서 여러 곳에서 진입하는 화면은 전부 루트 스택에 둔다.
- 스택 화면은 `<Screen standalone>` + `<AppHeader back>` 을 쓴다. `standalone` 을
  빼먹으면 배너 하단이 제스처 바에 잘린다.
- `contentStyle.backgroundColor` 를 지정하지 않으면 다크모드 전환 중 흰 화면이
  번쩍인다 (`RootNavigator` 참고).
- 탭바 높이 산식(`BAR_CONTENT=60`, `includeFontPadding:false`, `elevation:8`)은
  안드로이드 라벨 잘림·광고 겹침을 실제로 고친 값이다. 탭 개수만 바꾸고 이 값은
  손대지 않는다.

## 3. 섹션 겹침 방지 계약 (반드시 지킬 것)

1. **간격의 주인은 하나** — `<Section>` 만. 자식은 자기 `marginTop/marginBottom` 을
   갖지 않는다. (`Card` 의 내장 `marginBottom` 은 이래서 제거했다.)
2. **모든 장식은 클리핑된다** — 절대배치 시각요소(그라데이션·sheen·글로우·불티)는
   반드시 `overflow:'hidden'` 부모 안 + `pointerEvents="none"`.
3. **음수 마진 금지.**
4. **그리드는 `Grid` 프리미티브만** — `width:'47.5%'` + `gap` 같은 조합 금지.
   절대 100% 로 안 떨어져서 오른쪽에 자투리가 남는다.
5. **고정 푸터는 flex 형제로** — `position:'absolute'` 금지.

---

## 4. 모션

**임팩트는 화면당 하나의 크고 느리고 확신에 찬 동작**(히어로: 카운트업 +
그라데이션 + 바 채움)**에서 나온다. 나머지는 전부 200ms 미만의 즉각적 피드백.**
동시다발 애니메이션에서 나오지 않는다.

- 화면당 쇼피스 모션은 정확히 하나.
- **무한 루프는 히어로 안에서만, 최대 2개.**
- 진행 바는 `scaleX` + `transformOrigin:'left'`. **`width:'%'` 애니메이션 금지**
  (프레임마다 레이아웃 패스를 강제해 JS 스레드로 끌려간다).
- 변하는 숫자엔 `tabular` 필수. 아니면 폭이 떨려 흔들린다.
- 실시간 `setInterval` 은 `useIsFocused()` 로 게이팅.

### 무한 루프 예산 (v1.1 정리)
"히어로 안에서만, 최대 2개" 규칙이 예전엔 실제로는 최대 22개까지 어겨지고
있었다 (sheen 1 + Ember 18 + 게이지 3). 정리 결과:
- `EmberField` 는 공유값 **1개**로 돈다. 점마다 위상 offset 을 더해 파생시키므로
  루프는 늘지 않는데 따로 노는 것처럼 보인다 (속도를 다르게 하면 감길 때 튄다).
- 불티가 뜨는 단계에선 `HeroCard sheen={false}` — 어차피 서로 잡아먹는다.
- `LiveServiceGauge` 의 shimmer/edge/dot 는 **승인된 예외**다 (이 앱의 간판이고
  `useIsFocused()` + `done` 게이팅이 걸려 있다).
- **테마 미리보기 카드는 애니메이션 0개.** `HeroCard` 를 쓰면 카드 수만큼 sheen
  루프가 늘어난다.

### 리듀스 모션
모든 애니메이션은 `useMotion()` 하나만 거친다. OS 의 "동작 줄이기" 접근성 설정과
설정 화면의 "애니메이션 줄이기" 토글을 OR 로 합친다. 화면 코드는 직접 분기하지 않는다.

```js
const m = useMotion();
withTiming(1, { duration: m.dur(motion.duration.base) })  // 줄이기 ON → 0ms
<Animated.View entering={m.enter(FadeInUp, i)} />          // 줄이기 ON → undefined
```

### 햅틱
`src/utils/haptics.js` — 설정의 "햅틱 반응" 토글로 전역 차단된다.
`select`(칩·라디오) / `light`(카드 누름) / `medium`(할일 완료·FAB) /
`success`(저장) / `warning`(검증 실패).

---

## 5. 아이콘

**Ionicons 만 쓴다.** 장식용 이모지와 생 텍스트 글리프(`✕` `＋` `▲▼` `›`)는 UI 에서
쓰지 않는다. 계급 표시는 `src/constants/rankImages.js` 의 실제 계급장 PNG 를 쓴다.

단, 상수 파일의 `emoji` 필드는 **지우지 않는다** — 위젯과 공유 텍스트가 쓴다.
화면 UI 는 그 옆의 `icon` 필드를 쓴다.

---

## 6. 라이브러리 주의사항

- **`babel.config.js` 를 건드리지 말 것.** `babel-preset-expo@54` 가 reanimated
  설치를 감지해 worklets 플러그인을 자동 주입한다. 수동으로
  `react-native-reanimated/plugin` 을 추가하면 변환이 **이중 적용**된다.
- New Architecture 가 켜져 있다 (`android/gradle.properties: newArchEnabled=true`).
- `edgeToEdgeEnabled=true` 라 풀블리드 그라데이션은 상태바 밑까지 그려진다 —
  **배경이 아니라 콘텐츠에만** inset 을 준다 (`Screen` 이 처리).
- 안드로이드에서 `overflow:'hidden'` + 그라데이션 자식이면 elevation 그림자가
  사라진다. 그림자는 바깥 래퍼, 클리핑은 안쪽 (`HeroCard` 가 처리).
- **한 파일에서 `react-native` 의 `Animated` 와 `react-native-reanimated` 를
  동시에 import 하지 않는다.** 파일 단위로 통째 이관할 것.

---

## 7. 리텐션 장치 (v1.1~)

전부 클라이언트 전용이다 (서버·DB 없음이라는 프로젝트 제약 유지).

| 장치 | 소유 파일 | 핵심 규칙 |
|---|---|---|
| 출석 스트릭 | `utils/streak.js` · `state/StreakContext.js` | 체크인은 **마운트 + AppState 'active'** 에서만. 홈 포커스에 걸지 말 것 (세션당 10회 넘게 돈다) |
| 앱 전역 "오늘" | `StreakContext.today` | 화면마다 `new Date()` 를 부르면 자정 넘김에서 날짜가 어긋난다. 여기서 받아 쓴다 |
| 데일리 히어로 | `utils/daily.js` · `hooks/useDailyHero.js` | `pickDaily` 는 **회전**이라 연속 이틀 중복이 구조적으로 불가능하다. 해시 난수로 바꾸지 말 것 |
| 마일스톤 축하 | `utils/celebration.js` · `state/CelebrationContext.js` | 오탐 방지 두 겹: `celebrated == null` 시딩 + `dday ∈ [-2,0]` 창 |
| 테마 해금 | 팔레트의 `lock: { key, altKey }` | **복무 마일스톤 기준**(스트릭 아님). 간부는 진급 마일스톤이 없으므로 `altKey` 필수 |

### 하지 말 것
- **스트릭으로 콘텐츠를 잠그지 않는다.** 이 앱 사용자는 혹한기(7일)·유격(5일)처럼
  폰을 못 만지는 기간이 실제로 있다 — 앱이 프리셋으로 갖고 있는 항목들이다.
  가장 고생하는 사용자를 정확히 겨냥해 벌을 주는 설계가 된다.
- **스트릭 증가·축하 연출 중에 전면 광고를 띄우지 않는다.** 리텐션 장치가
  통째로 무의미해진다 (`HomeScreen` 의 `justIncremented` 가드).
- **축하 오버레이는 루트에 정확히 하나** (`TabNavigator`). 화면별로 마운트하면
  탭 전환마다 이중 발화한다.

### 알림
- `refreshScheduledNotifications()` 는 **시그니처 게이트**를 지난다. 예약 입력이
  안 바뀌었고 예약도 살아 있으면 AsyncStorage 읽기 1회로 끝낸다.
  홈 포커스마다 부르지 말고 데이터 변경 지점에서만 호출한다.
- **60건 캡**이 있다 (iOS pending 상한 64). 우선순위:
  전역 > 진급 > 마일스톤 전야 > 스트릭 > 일정 > 매일.
- 채널 3개(`discharge-reminders` / `streak-reminders` / `daily-nudge`).
  **안드로이드는 채널 생성 후 importance 변경을 무시한다** — 기존 id 를 다른
  중요도로 재사용하지 말고 새 id 를 판다.
- `POST_NOTIFICATIONS` 는 expo-notifications 매니페스트에서 자동 병합된다.
  `app.json`·커밋된 매니페스트를 건드릴 필요가 없다.
  **`SCHEDULE_EXACT_ALARM` 은 절대 추가하지 않는다** (Play 심사 거부 사유).
