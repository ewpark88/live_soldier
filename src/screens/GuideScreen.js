import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  Screen, AppHeader, Section, Card, ListGroup, ListRow, Button, Txt,
} from '../components/ui';
import GuideBody from '../components/help/GuideBody';
import { GUIDE_GROUPS, guideTopic, guideTopics } from '../constants/guides';
import { loadPersonnelType } from '../utils/storage';
import { markGuideIntroSeen } from '../utils/guideFlags';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp } from '../theme/tokens';

/** 탭 안에 있는 라우트 — 루트 스택에서는 'tabs' 를 거쳐야 닿는다 (버블링은 위로만 간다) */
const TAB_ROUTES = new Set(['home', 'calendar', 'salary', 'settings']);

/**
 * 사용 가이드 — 루트 스택 'guide'.
 *
 *   navigate('guide')                    → 주제 목록
 *   navigate('guide', { topic: 'leave' }) → 주제 상세
 *
 * 화면 하나가 두 모드를 갖는다. 목록에서 주제를 누르면 push 로 상세가 쌓여서
 * 하드웨어 뒤로가기가 목록으로 돌아온다. 본문은 [?] 시트와 같은 GuideBody.
 */
export default function GuideScreen({ navigation, route }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(), []);
  const topicId = route?.params?.topic ?? null;
  const [pt, setPt] = useState(undefined);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadPersonnelType()
        .then((v) => { if (alive) setPt(v ?? null); })
        .catch(() => { if (alive) setPt(null); });
      // 가이드를 한 번이라도 열었으면 홈의 '처음이세요?' 카드는 다시 띄우지 않는다
      markGuideIntroSeen();
      return () => { alive = false; };
    }, [])
  );

  const goTo = (target) => {
    if (!target) return;
    const params = { ...(target.params || {}), ts: Date.now() };
    if (TAB_ROUTES.has(target.name)) navigation.navigate('tabs', { screen: target.name, params });
    else navigation.navigate(target.name, params);
  };

  if (pt === undefined) {
    return <Screen scroll={false} standalone header={<AppHeader title="사용 가이드" back />} />;
  }

  /* ── 상세 ── */
  if (topicId) {
    const g = guideTopic(topicId, pt);
    const all = guideTopics(pt);
    const idx = all.findIndex((x) => x.id === topicId);
    const next = idx >= 0 ? all[idx + 1] : null;

    if (!g) {
      return (
        <Screen standalone header={<AppHeader title="사용 가이드" back />}>
          <Section index={0}>
            <Card>
              <Txt role="body" tone="secondary">이 복무 유형에는 해당하지 않는 기능이에요.</Txt>
            </Card>
          </Section>
        </Screen>
      );
    }

    return (
      <Screen standalone header={<AppHeader title={g.title} subtitle="사용 가이드" back />}>
        <Section index={0}>
          <Card style={{ backgroundColor: tc.primarySoft }} variant="flat">
            <View style={s.summaryRow}>
              <View style={[s.bigIcon, { backgroundColor: tc.card }]}>
                <Ionicons name={g.icon} size={26} color={tc.primary} />
              </View>
              <Txt role="bodyLg" style={{ flex: 1, fontWeight: '700' }}>{g.summary}</Txt>
            </View>
          </Card>
        </Section>

        <GuideBody
          sections={g.sections}
          renderSection={(content, i) => (
            <Section index={i + 1}>
              <Card>{content}</Card>
            </Section>
          )}
        />

        <Section index={g.sections.length + 1}>
          <View style={s.footer}>
            {g.route ? (
              <Button
                title="이 화면으로 가기"
                icon="arrow-forward"
                full
                onPress={() => goTo(g.route)}
              />
            ) : null}
            {next ? (
              <Button
                title={`다음: ${next.title}`}
                variant="secondary"
                iconRight="chevron-forward"
                full
                onPress={() => navigation.replace('guide', { topic: next.id })}
              />
            ) : null}
          </View>
        </Section>
      </Screen>
    );
  }

  /* ── 목록 ── */
  const topics = guideTopics(pt);
  const byId = Object.fromEntries(topics.map((x) => [x.id, x]));
  const start = byId.start;

  return (
    <Screen standalone header={<AppHeader title="사용 가이드" subtitle="기능별 사용법을 차근차근" back />}>
      {start ? (
        <Section index={0}>
          <Card onPress={() => navigation.push('guide', { topic: 'start' })} style={{ backgroundColor: tc.primarySoft }} variant="flat">
            <View style={s.summaryRow}>
              <View style={[s.bigIcon, { backgroundColor: tc.card }]}>
                <Ionicons name="rocket-outline" size={26} color={tc.primary} />
              </View>
              <View style={{ flex: 1, gap: sp.xxs }}>
                <Txt role="label" tone="primary">처음이라면 여기부터</Txt>
                <Txt role="bodyLg" style={{ fontWeight: '700' }}>{start.title}</Txt>
                <Txt role="caption" tone="secondary">{start.summary}</Txt>
              </View>
              <Ionicons name="chevron-forward" size={20} color={tc.primary} />
            </View>
          </Card>
        </Section>
      ) : null}

      {GUIDE_GROUPS.map((grp, gi) => {
        const rows = grp.ids.filter((id) => id !== 'start' && byId[id]).map((id) => byId[id]);
        if (!rows.length) return null;
        return (
          <Section key={grp.label} index={gi + 1} gap={sp.xl}>
            <ListGroup label={grp.label}>
              {rows.map((g) => (
                <ListRow
                  key={g.id}
                  title={g.title}
                  subtitle={g.summary}
                  icon={g.icon}
                  chevron
                  onPress={() => navigation.push('guide', { topic: g.id })}
                />
              ))}
            </ListGroup>
          </Section>
        );
      })}

      <Section index={GUIDE_GROUPS.length + 1}>
        <View style={[s.hint, { backgroundColor: tc.surfaceSunken }]}>
          <Ionicons name="help-circle-outline" size={20} color={tc.textSecondary} />
          <Txt role="caption" tone="secondary" style={{ flex: 1 }}>
            각 화면 오른쪽 위의 물음표 버튼을 누르면 그 화면 사용법을 바로 볼 수 있어요.
          </Txt>
        </View>
      </Section>
    </Screen>
  );
}

const makeStyles = () =>
  StyleSheet.create({
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    bigIcon: { width: 48, height: 48, borderRadius: r.md, alignItems: 'center', justifyContent: 'center' },
    footer: { gap: sp.sm },
    hint: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, padding: sp.md, borderRadius: r.md },
  });
