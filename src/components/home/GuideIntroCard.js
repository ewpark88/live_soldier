import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, PressScale, Txt } from '../ui';
import { useThemeColors } from '../../theme/ThemeContext';
import { radius as r, space as sp } from '../../theme/tokens';

/**
 * 홈 '처음이세요?' 카드 — 가이드를 열거나 닫을 때까지 한 번만 보인다.
 *
 * 새 섹션을 상시로 늘리지 않으려고(디자인 시스템 §홈 구성) 닫으면 영영 사라진다.
 * 다시 보고 싶으면 화면마다의 [?] 와 '내 정보 → 사용 가이드'가 있다.
 */
export default function GuideIntroCard({ onOpenGuide, onOpenWidgets, onClose }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(), []);

  return (
    <Card variant="flat" style={{ backgroundColor: tc.primarySoft }}>
      <View style={s.head}>
        <View style={[s.icon, { backgroundColor: tc.card }]}>
          <Ionicons name="sparkles-outline" size={22} color={tc.primary} />
        </View>
        <View style={{ flex: 1, gap: sp.xxs }}>
          <Txt role="section">처음이세요? 3분이면 충분해요</Txt>
          <Txt role="caption" tone="secondary">
            주요 기능 사용법을 차근차근 알려드려요. 모르는 화면에선 오른쪽 위 물음표를 눌러 보세요.
          </Txt>
        </View>
        <PressScale
          onPress={onClose}
          haptic="light"
          hitSlop={8}
          style={s.close}
          accessibilityRole="button"
          accessibilityLabel="안내 닫기"
        >
          <Ionicons name="close" size={20} color={tc.textSecondary} />
        </PressScale>
      </View>
      <View style={s.actions}>
        <Button title="사용 가이드" icon="book-outline" size="sm" style={{ flex: 1 }} onPress={onOpenGuide} />
        {Platform.OS === 'android' ? (
          <Button
            title="홈 화면 위젯"
            icon="apps-outline"
            size="sm"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={onOpenWidgets}
          />
        ) : null}
      </View>
    </Card>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: sp.md },
    icon: { width: 40, height: 40, borderRadius: r.md, alignItems: 'center', justifyContent: 'center' },
    // 음수 마진 금지(§3) — 44 터치 영역을 그대로 둔다
    close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    actions: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },
  });
