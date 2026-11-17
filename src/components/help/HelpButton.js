import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import PressScale from '../ui/PressScale';
import { useThemeColors } from '../../theme/ThemeContext';
import HelpSheet from './HelpSheet';

/**
 * 화면 우상단 [?] — 누르면 그 화면의 도움말 시트가 뜬다.
 *
 *   <AppHeader title="알림" back right={<HelpButton topic="notifications" />} />
 *
 * 아이콘만 있는 버튼이라 접근성 라벨을 단다. 보이는 아이콘 26, 누르는 영역 44×44.
 *
 * @param topic   constants/guides 의 주제 id
 * @param onHero  히어로 위 — heroText 색 (흰색 하드코딩 금지: 라이트 히어로는 밝다)
 */
export default function HelpButton({ topic, onHero = false, style }) {
  const tc = useThemeColors();
  const nav = useNavigation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <PressScale
        onPress={() => setOpen(true)}
        haptic="light"
        scale={0.9}
        hitSlop={4}
        style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, style]}
        accessibilityRole="button"
        accessibilityLabel="도움말 — 이 화면 사용법 보기"
      >
        <Ionicons
          name="help-circle-outline"
          size={26}
          color={onHero ? tc.heroText : tc.textSecondary}
        />
      </PressScale>
      <HelpSheet
        visible={open}
        onClose={() => setOpen(false)}
        topic={topic}
        onOpenGuide={() => nav.navigate('guide')}
      />
    </>
  );
}
