import React, { Children, useState } from 'react';
import { View } from 'react-native';
import { space as sp } from '../../theme/tokens';

/**
 * 균등 그리드.
 *
 * 퍼센트 폭 + gap 조합(width:'47.5%' + gap:8, width:'30%' + gap:10)은 절대
 * 100% 로 안 떨어져서 오른쪽에 너덜너덜한 자투리가 남는다. 그래서 컨테이너
 * 폭을 실제로 재서 셀 폭을 계산한다 — 반올림 오차가 끼어들 여지가 없다.
 *
 *   cellWidth = (W - gap * (columns - 1)) / columns
 */
export default function Grid({ columns = 2, gap = sp.sm, style, children }) {
  const [w, setW] = useState(0);
  const items = Children.toArray(children);

  const cell = w > 0 ? (w - gap * (columns - 1)) / columns : 0;

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ flexDirection: 'row', flexWrap: 'wrap', gap }, style]}
    >
      {items.map((child, i) => (
        // 폭을 재기 전(첫 프레임)엔 0폭으로 두고, 잰 다음에 그린다.
        <View key={i} style={{ width: cell || undefined, opacity: w ? 1 : 0 }}>
          {child}
        </View>
      ))}
    </View>
  );
}
