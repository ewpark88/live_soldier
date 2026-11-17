import React from 'react';
import { Platform } from 'react-native';
import { WIDGETS } from './widgetCatalog';
import { getWidgetData } from './widgetData';

/**
 * 앱에서 홈 위젯(전 종류)을 최신 데이터로 갱신 요청.
 * - 안드로이드에서만 동작, 네이티브 모듈/위젯 미설치 환경에서도 안전(try/catch).
 * - 입대정보 저장·프로필 전환·테마 변경 등 데이터 변경 시 호출.
 * - 이름은 예전 그대로 둔다 (호출부가 여러 곳이다). 이제 '심플' 위젯도 같이 갱신한다.
 */
export async function updateDischargeWidget() {
  if (Platform.OS !== 'android') return;

  let widgetLib;
  try {
    widgetLib = require('react-native-android-widget');
  } catch {
    return; // 위젯 라이브러리 네이티브 미링크(예: 리빌드 전) — 무시
  }

  let data;
  try {
    data = await getWidgetData();
  } catch {
    return;
  }

  for (const w of WIDGETS) {
    const { Component } = w;
    try {
      // await로 감싸야 requestWidgetUpdate 내부의 네이티브 호출 reject까지 try/catch가 포착
      await widgetLib.requestWidgetUpdate({
        widgetName: w.name,
        renderWidget: () => <Component {...data} />,
        widgetNotFound: () => {}, // 홈에 이 위젯이 없으면 아무 동작 안 함
      });
    } catch {
      // 위젯 갱신 실패는 앱 동작에 영향 주지 않도록 무시
    }
  }
}
