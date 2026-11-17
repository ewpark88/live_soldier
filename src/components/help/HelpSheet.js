import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet from '../motion/BottomSheet';
import Button from '../ui/Button';
import Txt from '../ui/Txt';
import GuideBody from './GuideBody';
import { guideTopic } from '../../constants/guides';
import { loadPersonnelType } from '../../utils/storage';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp } from '../../theme/tokens';

/**
 * [?] 를 눌렀을 때 뜨는 도움말 시트 — 지금 화면의 사용법.
 *
 * 시트는 그 화면 위에서 열리므로 '이 화면으로 가기'는 없다. 대신 아래에
 * '전체 가이드' 버튼을 둬서 다른 주제로 넘어갈 수 있게 한다.
 *
 * @param topic        constants/guides 의 주제 id
 * @param onOpenGuide  '전체 가이드' — 부모가 navigation 을 갖고 있으므로 위임한다
 */
export default function HelpSheet({ visible, onClose, topic, onOpenGuide }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(), []);
  const [pt, setPt] = useState(undefined);

  // 신분에 따라 문구가 달라진다 — 열 때마다 읽는다 (그새 프로필이 바뀌었을 수 있다)
  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    loadPersonnelType()
      .then((v) => { if (alive) setPt(v ?? null); })
      .catch(() => { if (alive) setPt(null); });
    return () => { alive = false; };
  }, [visible]);

  const g = pt === undefined ? null : guideTopic(topic, pt);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightRatio={0.85}>
      {g ? (
        <>
          <View style={s.head}>
            <View style={[s.icon, { backgroundColor: tc.primarySoft }]}>
              <Ionicons name={g.icon} size={22} color={tc.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt role="caption" tone="secondary">도움말</Txt>
              <Txt role="title" numberOfLines={2}>{g.title}</Txt>
            </View>
          </View>

          <View style={[s.summary, { backgroundColor: tc.surfaceSunken }]}>
            <Ionicons name="bulb-outline" size={18} color={tc.primary} style={{ marginTop: 2 }} />
            <Txt role="bodySm" style={{ flex: 1 }}>{g.summary}</Txt>
          </View>

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.scrollBody}
            showsVerticalScrollIndicator={false}
          >
            <GuideBody sections={g.sections} />
          </ScrollView>

          <View style={s.actions}>
            {onOpenGuide ? (
              <Button
                title="전체 가이드"
                icon="book-outline"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => { onClose?.(); onOpenGuide(); }}
              />
            ) : null}
            <Button title="알겠어요" style={{ flex: 1 }} onPress={onClose} />
          </View>
        </>
      ) : (
        <View style={s.loading} />
      )}
    </BottomSheet>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    icon: { width: 44, height: 44, borderRadius: r.md, alignItems: 'center', justifyContent: 'center' },
    summary: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: sp.sm,
      marginTop: sp.lg,
      padding: sp.md,
      borderRadius: r.md,
    },
    scroll: { flexShrink: 1, marginTop: sp.lg },
    scrollBody: { gap: sp.xl, paddingBottom: sp.sm },
    actions: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
    loading: { height: 160 },
  });
