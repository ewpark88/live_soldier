import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { formatDateKo } from '../utils/dateUtils';
import { nextMilestoneKey } from '../utils/roadmapUtils';

/**
 * 전역 로드맵 세로 타임라인.
 * 지난 마일스톤은 채워진 노드, 다음 마일스톤은 강조, 이후는 비활성.
 *
 * @param {Array} roadmap  buildRoadmap() 결과
 */
export default function RoadmapTimeline({ roadmap }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  if (!roadmap || roadmap.length === 0) return null;

  const nextKey = nextMilestoneKey(roadmap);

  return (
    <View style={s.wrap}>
      {roadmap.map((m, i) => {
        const isNext = m.key === nextKey;
        const last = i === roadmap.length - 1;
        const dotColor = m.done ? tc.primary : isNext ? tc.accent : tc.border;
        return (
          <View key={m.key} style={s.row}>
            {/* 좌측 라인+노드 */}
            <View style={s.railCol}>
              <View style={[s.dot, { backgroundColor: dotColor, borderColor: dotColor }, isNext && s.dotNext]}>
                <Text style={s.dotEmoji}>{m.emoji}</Text>
              </View>
              {!last && <View style={[s.line, { backgroundColor: m.done ? tc.primary : tc.border }]} />}
            </View>

            {/* 우측 내용 */}
            <View style={[s.content, last && { paddingBottom: 0 }]}>
              <View style={s.titleRow}>
                <Text style={[s.label, m.done && s.labelDone, isNext && s.labelNext]}>{m.label}</Text>
                {isNext ? (
                  <View style={s.ddayPill}>
                    <Text style={s.ddayPillText}>D-{m.dday}</Text>
                  </View>
                ) : m.done ? (
                  <Text style={s.doneMark}>완료</Text>
                ) : (
                  <Text style={s.ddayText}>D-{m.dday}</Text>
                )}
              </View>
              <Text style={s.date}>{formatDateKo(m.date)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  wrap: { marginTop: 4 },
  row: { flexDirection: 'row' },
  railCol: { width: 40, alignItems: 'center' },
  dot: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  dotNext: {
    shadowColor: tc.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 4,
  },
  dotEmoji: { fontSize: 15 },
  line: { width: 2.5, flex: 1, minHeight: 18, marginVertical: 2 },
  content: { flex: 1, paddingBottom: 18, paddingTop: 4, paddingLeft: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 15, fontWeight: '700', color: tc.text, flex: 1 },
  labelDone: { color: tc.textSecondary },
  labelNext: { color: tc.text },
  date: { fontSize: 12.5, color: tc.textSecondary, marginTop: 2 },
  ddayText: { fontSize: 13, fontWeight: '700', color: tc.textLight },
  doneMark: { fontSize: 12, fontWeight: '700', color: tc.primary },
  ddayPill: { backgroundColor: tc.accent, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  ddayPillText: { fontSize: 13, fontWeight: '800', color: tc.white },
});
