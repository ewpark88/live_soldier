import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../Card';
import SectionTitle from '../SectionTitle';
import CircularGauge from '../CircularGauge';
import { Txt, AnimatedNumber } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { space as sp, type as ty } from '../../theme/tokens';
import { formatDateKo } from '../../utils/dateUtils';

/**
 * 다음 마일스톤 — 진급·반환점·전역 100일 전 중 가장 가까운 것.
 *
 * `progress` 는 **직전 마일스톤 → 다음 마일스톤 구간**의 진행률이다
 * (`roadmapUtils.milestoneProgress`). 예전에는 전체 복무 진행률이 들어와서,
 * 일병을 달아 목표가 상병으로 바뀌어도 바가 리셋되지 않고 계속 차기만 했다.
 *
 * 표현도 가로 바에서 **아이콘을 감싼 링**으로 바꿨다. 구간 진행률은 "이만큼
 * 남았다"는 이야기라 원형이 훨씬 잘 맞는다 — 카드 하나에 작은 카운트다운이
 * 하나 더 생기는 셈이다.
 */
const RING = 52;

export default function NextMilestone({ milestone, progress = 0, onPress }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  if (!milestone) return null;

  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <Card onPress={onPress}>
      <SectionTitle
        icon="flag-outline"
        right={<Ionicons name="chevron-forward" size={18} color={tc.textLight} />}
      >
        다음 마일스톤
      </SectionTitle>

      <View style={s.row}>
        <CircularGauge
          progress={progress}
          size={RING}
          stroke={4}
          trackColor={tc.progressBg}
          fillColor={tc.accent}
          delay={320}
        >
          <Ionicons name={milestone.icon ?? 'ellipse'} size={20} color={tc.accentText} />
        </CircularGauge>

        <View style={{ flex: 1 }}>
          <Txt role="bodyLg" style={{ fontWeight: '700' }} numberOfLines={1}>
            {milestone.label}
          </Txt>
          <Txt role="caption" tone="secondary">
            {formatDateKo(milestone.date)} · 이 구간 {pct}%
          </Txt>
        </View>

        <View style={s.dday}>
          <Txt role="caption" tone="secondary">D-</Txt>
          <AnimatedNumber
            value={Math.max(0, milestone.dday)}
            style={[ty.statValue, { color: tc.primary }]}
          />
        </View>
      </View>
    </Card>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: sp.md, marginTop: sp.md },
    dday: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  });
