import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { BENEFIT_DISCLAIMER, CADRE_ASK_NOTE, benefitsFor } from '../constants/benefits';
import { isAlternative, isOfficer, termsFor } from '../constants/serviceTerms';
import { loadPersonnelType } from '../utils/storage';
import { useThemeColors } from '../theme/ThemeContext';
import { space as sp } from '../theme/tokens';
import { haptic } from '../utils/haptics';

export default function BenefitsScreen({ navigation }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const scrollRef = useRef(null);
  const offsets = useRef({});
  // 신분 — 간부는 병사 전용 항목이 빠지고 애매한 항목엔 '판매처 문의', 대체복무는 해당 항목만
  const [pt, setPt] = useState(null);
  useEffect(() => {
    let alive = true;
    loadPersonnelType().then((v) => { if (alive) setPt(v); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const categories = useMemo(() => benefitsFor(pt), [pt]);
  const t = termsFor(pt);
  const [active, setActive] = useState(null);
  const activeKey = active ?? categories[0]?.key;

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
      ad={AD_UNITS.REFERENCE_BOTTOM}
      scrollRef={scrollRef}
      header={
        <AppHeader
          title={t.benefitsTitle}
          subtitle={categories.length === 0
            ? '해당하는 혜택이 아직 없어요'
            : isAlternative(pt)
              ? '복무 중 받을 수 있는 지원'
              : isOfficer(pt)
                ? '간부 적용 여부가 애매한 항목은 판매처 문의 표시'
                : '금융·교통·문화·자기계발 할인과 지원'}
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
          {categories.map((cat) => (
            <Chip
              key={cat.key}
              label={cat.label}
              icon={cat.icon}
              selected={activeKey === cat.key}
              onPress={() => jumpTo(cat.key)}
            />
          ))}
        </ScrollView>
      </Section>

      {categories.length === 0 ? (
        <Section index={1}>
          <Card>
            <Txt role="body" tone="secondary">
              이 복무 형태에 맞는 혜택 정보를 준비 중이에요. 복무 기관·근무처의 안내를 확인해 주세요.
            </Txt>
          </Card>
        </Section>
      ) : null}

      {categories.map((cat, ci) => (
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
                  {it.ask ? (
                    // 간부에게 해당하는지 시설·기관마다 달라 단정하지 않는다
                    <View style={[s.askRow, it.url ? s.askInset : null]}>
                      <Ionicons name="help-circle-outline" size={14} color={tc.textSecondary} />
                      <Txt role="micro" tone="secondary">{CADRE_ASK_NOTE}</Txt>
                    </View>
                  ) : null}
                  {i < cat.items.length - 1 ? <Divider inset={48} /> : null}
                </View>
              ))}
            </View>
          </Card>
        </Section>
      ))}

      <Section index={Math.max(categories.length, 1) + 1}>
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
    askRow: { flexDirection: 'row', alignItems: 'center', gap: sp.xs, marginTop: -sp.sm, paddingBottom: sp.md },
    askInset: { paddingLeft: 48 },   // 아이콘 있는 행은 제목 시작선에 맞춘다 (Divider inset 과 같다)
  });
