import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../Card';
import SectionTitle from '../SectionTitle';
import ProgressBar from '../ProgressBar';
import { Txt, AnimatedNumber, PressScale } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp, type as ty } from '../../theme/tokens';
import { formatDateKo } from '../../utils/dateUtils';

/**
 * 다음 마일스톤 — 진급·반환점·전역 100일 전 중 가장 가까운 것.
 *
 * 진행 표시는 ProgressBar(scaleX) 를 재사용한다. width:'%' 애니메이션은 금지다.
 */
export default function NextMilestone({ milestone, progress = 0, onPress }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  if (!milestone) return null;

  return (
    <Card onPress={onPress}>
      <SectionTitle
        icon="flag-outline"
        right={<Ionicons name="chevron-forward" size={18} color={tc.textLight} />}
      >
        다음 마일스톤
      </SectionTitle>

      <View style={s.row}>
        <View style={[s.badge, { backgroundColor: tc.accentSoft }]}>
          <Ionicons name={milestone.icon ?? 'ellipse'} size={20} color={tc.accentText} />
        </View>

        <View style={{ flex: 1 }}>
          <Txt role="bodyLg" style={{ fontWeight: '700' }} numberOfLines={1}>
            {milestone.label}
          </Txt>
          <Txt role="caption" tone="secondary">{formatDateKo(milestone.date)}</Txt>
        </View>

        <View style={s.dday}>
          <Txt role="caption" tone="secondary">D-</Txt>
          <AnimatedNumber
            value={Math.max(0, milestone.dday)}
            style={[ty.statValue, { color: tc.primary }]}
          />
        </View>
      </View>

      <View style={{ marginTop: sp.md }}>
        <ProgressBar progress={progress} height={6} delay={320} />
      </View>
    </Card>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: sp.md, marginTop: sp.md },
    badge: {
      width: 40, height: 40, borderRadius: r.sm,
      alignItems: 'center', justifyContent: 'center',
    },
    dday: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  });
