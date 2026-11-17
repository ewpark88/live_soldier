package com.jeonryeokkami.app.widget;

import com.reactnativeandroidwidget.RNWidgetProvider;

/**
 * 홈 위젯 '기본' (3×2) — D-Day · 진행률 · 전역일 · 다음 휴가.
 * 클래스 이름이 곧 JS 의 widgetName('Discharge') 이다 — 바꾸면 이미 깔린 위젯이 죽는다.
 * bare 워크플로라 react-native-android-widget 의 config plugin 이 돌지 않는다.
 * 플러그인이 만들던 파일을 손으로 둔다 (AndroidManifest receiver · res/xml provider).
 */
public class Discharge extends RNWidgetProvider {
}
