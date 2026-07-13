# CLAUDE.md

전역까지 (jeonryeokkami) — Expo / EAS 기반 React Native 앱.

## AAB / 안드로이드 빌드 (중요)

**"AAB 빌드해", "안드로이드 빌드해", "출시 빌드" 라는 요청은 항상 EAS 클라우드 빌드로 처리한다.**

```bash
eas build --platform android --profile production
```

- 로컬 Gradle 빌드(`./gradlew bundleRelease`, `expo run:android --variant release`)로 만든 AAB는 **절대 Play에 올리지 않는다.**
- 이유: `android/app/build.gradle`의 release 빌드가 `debug.keystore`로 서명되도록 돼 있다.
  로컬 빌드 AAB는 디버그 키(SHA1 `5E:8F:…`)로 서명되어 Play가 "잘못된 키"로 거부한다.
  Play에 등록된 업로드 키는 EAS 관리 키스토어(SHA1 `4E:21:…`)이며, EAS 빌드만 이 키로 서명한다.
- 빌드만 요청받으면 빌드까지만 하고 `eas submit`(업로드)은 하지 않는다. 업로드는 사용자가 직접 한다.

## 버전 관리

- `versionName`: **`android/app/build.gradle`의 `versionName`이 실제 출시 버전이다.** 이 프로젝트는 `android` 디렉터리가 커밋된 bare 워크플로라, EAS 빌드가 app.json의 `expo.version`을 **무시하고** 네이티브 코드(build.gradle) 값을 쓴다. 출시 시 build.gradle의 versionName을 직접 올리고 app.json의 `expo.version`도 같은 값으로 맞춰둔다 (예: 1.0.1 → 1.0.2). app.json만 올리면 빌드에 반영되지 않으니 주의.
- `versionCode`: `eas.json`이 `appVersionSource: "remote"` + `autoIncrement: true`라 EAS 서버가 자동 증가시킨다. app.json과 build.gradle의 versionCode는 모두 무시된다.
- 출시 이력과 어긋나면 `eas build:version:get` 으로 확인하고 `eas build:version:set` 으로 맞춘다.

자세한 배포 절차는 `doc/07_DEPLOY.md` 참고.

## UI / 디자인 시스템 (v1.0.7~)

화면을 새로 만들거나 고치기 전에 **`doc/05_DESIGN_SYSTEM.md` 를 먼저 읽는다.** 핵심만:

- 스타일 값은 `src/theme/tokens.js` 의 토큰을 쓴다. `fontSize`·`padding`·`borderRadius` 를
  직접 숫자로 박지 않는다. 색은 `useThemeColors()` — 하드코딩 hex 금지 (다크모드가 깨진다).
- 화면은 `<Screen>` + `<AppHeader>` + `<Section>` 위에 짓는다.
  **세로 간격은 `<Section>` 만 준다** — 자식이 자기 마진을 가지면 간격이 겹쳐 쌓인다.
- 그리드는 `<Grid>` 프리미티브만. `width:'47.5%'` + `gap` 같은 퍼센트 조합은 100%로
  안 떨어져서 오른쪽에 자투리가 남는다.
- 애니메이션은 전부 `useMotion()` 을 거친다 (OS 동작 줄이기 + 설정 토글 대응).
  진행 바는 `scaleX`, **`width:'%'` 애니메이션 금지.**
- **`babel.config.js` 를 건드리지 말 것** — `babel-preset-expo@54` 가 reanimated worklets
  플러그인을 자동 주입한다. 수동 추가 시 이중 적용되어 난해한 worklet 에러가 난다.
- UI 아이콘은 Ionicons. 상수의 `emoji` 필드는 위젯·공유 텍스트가 쓰므로 지우지 않는다.
