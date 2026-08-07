import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../Card';
import SectionTitle from '../SectionTitle';
import { Txt, PressScale, Chip, EmptyState } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp } from '../../theme/tokens';
import { formatDate } from '../../utils/dateUtils';

/**
 * 오늘 할 일 — 오늘 + 기한이 지난 미완료만.
 *
 * 홈에서 "오늘 뭐가 있지"를 스크롤 없이 답해주는 자리다. 전체 목록은 캘린더
 * 탭이 갖고, 여기선 최대 3개까지만 보여준다.
 */
export default function TodayTodos({ todos = [], onToggle, onPressAll, max = 3 }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const items = useMemo(() => {
    const today = formatDate(new Date());
    return todos
      .filter((t) => !t.done && t.date && (t.endDate ? t.endDate >= today : t.date <= today))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [todos]);

  const shown = items.slice(0, max);
  const rest = items.length - shown.length;

  return (
    <Card>
      <SectionTitle
        icon="checkbox-outline"
        right={
          <Chip label="전체" icon="chevron-forward" size="sm" onPress={onPressAll} />
        }
      >
        오늘 할 일
      </SectionTitle>

      {shown.length === 0 ? (
        <View style={{ paddingVertical: sp.md }}>
          <EmptyState
            compact
            icon="sunny-outline"
            title="오늘은 등록된 일정이 없어요"
            desc="훈련·휴가·검정 일정을 미리 넣어두면 알림으로 알려드려요."
            action={{ label: '일정 추가', icon: 'add', onPress: onPressAll }}
          />
        </View>
      ) : (
        <View style={s.list}>
          {shown.map((t) => {
            const overdue = t.date < formatDate(new Date());
            return (
              <PressScale
                key={t.id}
                onPress={() => onToggle && onToggle(t.id)}
                haptic="medium"
                scale={0.985}
                style={s.row}
              >
                <View style={[s.box, { borderColor: tc.border }]}>
                  <Ionicons name="ellipse-outline" size={17} color={tc.textLight} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt role="bodyLg" style={{ fontWeight: '600' }} numberOfLines={1}>
                    {t.title}
                  </Txt>
                  {overdue ? (
                    <Txt role="micro" tone="danger">지난 일정 · {t.date.slice(5).replace('-', '.')}</Txt>
                  ) : null}
                </View>
              </PressScale>
            );
          })}

          {rest > 0 ? (
            <Txt role="caption" tone="light" style={{ marginTop: sp.xs }}>
              외 {rest}건 더 있어요
            </Txt>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    list: { marginTop: sp.md, gap: sp.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: sp.md, minHeight: 40 },
    box: {
      width: 26, height: 26, borderRadius: r.xs,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: tc.surfaceSunken,
    },
  });
