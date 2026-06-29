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

- `versionName`: `app.json > expo.version` — 출시 시 직접 올린다 (예: 1.0.1 → 1.0.2).
- `versionCode`: `eas.json`이 `appVersionSource: "remote"` + `autoIncrement: true`라 EAS 서버가 자동 증가시킨다. app.json의 versionCode는 무시된다.
- 출시 이력과 어긋나면 `eas build:version:get` 으로 확인하고 `eas build:version:set` 으로 맞춘다.

자세한 배포 절차는 `doc/07_DEPLOY.md` 참고.
