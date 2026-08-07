import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import ThemePreviewCard from '../components/ThemePreviewCard';
import { Screen, AppHeader, Section, Grid, Chip, Txt } from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { useTheme, useThemeColors } from '../theme/ThemeContext';
import { resolvePalette, effectiveScheme } from '../theme/palettes';
import { loadMilitaryInfo, loadRankPromotions, unlockTheme } from '../utils/storage';
import { buildRoadmap } from '../utils/roadmapUtils';
import { haptic } from '../utils/haptics';
import { space as sp } from '../theme/tokens';

const BRIGHTNESS = [
  { key: 'system', label: '시스템', icon: 'phone-portrait-outline' },
  { key: 'light', label: '라이트', icon: 'sunny-outline' },
  { key: 'dark', label: '다크', icon: 'moon-outline' },
];

/**
 * 테마 피커.
 *
 * 적용 버튼이 없다 — 탭하면 앱 전체가 즉시 재도색되고, 그게 곧 라이브
 * 프리뷰다. 잠긴 테마도 목록에 보인다.
 *
 * 해금은 "복무 마일스톤" 기준이다 (스트릭이 아니라). 훈련·당직으로 폰을 못
 * 만지는 날이 실제로 있는 사용자에게 접속 연속성을 요구하는 건, 가장 고생하는
 * 사람을 정확히 겨냥해 벌을 주는 설계다. 진급·전역은 반드시 오고 날짜도 이미
 * 알고 있어서 불안이 아니라 기대를 만든다.
 */
export default function ThemeScreen() {
  const tc = useThemeColors();
  const {
    themeId, mode, scheme, schemeForced, themes, unlocked,
    setMode, setThemeId, markThemeIntroSeen, setUnlocked,
  } = useTheme();

  const [roadmap, setRoadmap] = useState([]);

  useEffect(() => { markThemeIntroSeen(); }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const info = await loadMilitaryInfo();
        if (!info) return;
        const promos = await loadRankPromotions(info.enlistDate);
        if (alive) setRoadmap(buildRoadmap(info, promos));
      })();
      return () => { alive = false; };
    }, [])
  );

  /** 로드맵이 이 잠금 조건을 충족했는가 (간부는 altKey 로 대체) */
  const lockMet = useCallback((lock) => {
    if (!lock) return true;
    const keys = [lock.key, lock.altKey].filter(Boolean);
    return roadmap.some((mi) => keys.includes(mi.key) && mi.done);
  }, [roadmap]);

  /** 해금 판정 — 저장된 목록 ∪ 로드맵 조건 */
  const isUnlocked = useCallback(
    (t) => !t.lock || unlocked.includes(t.id) || lockMet(t.lock),
    [unlocked, lockMet]
  );

  // 로드맵으로 새로 열린 테마는 영구 기록한다 (단조 증가 — 회수 없음)
  useEffect(() => {
    if (!roadmap.length) return;
    const fresh = themes.filter(
      (t) => t.lock && !unlocked.includes(t.id) && lockMet(t.lock)
    );
    if (!fresh.length) return;
    (async () => {
      for (const t of fresh) await unlockTheme(t.id);
      setUnlocked((prev) => [...new Set([...prev, ...fresh.map((t) => t.id)])]);
    })();
  }, [roadmap, themes, unlocked, lockMet]);

  const handlePick = (t) => {
    if (t.id === themeId) return;
    haptic.select();
    setThemeId(t.id);
  };

  const cards = useMemo(
    () => themes.map((t) => ({
      theme: t,
      // 카드는 그 테마가 실제로 보여줄 scheme 으로 미리보기한다
      palette: resolvePalette(t.id, effectiveScheme(t.id, scheme)),
      darkOnly: !t.schemes.includes('light'),
      unlockedNow: isUnlocked(t),
    })),
    [themes, scheme, isUnlocked]
  );

  return (
    <Screen
      standalone
      ad={AD_UNITS.SALARY_MIDDLE}
      header={<AppHeader title="테마" subtitle="앱 전체 색을 바꿉니다" back />}
    >
      {/* 밝기 */}
      <Section index={0}>
        <Card>
          <View style={s.brightRow}>
            {BRIGHTNESS.map((b) => (
              <Chip
                key={b.key}
                label={b.label}
                icon={b.icon}
                size="md"
                selected={mode === b.key}
                onPress={() => setMode(b.key)}
                style={b.key === 'light' && schemeForced ? s.dim : undefined}
              />
            ))}
          </View>
          {schemeForced ? (
            <Txt role="caption" tone="light" style={{ marginTop: sp.sm }}>
              이 테마는 다크 전용이라 항상 어둡게 표시됩니다. 밝기 설정은 그대로 저장돼요.
            </Txt>
          ) : null}
        </Card>
      </Section>

      {/* 테마 그리드 */}
      <Section index={1}>
        <Grid columns={2} gap={sp.md}>
          {cards.map(({ theme, palette, darkOnly, unlockedNow }) => (
            <ThemePreviewCard
              key={theme.id}
              palette={palette}
              name={theme.name}
              desc={theme.desc}
              badge={darkOnly ? '다크 전용' : null}
              locked={!unlockedNow}
              lockLabel={theme.lock?.label}
              selected={theme.id === themeId}
              onPress={() => handlePick(theme)}
            />
          ))}
        </Grid>
      </Section>

      <Section index={2}>
        <Txt role="caption" tone="light">
          * 잠긴 테마는 복무 마일스톤에 도달하면 열립니다. 한 번 열린 테마는
          프로필을 바꾸거나 데이터를 초기화해도 사라지지 않아요.
        </Txt>
      </Section>
    </Screen>
  );
}

const s = StyleSheet.create({
  brightRow: { flexDirection: 'row', gap: sp.sm },
  dim: { opacity: 0.45 },
});
