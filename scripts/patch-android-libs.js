#!/usr/bin/env node
/**
 * React Native 0.81.x의 com.facebook.react 플러그인과
 * io.invertase.gradle.build 플러그인 모두 android {} 블록에
 * publishing { multipleVariants { allVariants() } } 를 자동으로 추가한다.
 *
 * 그런데 라이브러리 자체 build.gradle에도 동일 블록이 이미 명시되어 있어
 * "multipleVariants used multiple times" 빌드 오류가 발생한다.
 *
 * 수정 방향: 라이브러리 build.gradle에서 중복 블록을 제거한다 (플러그인이 처리).
 * react-native-google-mobile-ads는 추가로 compileSdk를 명시해야 한다.
 */
const fs = require('fs');
const path = require('path');

const MARKER = '// agp-patch-applied';

/**
 * android {} 내부의 publishing { multipleVariants { allVariants() } } 블록을 제거한다.
 * 들여쓰기 스타일(2칸/4칸)에 상관없이 동작하는 정규식 사용.
 */
function removeMultipleVariantsBlock(content) {
  return content.replace(
    /[ \t]*publishing \{\s*\n[ \t]*multipleVariants \{\s*\n[ \t]*allVariants\(\)\s*\n[ \t]*\}\s*\n[ \t]*\}\s*\n/g,
    ''
  );
}

const PATCHES = [
  // react-native-safe-area-context
  // 자체 build.gradle에 multipleVariants 블록이 있고 com.facebook.react 플러그인도 추가 → 중복
  {
    file: 'node_modules/react-native-safe-area-context/android/build.gradle',
    patch(content) {
      return removeMultipleVariantsBlock(content);
    },
  },

  // react-native-screens
  // 동일한 이유로 중복 발생
  {
    file: 'node_modules/react-native-screens/android/build.gradle',
    patch(content) {
      return removeMultipleVariantsBlock(content);
    },
  },

  // react-native-google-mobile-ads
  // 1) multipleVariants 중복 제거 (io.invertase 플러그인이 추가)
  // 2) compileSdk 명시 (AGP 8.11은 android {} 블록에 직접 선언 요구)
  {
    file: 'node_modules/react-native-google-mobile-ads/android/build.gradle',
    patch(content) {
      let result = removeMultipleVariantsBlock(content);

      // compileSdk가 android {} 블록에 직접 없으면 추가
      if (!result.match(/^android\s*\{[^}]*compileSdk\b/ms)) {
        result = result.replace(
          /^(android\s*\{)/m,
          `$1\n  compileSdk 34`
        );
      }

      return result;
    },
  },
];

PATCHES.forEach(({ file, patch }) => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${file} (not found)`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');

  if (content.includes(MARKER)) {
    console.log(`Already patched: ${file}`);
    return;
  }

  const patched = patch(content);

  // 마커를 파일 첫 줄에 삽입해 멱등성 보장
  const final = MARKER + '\n' + patched;
  fs.writeFileSync(fullPath, final, 'utf8');
  console.log(`Patched: ${file}`);
});

console.log('Android library patch done.');
