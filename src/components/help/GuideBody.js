import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Txt from '../ui/Txt';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp } from '../../theme/tokens';

/**
 * 가이드 주제 본문 — constants/guides.js 의 sections 를 그린다.
 * 도움말 시트(HelpSheet)와 가이드 화면(GuideScreen)이 같은 본문을 쓴다.
 *
 *  - steps → 번호 원 + 문장 (순서가 있는 것)
 *  - tips  → 체크 아이콘 + 문장 (순서가 없는 것)
 *  - body  → 그냥 문단
 *
 * 바깥 간격은 갖지 않는다 — 감싸는 쪽(Section · 시트)이 준다.
 * @param renderSection  (content, i) => node — 섹션마다 카드로 감싸고 싶을 때 (가이드 화면)
 */
export default function GuideBody({ sections = [], renderSection }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(), []);

  return sections.map((sec, i) => {
    const content = (
      <View style={s.sec}>
        {sec.title ? <Txt role="section">{sec.title}</Txt> : null}
        {sec.body ? <Txt role="body" tone="secondary">{sec.body}</Txt> : null}
        {sec.steps?.length ? (
          <View style={s.list}>
            {sec.steps.map((line, n) => (
              <View key={n} style={s.row} accessible accessibilityLabel={`${n + 1}단계. ${line}`}>
                <View style={[s.num, { backgroundColor: tc.primarySoft }]}>
                  <Txt role="caption" tone="primary" style={s.numText} maxFontSizeMultiplier={1.2}>
                    {n + 1}
                  </Txt>
                </View>
                <Txt role="body" style={s.line}>{line}</Txt>
              </View>
            ))}
          </View>
        ) : null}
        {sec.tips?.length ? (
          <View style={s.list}>
            {sec.tips.map((line, n) => (
              <View key={n} style={s.row}>
                <Ionicons name="checkmark-circle" size={18} color={tc.success} style={s.tipIcon} />
                <Txt role="body" style={s.line}>{line}</Txt>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
    return (
      <React.Fragment key={sec.title ?? i}>
        {renderSection ? renderSection(content, i) : content}
      </React.Fragment>
    );
  });
}

const makeStyles = () =>
  StyleSheet.create({
    sec: { gap: sp.sm },
    list: { gap: sp.sm },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: sp.sm },
    num: {
      width: 22,
      height: 22,
      borderRadius: r.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    numText: { fontWeight: '800' },
    tipIcon: { marginTop: 2 },
    line: { flex: 1 },
  });
