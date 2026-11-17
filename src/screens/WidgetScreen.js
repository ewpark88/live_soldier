import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  Screen, AppHeader, Section, Card, Button, Chip, Txt, EmptyState,
} from '../components/ui';
import { HelpButton, GuideBody } from '../components/help';
import { WIDGETS } from '../widget/widgetCatalog';
import { getWidgetData } from '../widget/widgetData';
import { updateDischargeWidget } from '../widget/updateWidget';
import { canPinWidget, countPinnedWidgets, pinWidget } from '../widget/widgetPin';
import { guideTopic } from '../constants/guides';
import { haptic } from '../utils/haptics';
import { useThemeColors } from '../theme/ThemeContext';
import { radius as r, space as sp } from '../theme/tokens';

/* WidgetPreview 는 네이티브 모듈을 부른다 — iOS·미링크 빌드에서 import 가 터지지 않게 지연 로드 */
let WidgetPreview = null;
if (Platform.OS === 'android') {
  try { ({ WidgetPreview } = require('react-native-android-widget')); } catch { WidgetPreview = null; }
}

/**
 * 홈 화면 위젯 — 루트 스택 'widgets'.
 *
 * 위젯마다 **실제 내 데이터로 그린 미리보기** + [홈 화면에 추가] 한 버튼.
 * 버튼은 시스템 '홈 화면에 추가' 창(requestPinAppWidget)을 띄운다. 런처가 이를
 * 지원하지 않으면 버튼 대신 '직접 추가하는 방법'을 단계별로 보여준다.
 *
 * 추가가 끝났는지는 시스템이 알려주지 않는다 — 앱으로 돌아왔을 때(AppState
 * active · 포커스) 홈 화면에 놓인 개수를 다시 세서 '추가됨'을 표시한다.
 */
export default function WidgetScreen() {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(), []);
  const { width: winW } = useWindowDimensions();

  const [data, setData] = useState(null);
  const [pinOk, setPinOk] = useState(null);       // null = 확인 중
  const [counts, setCounts] = useState({});
  const justAsked = useRef(null);   // 방금 추가를 요청한 위젯 이름
  const prevCounts = useRef({});

  const refresh = useCallback(async () => {
    const next = {};
    for (const w of WIDGETS) next[w.name] = await countPinnedWidgets(w.name);
    // 방금 요청한 위젯이 늘었으면 성공 햅틱 한 번
    const asked = justAsked.current;
    if (asked && (next[asked] ?? 0) > (prevCounts.current[asked] ?? 0)) {
      haptic.success();
      justAsked.current = null;
    }
    prevCounts.current = next;
    setCounts(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getWidgetData().then((d) => { if (alive) setData(d); }).catch(() => {});
      canPinWidget().then((v) => { if (alive) setPinOk(v); });
      refresh();
      updateDischargeWidget();   // 이미 놓인 위젯도 최신으로
      return () => { alive = false; };
    }, [refresh])
  );

  // 시스템 '추가' 창에서 돌아오면 다시 센다
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);

  const header = (
    <AppHeader
      title="홈 화면 위젯"
      subtitle="앱을 열지 않아도 D-Day 를 바로"
      back
      right={<HelpButton topic="widget" />}
    />
  );

  if (Platform.OS !== 'android') {
    return (
      <Screen standalone header={header}>
        <EmptyState
          icon="apps-outline"
          title="아직 안드로이드에서만 지원해요"
          desc="아이폰 위젯은 준비 중이에요."
        />
      </Screen>
    );
  }

  const manual = guideTopic('widget', null)?.sections?.[1];   // '직접 추가하려면'
  const previewMax = Math.min(winW - sp.lg * 4, 300);

  const onAdd = async (w) => {
    justAsked.current = w.name;
    const shown = await pinWidget(w.name);
    if (!shown) {
      justAsked.current = null;
      setPinOk(false);   // 런처가 거절 — 수동 안내로 전환
    }
  };

  return (
    <Screen standalone header={header}>
      <Section index={0}>
        <View style={[s.intro, { backgroundColor: tc.primarySoft }]}>
          <Ionicons name="phone-portrait-outline" size={22} color={tc.primary} />
          <Txt role="bodySm" style={{ flex: 1 }}>
            {pinOk === false
              ? '마음에 드는 위젯을 고른 뒤, 아래 ‘직접 추가하는 방법’대로 바탕화면에 놓아 주세요.'
              : '마음에 드는 위젯의 ‘홈 화면에 추가’를 누르고, 뜨는 창에서 ‘추가’를 누르면 끝이에요.'}
          </Txt>
        </View>
      </Section>

      {WIDGETS.map((w, i) => {
        const placed = counts[w.name] ?? 0;
        const scale = Math.min(1, previewMax / w.preview.w);
        const pw = Math.round(w.preview.w * scale);
        const ph = Math.round(w.preview.h * scale);
        const { Component } = w;
        return (
          <Section key={w.name} index={i + 1}>
            <Card>
              <View style={s.titleRow}>
                <Txt role="section" style={{ flex: 1 }}>{w.title}</Txt>
                <Chip label={w.size} size="sm" />
                {placed > 0 ? <Chip label="홈 화면에 있음" icon="checkmark" size="sm" tone="success" /> : null}
              </View>
              <Txt role="caption" tone="secondary" style={s.desc}>{w.desc}</Txt>

              {/* 실제 위젯 렌더러로 그린 미리보기 — 바탕화면 느낌을 내려고 가라앉은 면 위에 얹는다 */}
              <View style={[s.stage, { backgroundColor: tc.surfaceSunken }]}>
                {WidgetPreview && data ? (
                  <PreviewBox
                    Component={Component}
                    data={data}
                    width={pw}
                    height={ph}
                  />
                ) : (
                  <View style={{ width: pw, height: ph }} />
                )}
              </View>

              {pinOk !== false ? (
                <Button
                  title={placed > 0 ? '하나 더 추가' : '홈 화면에 추가'}
                  icon="add-circle-outline"
                  variant={placed > 0 ? 'secondary' : 'primary'}
                  full
                  loading={pinOk === null}
                  onPress={() => onAdd(w)}
                  accessibilityLabel={`${w.title} 위젯을 홈 화면에 추가`}
                />
              ) : null}
            </Card>
          </Section>
        );
      })}

      {manual ? (
        <Section index={WIDGETS.length + 1}>
          <Card>
            <GuideBody sections={[{ ...manual, title: '직접 추가하는 방법' }]} />
            <Txt role="caption" tone="light" style={s.foot}>
              * 위젯은 30분마다, 그리고 정보를 저장할 때마다 새로 그려져요. 색은 지금 테마를 따라가요.
            </Txt>
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}

/** renderWidget 이 매 렌더 새 함수면 WidgetPreview 가 계속 다시 그린다 — 고정한다 */
function PreviewBox({ Component, data, width, height }) {
  const render = useCallback(() => <Component {...data} />, [Component, data]);
  return <WidgetPreview renderWidget={render} width={width} height={height} />;
}

const makeStyles = () =>
  StyleSheet.create({
    intro: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, padding: sp.md, borderRadius: r.md },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
    desc: { marginTop: sp.xs },
    stage: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: sp.xl,
      borderRadius: r.md,
      marginVertical: sp.lg,
    },
    foot: { marginTop: sp.md },
  });
