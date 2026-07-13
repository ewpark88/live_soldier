# 디자인 시스템 (v1.0.7~)

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

색상은 `src/constants/colors.js` (라이트/다크 두 벌). 배럴 `src/theme/index.js` 에서
한 줄로 가져다 쓴다.

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
| `AdFooter` | `Screen` 이 알아서 그린다. 화면이 직접 쓸 일 없음 |

모션: `src/components/motion/` — `AnimatedNumber`(카운트업), `BottomSheet`.

---

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
