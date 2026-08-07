import React, { useMemo, useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import Card from '../components/Card';
import SectionTitle from '../components/SectionTitle';
import {
  Screen,
  AppHeader,
  Section,
  Chip,
  ListRow,
  Divider,
  Txt,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { BENEFIT_CATEGORIES, BENEFIT_DISCLAIMER } from '../constants/benefits';
import { useThemeColors } from '../theme/ThemeContext';
import { space as sp } from '../theme/tokens';
import { haptic } from '../utils/haptics';

export default function BenefitsScreen({ navigation }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const scrollRef = useRef(null);
  const offsets = useRef({});
  const [active, setActive] = useState(BENEFIT_CATEGORIES[0]?.key);

  const openUrl = (url) => {
    if (!url) return;
    haptic.light();
    Linking.openURL(url).catch(() =>
      Alert.alert('열 수 없음', '링크를 여는 중 문제가 발생했어요.')
    );
  };

  // 카테고리 칩을 누르면 해당 카드로 스크롤. 6개가 구분 없이 한 덩어리로
  // 이어지던 예전 목록에선 원하는 항목으로 갈 방법이 아예 없었다.
  const jumpTo = (key) => {
    setActive(key);
    const y = offsets.current[key];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 8, 0), animated: true });
  };

  return (
    <Screen
      standalone
      ad={AD_UNITS.SALARY_MIDDLE}
      scrollRef={scrollRef}
      header={
        <AppHeader
          title="군인 혜택 모음"
          subtitle="금융·교통·문화·자기계발 할인과 지원"
          back
        />
      }
    >
      <Section index={0} gap={sp.md}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
        >
          {BENEFIT_CATEGORIES.map((cat) => (
            <Chip
              key={cat.key}
              label={cat.label}
              icon={cat.icon}
              selected={active === cat.key}
              onPress={() => jumpTo(cat.key)}
            />
          ))}
        </ScrollView>
      </Section>

      {BENEFIT_CATEGORIES.map((cat, ci) => (
        <Section
          key={cat.key}
          index={ci + 1}
          onLayout={(e) => {
            offsets.current[cat.key] = e.nativeEvent.layout.y;
          }}
        >
          <Card>
            <SectionTitle icon={cat.icon}>{cat.label}</SectionTitle>

            <View style={s.rows}>
              {cat.items.map((it, i) => (
                <View key={it.title}>
                  <ListRow
                    title={it.title}
                    subtitle={it.desc}
                    onPress={it.url ? () => openUrl(it.url) : undefined}
                    right={
                      it.tag ? <Chip label={it.tag} size="sm" tone="accent" /> : undefined
                    }
                    chevron={false}
                    icon={it.url ? 'open-outline' : undefined}
                    iconTone="neutral"
                  />
                  {i < cat.items.length - 1 ? <Divider inset={48} /> : null}
                </View>
              ))}
            </View>
          </Card>
        </Section>
      ))}

      <Section index={BENEFIT_CATEGORIES.length + 1}>
        <Txt role="micro" tone="light">
          {BENEFIT_DISCLAIMER}
        </Txt>
      </Section>
    </Screen>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    chips: { gap: sp.sm, paddingRight: sp.lg },
    rows: { marginTop: sp.xs },
  });
