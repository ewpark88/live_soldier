# R8 / ProGuard 규칙.
#
# `android.enableMinifyInReleaseBuilds=true` (gradle.properties) 를 켜면서부터
# 이 파일이 실제로 의미를 갖는다. Play Console 의 "DEX 코드 최적화가 기준점
# 미만 / 난독화 1%" 경고를 없애려면 R8 이 켜져 있어야 하고, 그러면 리플렉션으로
# 찾는 클래스는 여기서 직접 지켜야 한다.
#
# 원칙: **넓게 keep 하지 않는다.** `-keep class com.foo.** { *; }` 를 남발하면
# 난독화 비율이 도로 떨어져서 경고가 돌아온다. 리플렉션으로 접근되는 것만 지킨다.
#
# 대부분의 라이브러리는 AAR 안에 consumer 규칙을 넣어 자동 적용된다
# (expo-modules-core, react-native-reanimated, play-services-ads, androidx).
# 아래는 그게 **안 되는** 것들만 모은 것이다.

# ── expo-notifications ────────────────────────────────────────────────
# node_modules/expo-notifications/android/ 에 proguard-rules.pro 가 있는데
# build.gradle 이 consumerProguardFiles 로 연결하지 않았다. 즉 AAR 에 실려오지
# 않으므로 R8 을 켜면 그 규칙이 통째로 적용되지 않는다. 내용을 그대로 옮긴다.
# (알림 예약·수신은 전부 릴리스에서만 도는 경로라 디버그로는 확인이 안 된다.)
-keep class expo.modules.notifications.** { *; }

# ── react-native-android-widget ───────────────────────────────────────
# consumer 규칙이 없다. WorkManager 가 Worker 를 **클래스 이름 문자열로**
# 생성하고(RNWidgetBackgroundTaskWorker), AppWidgetProvider 는 시스템이
# 매니페스트의 이름으로 인스턴스화한다. 이름이 바뀌면 위젯이 조용히 죽는다.
-keep class com.reactnativeandroidwidget.** { *; }
-keep class * extends androidx.work.ListenableWorker { *; }
-keep class * extends android.appwidget.AppWidgetProvider { *; }

# ── react-native-google-mobile-ads ────────────────────────────────────
# GMA SDK(play-services-ads) 자체는 consumer 규칙을 갖고 있다. RN 래퍼 모듈은
# 네이티브 이벤트/모듈 이름으로 연결되므로 래퍼만 지킨다.
-keep class io.invertase.googlemobileads.** { *; }

# ── React Native 코어 ─────────────────────────────────────────────────
# @DoNotStrip 이 붙은 멤버는 JNI 가 이름으로 찾는다. RN 의 consumer 규칙이
# 대부분 덮지만, 릴리스에서만 터지는 종류라 여기서도 못 박아 둔다.
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
-keepclassmembers class * {
    @com.facebook.common.internal.DoNotStrip *;
}
-keep class com.facebook.jni.** { *; }

# ── react-native-reanimated ───────────────────────────────────────────
# AAR consumer 규칙에 이미 있지만(=중복), 모션이 앱 전체의 기반이라 남겨 둔다.
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ── 스택트레이스 ──────────────────────────────────────────────────────
# 난독화된 크래시 로그를 되읽을 수 있도록 줄 번호를 남긴다.
# (Play Console 은 EAS 가 올린 매핑 파일로 자동 복원해 준다)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
