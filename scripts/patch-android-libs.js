#!/usr/bin/env node
/**
 * AGP 8.11.0 (Gradle 8.14.3) requires library modules to explicitly declare
 * consumable variants via `publishing { multipleVariants { allVariants() } }`.
 * Libraries with old AGP in their own buildscript don't do this, causing
 * "No variants exist" errors at resolution time.
 */
const fs = require('fs');
const path = require('path');

const PATCHES = [
  {
    file: 'node_modules/react-native-screens/android/build.gradle',
    find: '                srcDirs = ["${androidResDir}/base"]\n            }\n        }\n    }\n}',
    replace: '                srcDirs = ["${androidResDir}/base"]\n            }\n        }\n    }\n    publishing {\n        multipleVariants {\n            allVariants()\n        }\n    }\n}',
  },
  {
    file: 'node_modules/react-native-safe-area-context/android/build.gradle',
    find: '            } else {\n                srcDirs += [\n                    "src/paper/java"\n                ]\n            }\n        }\n    }\n}',
    replace: '            } else {\n                srcDirs += [\n                    "src/paper/java"\n                ]\n            }\n        }\n    }\n    publishing {\n        multipleVariants {\n            allVariants()\n        }\n    }\n}',
  },
  {
    file: 'node_modules/react-native-google-mobile-ads/android/build.gradle',
    find: '  compileOptions {\n    sourceCompatibility JavaVersion.VERSION_1_8\n    targetCompatibility JavaVersion.VERSION_1_8\n  }\n}\n\nrepositories {',
    replace: '  compileOptions {\n    sourceCompatibility JavaVersion.VERSION_1_8\n    targetCompatibility JavaVersion.VERSION_1_8\n  }\n  publishing {\n    multipleVariants {\n      allVariants()\n    }\n  }\n}\n\nrepositories {',
  },
];

PATCHES.forEach(({ file, find, replace }) => {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${file} (not found)`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');

  if (content.includes('publishing {')) {
    console.log(`Already patched: ${file}`);
    return;
  }

  if (!content.includes(find)) {
    console.warn(`WARNING: Anchor not found in ${file} — patch skipped`);
    return;
  }

  fs.writeFileSync(fullPath, content.replace(find, replace), 'utf8');
  console.log(`Patched: ${file}`);
});

console.log('Android library AGP variant patching done.');
