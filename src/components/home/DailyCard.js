import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../Card';
import { Txt } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp } from '../../theme/tokens';

/**
 * 오늘의 한마디 + 서브라인 (팁/상식).
 *
 * 순수 프레젠테이션이다 — 무엇을 보여줄지는 useDailyHero 가 날짜에 고정해서
 * 정한다. 여기서 랜덤을 돌리면 탭을 옮길 때마다 문구가 춤춘다.
 */
export default function DailyCard({ message, subline, sublineMeta }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  if (!message && !subline) return null;

  return (
    <Card>
      {message ? (
        <Txt role="bodyLg" style={{ fontWeight: '700' }}>{message}</Txt>
      ) : null}

      {subline ? (
        <View style={s.sub}>
          <View style={s.badge}>
            <Ionicons name={sublineMeta?.icon ?? 'bulb-outline'} size={13} color={tc.accentText} />
            <Txt role="micro" style={{ color: tc.accentText, fontWeight: '800' }}>
              {sublineMeta?.label ?? '오늘의 팁'}
            </Txt>
          </View>
          <Txt role="bodySm" tone="secondary" style={{ flex: 1 }}>{subline}</Txt>
        </View>
      ) : null}
    </Card>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    sub: { marginTop: sp.md, gap: sp.sm },
    badge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: sp.sm,
      paddingVertical: 3,
      borderRadius: r.pill,
      backgroundColor: tc.accentSoft,
    },
  });
