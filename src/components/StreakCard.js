import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Card from './Card';
import SectionTitle from './SectionTitle';
import { StatTile, Txt } from './ui';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp } from '../theme/tokens';

/**
 * 출석 스트릭 카드 — 현재/최고/누적 + 최근 7일 점 스트립.
 *
 * 월간 달력은 일부러 만들지 않았다. "며칠 연속인가"는 한 줄로 읽히면 충분하고,
 * EventCalendar 셀은 이미 사용/포상/할일/오늘/선택 5개 상태를 다룬다 — 여섯 번째
 * 신호를 얹으면 시각적 진창이 된다.
 *
 * 점 스트립은 정적 View 다. 진행 표현이 아니므로 애니메이션이 없다.
 */
export default function StreakCard({ streak, days = [], tier, usedFreeze }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  return (
    <Card>
      <SectionTitle icon={tier?.icon ?? 'flame'} tone="accent">
        출석 스트릭{tier?.label ? ` · ${tier.label}` : ''}
      </SectionTitle>

      <View style={s.strip}>
        {days.map((d) => (
          <View
            key={d.date}
            style={[
              s.dot,
              { backgroundColor: d.present ? tc.accent : tc.surfaceSunken },
              d.isToday && { borderWidth: 2, borderColor: tc.accent },
              d.isToday && !d.present && { backgroundColor: 'transparent' },
            ]}
          />
        ))}
      </View>

      <View style={s.stats}>
        <StatTile label="현재" value={streak?.current ?? 0} unit="일" tone="accent" countUp />
        <StatTile label="최고" value={streak?.best ?? 0} unit="일" countUp />
        <StatTile label="누적" value={streak?.total ?? 0} unit="일" countUp />
      </View>

      {usedFreeze ? (
        <Txt role="caption" tone="secondary" style={{ marginTop: sp.sm }}>
          하루를 놓쳤지만 스트릭 보호를 써서 이어졌어요. (2주에 1회)
        </Txt>
      ) : null}
    </Card>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    strip: { flexDirection: 'row', gap: sp.sm, marginTop: sp.md },
    dot: { flex: 1, height: 10, borderRadius: r.xs },
    stats: { flexDirection: 'row', gap: sp.sm, marginTop: sp.md },
  });
