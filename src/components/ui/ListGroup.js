import React from 'react';
import { StyleSheet, View } from 'react-native';
import Card from '../Card';
import Txt from './Txt';
import Divider from './Divider';
import { ROW_ICON } from './ListRow';
import { space as sp } from '../../theme/tokens';

/**
 * 묶음 리스트 — (선택) 라벨 + 카드 + 행들 + (선택) 각주.
 *
 *   <ListGroup label="데이터" footnote="* 이 기기에만 저장됩니다">
 *     <ListRow ... />
 *     <ListRow ... />
 *   </ListGroup>
 *
 * 설정 화면의 로컬 Group 을 승격했다. 예전엔 급여·전역·휴가가 같은 모양을
 * `<Card pad="none" style={{paddingHorizontal:0}}>` + 행 패딩 + 구분선 inset 으로
 * 각자 조립했고, 구분선 들여쓰기가 48·40·64 로 제각각이었다.
 *
 * 자식 행 사이에 구분선을 자동으로 넣고, 행의 좌우 패딩도 여기서 준다.
 * 바깥 세로 간격은 갖지 않는다 — 감싸는 <Section> 이 준다.
 *
 * @param inset  구분선 들여쓰기. 기본은 '아이콘 있는 행' 기준.
 */
export const GROUP_PAD = sp.lg;
export const GROUP_INSET = GROUP_PAD + ROW_ICON + sp.md;

export default function ListGroup({ label, footnote, inset = GROUP_INSET, children, style }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={style}>
      {label ? (
        <Txt role="label" tone="secondary" style={styles.label} maxFontSizeMultiplier={1.3}>
          {label}
        </Txt>
      ) : null}
      {/* overflow:'hidden' 은 쓰지 않는다 — iOS 에서 카드 그림자가 잘린다 */}
      <Card pad="none">
        {rows.map((row, i) => (
          <View key={row.key ?? i} style={styles.row}>
            {row}
            {i < rows.length - 1 ? (
              <Divider inset={Math.max(0, inset - GROUP_PAD)} />
            ) : null}
          </View>
        ))}
      </Card>
      {footnote ? (
        <Txt role="caption" tone="light" style={styles.footnote}>{footnote}</Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginLeft: sp.xs, marginBottom: sp.sm },
  row: { paddingHorizontal: GROUP_PAD },
  footnote: { marginTop: sp.sm, marginLeft: sp.xs },
});
