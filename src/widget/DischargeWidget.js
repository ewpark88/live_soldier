import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

/**
 * 전역 D-Day 홈 위젯 UI.
 * react-native-android-widget의 FlexWidget/TextWidget으로 구성.
 * (일반 react-native 컴포넌트가 아니라 위젯 전용 렌더러로 그려진다)
 */
const BG = '#2E5B4F';
const ACCENT = '#F5C842';

export function DischargeWidget(props = {}) {
  const { empty, name, ddayText, progress = 0, rank, dischargeText } = props;

  const rootStyle = {
    height: 'match_parent',
    width: 'match_parent',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  };

  // 입대 정보 미입력 상태
  if (empty) {
    return (
      <FlexWidget style={rootStyle} clickAction="OPEN_APP">
        <TextWidget text="전역까지" style={{ fontSize: 13, color: '#FFFFFF' }} />
        <TextWidget
          text="입대 정보를 입력하세요"
          style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6 }}
        />
      </FlexWidget>
    );
  }

  const pct = Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : 0;

  return (
    <FlexWidget style={rootStyle} clickAction="OPEN_APP">
      {/* 상단: 이름 + 계급/구분 */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text={name || '전역까지'}
          style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}
        />
        <TextWidget
          text={rank || ''}
          style={{ fontSize: 12, color: ACCENT, fontWeight: 'bold' }}
        />
      </FlexWidget>

      {/* 중앙: D-Day */}
      <TextWidget
        text={ddayText}
        style={{ fontSize: 38, fontWeight: 'bold', color: ACCENT, marginTop: 2 }}
      />

      {/* 하단: 진행률 바 + 전역일 */}
      <FlexWidget
        style={{
          width: 'match_parent',
          height: 6,
          backgroundColor: 'rgba(255,255,255,0.22)',
          borderRadius: 3,
          marginTop: 4,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <FlexWidget
          style={{
            width: `${pct}%`,
            height: 6,
            backgroundColor: ACCENT,
            borderRadius: 3,
          }}
        />
      </FlexWidget>

      <TextWidget
        text={`복무 ${pct}% · ${dischargeText || ''}`}
        style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}
      />
    </FlexWidget>
  );
}
