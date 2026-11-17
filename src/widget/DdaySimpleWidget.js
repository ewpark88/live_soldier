import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

/**
 * 홈 위젯 '심플' (2×1) — 큰 D-Day 숫자 + 진행 막대 + 한 줄 캡션. 그게 전부다.
 *
 * '기본' 위젯이 정보를 다 담는 쪽이라면, 이건 폰을 켤 때 숫자 하나만 보고 싶은
 * 사람을 위한 것이다. 계급·이름·전역일은 일부러 뺐다.
 *
 * 위젯 렌더러 규칙 (DischargeWidget 과 같다):
 *  - width 는 숫자·'match_parent'·'wrap_content' 만 받는다 — 막대는 flex 두 칸으로 나눈다
 *  - 색은 props.theme(widgetData.getWidgetTheme) 가 주고, 없을 때만 폴백
 */
const FALLBACK = {
  bg: '#2E5B4F',
  accent: '#F5C842',
  text: 'rgba(255,255,255,0.85)',
  muted: 'rgba(255,255,255,0.7)',
  track: 'rgba(255,255,255,0.22)',
};

export function DdaySimpleWidget(props = {}) {
  const { empty, ddayText, progress = 0, endText } = props;
  const t = { ...FALLBACK, ...(props.theme || {}) };

  const rootStyle = {
    height: 'match_parent',
    width: 'match_parent',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.bg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  };

  if (empty) {
    return (
      <FlexWidget style={rootStyle} clickAction="OPEN_APP">
        <TextWidget text="전역까지" style={{ fontSize: 13, color: t.accent, fontWeight: 'bold' }} />
        <TextWidget text="눌러서 정보 입력" style={{ fontSize: 11, color: t.muted, marginTop: 4 }} />
      </FlexWidget>
    );
  }

  const pct = Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0;

  return (
    <FlexWidget style={rootStyle} clickAction="OPEN_APP">
      <TextWidget
        text={ddayText}
        style={{ fontSize: 30, fontWeight: 'bold', color: t.accent }}
      />
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 5,
          backgroundColor: t.track,
          borderRadius: 3,
          marginTop: 2,
          flexDirection: 'row',
        }}
      >
        {pct > 0 ? (
          <FlexWidget style={{ flex: pct, height: 5, backgroundColor: t.accent, borderRadius: 3 }} />
        ) : null}
        {pct < 100 ? <FlexWidget style={{ flex: 100 - pct, height: 5 }} /> : null}
      </FlexWidget>
      <TextWidget
        text={`${endText || '전역'}까지 ${pct}% 왔어요`}
        style={{ fontSize: 10, color: t.muted, marginTop: 4 }}
      />
    </FlexWidget>
  );
}
