import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../Card';
import SectionTitle from '../SectionTitle';
import WeekStrip from './WeekStrip';
import { Txt, PressScale, Checkbox, Divider, Button } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { space as sp } from '../../theme/tokens';

/**
 * 이번 주 + 오늘 할 일 — 한 카드.
 *
 * 예전엔 '이번 주' 카드와 '오늘 할 일' 카드가 따로 있었고 둘 다 같은 할 일
 * 데이터를 다른 모양(점 / 목록)으로 보여줬다. 같은 질문("이번 주에 뭐 있지")의
 * 두 해상도라 한 카드로 묶는다. 홈 섹션이 6개 → 4개로 준다.
 *
 * "전체 보기"는 한 가지 모양으로 통일한다 — 제목 줄 오른쪽의 텍스트 버튼.
 * (예전엔 칩 / 셰브런 / 카드 전체 누름이 섞여 있었다)
 */
export default function ThisWeek({
  today, records, bonusRecords, todos = [], attendance, onToggle, onPressAll, onPressDay, max = 3,
}) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const items = useMemo(() => todos
    // 기간 일정은 시작일도 봐야 한다. endDate 만 보면 다음 달 휴가가 '오늘 할 일'에 뜬다.
    .filter((t) => !t.done && t.date && t.date <= today && (t.endDate ? t.endDate >= today : true))
    .sort((a, b) => a.date.localeCompare(b.date)), [todos, today]);

  const shown = items.slice(0, max);
  const rest = items.length - shown.length;

  const rangeLabel = useMemo(() => {
    const d = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)));
    const a = new Date(d); a.setDate(d.getDate() - d.getDay());
    const b = new Date(a); b.setDate(a.getDate() + 6);
    const f = (x) => `${x.getMonth() + 1}.${x.getDate()}`;
    return `${f(a)} – ${f(b)}`;
  }, [today]);

  return (
    <Card>
      <SectionTitle
        icon="calendar-outline"
        right={
          <PressScale onPress={onPressAll} haptic="light" style={s.allBtn} accessibilityRole="button" accessibilityLabel="일정 전체 보기">
            <Txt role="label" tone="primary">전체</Txt>
            <Ionicons name="chevron-forward" size={14} color={tc.primary} />
          </PressScale>
        }
      >
        이번 주 <Txt role="caption" tone="light" numeric>{rangeLabel}</Txt>
      </SectionTitle>

      <View style={s.strip}>
        <WeekStrip
          today={today}
          records={records}
          bonusRecords={bonusRecords}
          todos={todos}
          attendance={attendance}
          onPress={onPressDay}
        />
      </View>

      <Divider spacing={sp.md} />

      <Txt role="label" tone="secondary" style={s.todayLabel}>오늘 할 일</Txt>
      {shown.length === 0 ? (
        <View style={s.empty}>
          <Txt role="bodySm" tone="secondary" style={{ flex: 1 }}>
            오늘은 등록된 일정이 없어요.
          </Txt>
          <Button title="일정 추가" icon="add" size="sm" variant="secondary" onPress={onPressAll} />
        </View>
      ) : (
        <View style={s.list}>
          {shown.map((t) => {
            // 진행 중인 기간 일정(혹한기 3일차 등)을 '지난 일정'으로 표시하지 않는다
            const overdue = (t.endDate || t.date) < today;
            return (
              <View key={t.id} style={s.row}>
                <Checkbox checked={false} onPress={() => onToggle && onToggle(t.id)} label={`${t.title} 완료`} />
                <View style={{ flex: 1 }}>
                  <Txt role="bodyLg" style={{ fontWeight: '600' }} numberOfLines={1}>
                    {t.title}
                  </Txt>
                  {overdue ? (
                    <Txt role="caption" tone="danger">지난 일정 · {t.date.slice(5).replace('-', '.')}</Txt>
                  ) : null}
                </View>
              </View>
            );
          })}
          {rest > 0 ? (
            <Txt role="caption" tone="light">외 {rest}건 더 있어요</Txt>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    allBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingLeft: sp.md },
    strip: { marginTop: sp.sm },
    todayLabel: { marginBottom: sp.xs },
    empty: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    list: { gap: sp.xxs },
    row: { flexDirection: 'row', alignItems: 'center', gap: sp.xs, minHeight: 44 },
  });
