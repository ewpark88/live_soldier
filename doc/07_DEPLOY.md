# 배포 가이드 (EAS Build & Google Play)

---

## 1. 사전 준비

### 1.1 필수 도구 설치
```bash
npm install -g eas-cli
eas login   # ew.park88@gmail.com 계정으로 로그인
```

### 1.2 EAS 프로젝트 확인
```bash
eas project:info
# 프로젝트 ID: 3a3a8b40-0f20-4ad5-b7a7-0635c8888388
```

---

## 2. 빌드 프로파일 설명

`eas.json`:
```json
{
  "cli": {
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle",
        "autoIncrement": true
      }
    }
  }
}
```

| 프로파일 | 목적 | 출력 형식 | versionCode 증가 |
|----------|------|-----------|-----------------|
| `development` | 개발/디버깅 (dev client) | APK | ❌ |
| `preview` | QA 테스트 배포 | APK | ❌ |
| `production` | Google Play 제출 | AAB | ✅ (자동) |

---

## 3. APK 빌드 (테스트용)

```bash
# preview 프로파일 — APK 생성
eas build --platform android --profile preview

# 빌드 완료 후 다운로드 링크가 터미널에 출력됨
# 또는: https://expo.dev 에서 확인
```

- 빌드 소요 시간: 약 10~20분 (클라우드 빌드)
- 완료 후 APK를 직접 설치하여 테스트

---

## 4. AAB 빌드 (Google Play 제출용)

```bash
eas build --platform android --profile production
```

- `autoIncrement: true` → EAS 서버에서 versionCode 자동 증가
- 매 production 빌드마다 versionCode +1
- `appVersionSource: "remote"` → 로컬 app.json의 versionCode 무시

### 버전 관리
| 항목 | 위치 | 설명 |
|------|------|------|
| `versionName` (앱 버전) | `app.json > version` | 사용자에게 보이는 버전 (예: "1.0.0") |
| `versionCode` (빌드 번호) | EAS 서버 관리 | 스토어 제출 시 매번 증가 필요 |

버전명 업데이트:
```json
// app.json
{
  "expo": {
    "version": "1.1.0"
  }
}
```

---

## 5. Google Play Console 업로드

### 5.1 처음 앱 등록
1. [Google Play Console](https://play.google.com/console) 접속
2. "앱 만들기" → 앱 이름: "전역까지"
3. 패키지명: `com.jeonryeokkami.app`
4. 카테고리: 라이프스타일 또는 도구(Tools)

### 5.2 내부 테스트 트랙 배포 (권장 순서)
1. **내부 테스트** → AAB 업로드 → 테스터 이메일 추가
2. **비공개 테스트(알파)** → 더 넓은 테스터 그룹
3. **공개 테스트(베타)** → 일반 사용자 일부
4. **프로덕션** → 전체 공개

### 5.3 AAB 업로드 방법
1. EAS 빌드 완료 후 AAB 파일 다운로드 (expo.dev)
2. Play Console → 원하는 트랙 → "새 버전 만들기"
3. AAB 파일 업로드
4. 출시 정보 입력 → 저장 → 검토 제출

---

## 6. 앱 서명 키 관리

EAS Build는 자체 서명 키를 관리합니다:
- 최초 production 빌드 시 EAS가 자동으로 키스토어 생성
- 키는 EAS 서버에 안전하게 보관됨
- 로컬에 `.jks` 파일 필요 없음

### 키 정보 확인
```bash
eas credentials
```

### 주의: 키스토어 분실 시
- Google Play에 이미 등록된 앱의 서명 키를 변경하면 기존 설치 사용자들이 업데이트 불가
- EAS 서버의 키스토어는 분실되지 않도록 백업 권장
  ```bash
  eas credentials --platform android
  # → 키스토어 다운로드 옵션 선택
  ```

---

## 7. GitHub 연동 및 소스 관리

### 저장소 정보
- URL: https://github.com/ewpark88/live_soldier
- 기본 브랜치: `main`

### 새 PC에서 작업 시작
```bash
git clone https://github.com/ewpark88/live_soldier.git
cd live_soldier
npm install
```

### 작업 후 커밋 & 푸시
```bash
git add .
git commit -m "기능 설명"
git push origin main
```

### .gitignore 주요 제외 항목
```
node_modules/
.expo/
dist/
web-build/
*.jks
*.key
*.p12
.env
.env.*
```

---

## 8. 앱 아이콘 재생성

```bash
npm run icon
# → generate-icon.js 실행
# → assets/icon.png (1024×1024) 생성
# → assets/adaptive-icon.png (1024×1024, 배경 없음) 생성
```

아이콘 디자인 변경 시 `generate-icon.js`의 SVG 코드 수정 후 재실행.

---

## 9. 자주 쓰는 명령어 치트시트

```bash
# 개발
npx expo start                              # Expo Go로 개발 서버 시작
npx expo start --dev-client                 # Dev Build 앱으로 서버 시작

# 빌드
eas build --platform android --profile preview      # 테스트 APK
eas build --platform android --profile production   # 스토어 AAB
eas build --platform ios --profile production       # iOS IPA (미래)

# 빌드 목록 확인
eas build:list

# 로그인/계정
eas login
eas whoami

# 패키지 업데이트
npx expo install --fix    # Expo SDK 호환 버전으로 패키지 자동 수정

# 아이콘
npm run icon
```

---

## 10. 업데이트 배포 체크리스트

```
□ app.json version 업데이트 (예: 1.0.0 → 1.1.0)
□ 변경 사항 GitHub 커밋 & 푸시
□ eas build --platform android --profile production
□ 빌드 완료 확인 (expo.dev 또는 터미널)
□ AAB 다운로드
□ Play Console → 원하는 트랙 → 새 버전 → AAB 업로드
□ 출시 노트 작성 (한국어)
□ 제출 → 검토 (보통 1~3일)
```
