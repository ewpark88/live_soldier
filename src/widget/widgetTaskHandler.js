import React from 'react';
import { DischargeWidget } from './DischargeWidget';
import { getWidgetData } from './widgetData';

/**
 * 위젯 태스크 핸들러 (헤드리스).
 * 위젯 추가/주기적 업데이트/리사이즈 시 호출되어 최신 데이터로 위젯을 렌더한다.
 */
const nameToWidget = {
  Discharge: DischargeWidget,
};

export async function widgetTaskHandler(props) {
  try {
    const widgetName = props.widgetInfo?.widgetName;
    const Widget = nameToWidget[widgetName];
    if (!Widget) return;

    switch (props.widgetAction) {
      case 'WIDGET_ADDED':
      case 'WIDGET_UPDATE':
      case 'WIDGET_RESIZED': {
        const data = await getWidgetData();
        props.renderWidget(<Widget {...data} />);
        break;
      }
      // WIDGET_CLICK은 clickAction="OPEN_APP"으로 앱이 열리므로 별도 처리 불필요
      case 'WIDGET_DELETED':
      default:
        break;
    }
  } catch {
    // 헤드리스 위젯 태스크에서의 오류가 앱/태스크를 중단시키지 않도록 무시
  }
}
