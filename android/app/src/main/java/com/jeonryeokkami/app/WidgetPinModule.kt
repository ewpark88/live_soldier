package com.jeonryeokkami.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * 앱 안에서 '홈 화면에 위젯 추가'를 한 번에 요청한다 (Android 8.0+ requestPinAppWidget).
 *
 * 사용자가 런처를 길게 눌러 위젯 목록을 뒤지지 않아도 되게 하는 게 목적이다.
 * 런처가 고정 요청을 지원하지 않으면(일부 서드파티 런처) isSupported 가 false 이고,
 * JS 쪽은 수동 추가 방법을 안내한다.
 *
 * widgetName 은 위젯 receiver 클래스의 단순 이름(Discharge · DdaySimple)이다.
 */
class WidgetPinModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {

  override fun getName() = "WidgetPin"

  private fun component(widgetName: String) =
    ComponentName(ctx, "${ctx.packageName}.widget.$widgetName")

  @ReactMethod
  fun isSupported(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        promise.resolve(false)
        return
      }
      promise.resolve(AppWidgetManager.getInstance(ctx).isRequestPinAppWidgetSupported)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  /** 시스템 '홈 화면에 추가' 확인 창을 띄운다. 띄웠으면 true (사용자가 실제로 추가했는지는 모른다). */
  @ReactMethod
  fun requestPin(widgetName: String, promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
        promise.resolve(false)
        return
      }
      val mgr = AppWidgetManager.getInstance(ctx)
      if (!mgr.isRequestPinAppWidgetSupported) {
        promise.resolve(false)
        return
      }
      promise.resolve(mgr.requestPinAppWidget(component(widgetName), null, null))
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  /** 홈 화면에 이미 놓인 개수 */
  @ReactMethod
  fun count(widgetName: String, promise: Promise) {
    try {
      promise.resolve(AppWidgetManager.getInstance(ctx).getAppWidgetIds(component(widgetName)).size)
    } catch (e: Exception) {
      promise.resolve(0)
    }
  }
}
