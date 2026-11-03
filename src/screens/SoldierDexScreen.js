import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import {
  Screen, AppHeader, Section, Grid, PressScale, Txt, Chip, Button, HeroCard, BottomSheet, ProgressBar,
} from '../components/ui';
import StickSoldier from '../components/motion/StickSoldier';
import { AD_UNITS } from '../constants/adUnits';
import { SOLDIER_SKINS, skinById } from '../constants/soldierSkins';
import { useThemeColors } from '../theme/ThemeContext';
import { useSkins } from '../state/SkinContext';
import useRewardedAd from '../hooks/useRewardedAd';
import { guardSave, SAVE_FAILED } from '../utils/saveGuard';
import { haptic } from '../utils/haptics';
import { radius as r, space as sp } from '../theme/tokens';

/**
 * 막대병 도감 — 홈 링 안 캐릭터의 모습을 모으고 고른다.
 *
 * 잠긴 모습은 **보상형 전면광고**를 끝까지 보면 영구히 열린다.
 * AdMob 정책: 보상형 전면광고는 시작 전에 보상을 알리고 건너뛸 수 있는 안내가
 * 있어야 한다 → 카드를 누르면 열리는 시트가 그 안내다. 광고는 시트의
 * [광고 보고 받기] 버튼으로만 시작한다.
 *
 * 무한 루프 예산: 움직이는 막대병은 화면에 하나뿐이다 — 시트가 닫혀 있으면 위쪽
 * 대표 카드, 열려 있으면 시트 무대. 그리드 썸네일은 전부 정지 포즈다.
 */
export default function SoldierDexScreen() {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);
  const isFocused = useIsFocused();
  const { selected, unlocked, select, unlockAndSelect, markDexSeen } = useSkins();
  const { status, show, retry } = useRewardedAd(isFocused);

  const [pickedId, setPickedId] = useState(null);
  const [note, setNote] = useState(null);   // 시트 안 한 줄 안내 (획득·중도 종료)
  const busy = useRef(false);

  const cfg = tc.phase.normal;
  const current = skinById(selected);
  const owned = unlocked.length;
  const total = SOLDIER_SKINS.length;
  const picked = pickedId ? skinById(pickedId) : null;
  const pickedOwned = picked ? unlocked.includes(picked.id) : false;

  // 처음 들어오면 홈의 NEW 점을 끈다 — 실패해도 조용히 (다음에 또 끄면 된다)
  useFocusEffect(
    useCallback(() => {
      markDexSeen().catch(() => {});
    }, [markDexSeen])
  );

  const open = (id) => { setNote(null); setPickedId(id); };
  const close = () => { if (!busy.current) setPickedId(null); };

  const handleSelect = async () => {
    if (!picked || busy.current) return;
    busy.current = true;
    try {
      if ((await guardSave(() => select(picked.id))) === SAVE_FAILED) return;
      haptic.success();
      setPickedId(null);
    } finally {
      busy.current = false;
    }
  };

  const handleWatch = async () => {
    if (!picked || busy.current || status !== 'ready') return;
    busy.current = true;
    const id = picked.id;
    try {
      const res = await show();
      if (res.earned) {
        // 보상은 저장이 성공해야 확정이다. 실패하면 guardSave 가 알린다.
        if ((await guardSave(() => unlockAndSelect(id), '막대병을 저장하지 못했습니다.\n기기 저장공간을 확인한 뒤 다시 시도해주세요.')) === SAVE_FAILED) return;
        haptic.success();
        setNote({ tone: 'success', text: `'${skinById(id).name}'을(를) 얻었어요! 홈 링에서 달리고 있어요.` });
      } else if (res.reason === 'not_ready' || res.reason === 'error' || res.reason === 'unavailable') {
        haptic.warning();
        setNote({ tone: 'danger', text: '광고를 불러오지 못했어요. 잠시 뒤 다시 시도해주세요.' });
      } else if (res.reason !== 'busy') {
        setNote({ tone: 'secondary', text: '광고를 끝까지 봐야 받을 수 있어요.' });
      }
    } finally {
      busy.current = false;
    }
  };

  const watchLabel =
    status === 'ready' ? '광고 보고 받기'
      : status === 'showing' ? '광고 보는 중…'
        : status === 'failed' ? '다시 불러오기'
          : status === 'unavailable' ? '이 기기에서는 광고를 볼 수 없어요'
            : '광고 불러오는 중…';

  return (
    <Screen
      standalone
      ad={AD_UNITS.DEX_BOTTOM}
      header={<AppHeader title="막대병 도감" subtitle="홈 링 안에서 달릴 막대병을 골라요" back />}
    >
      {/* 지금 장착한 막대병 */}
      <Section index={0}>
        <HeroCard gradient={cfg.gradient} sheen={false}>
          <View style={s.heroRow}>
            <View style={s.heroStage}>
              <StickSoldier
                key={current.id}
                skin={current.id}
                size={88}
                color={cfg.accent}
                active={isFocused && !picked}
              />
            </View>
            <View style={s.heroText}>
              <Txt role="micro" tone="heroMuted">지금 홈에서</Txt>
              <Txt role="section" tone="hero" numberOfLines={1}>{current.name}</Txt>
              <Txt role="caption" tone="heroMuted" style={s.count}>
                모은 막대병 {owned} / {total}
              </Txt>
              <ProgressBar progress={owned / total} tone="hero" height={6} />
            </View>
          </View>
        </HeroCard>
      </Section>

      {/* 도감 */}
      <Section index={1}>
        <Grid columns={2} gap={sp.sm}>
          {SOLDIER_SKINS.map((k) => {
            const has = unlocked.includes(k.id);
            const on = k.id === selected;
            return (
              <PressScale
                key={k.id}
                onPress={() => open(k.id)}
                haptic="light"
                style={[s.card, on && s.cardOn]}
                accessibilityRole="button"
                accessibilityLabel={`${k.name}${on ? ', 사용 중' : has ? ', 보유' : ', 잠김 — 광고 보고 받기'}`}
              >
                <View style={s.thumb}>
                  <View style={!has && s.lockedFig}>
                    <StickSoldier skin={k.id} size={60} color={tc.primary} active={false} />
                  </View>
                  {!has ? (
                    <View style={s.lockBadge}>
                      <Ionicons name="lock-closed" size={12} color={tc.textSecondary} />
                    </View>
                  ) : null}
                </View>
                <Txt role="label" numberOfLines={1}>{k.name}</Txt>
                {on ? (
                  <Chip label="사용 중" icon="checkmark" size="sm" tone="primary" selected style={s.chip} />
                ) : has ? (
                  <Txt role="caption" tone="secondary">보유 · 눌러서 바꾸기</Txt>
                ) : (
                  <View style={s.adRow}>
                    <Ionicons name="play-circle-outline" size={14} color={tc.textSecondary} />
                    <Txt role="caption" tone="secondary">광고 보고 받기</Txt>
                  </View>
                )}
              </PressScale>
            );
          })}
        </Grid>
      </Section>

      <Section index={2}>
        <Txt role="caption" tone="secondary">
          * 잠긴 막대병은 광고를 끝까지 한 번 보면 영구히 열려요. 프로필을 바꾸거나 데이터를
          초기화해도 사라지지 않고, 백업 파일에도 함께 담겨요.
        </Txt>
      </Section>

      {/* 미리보기 + 보상형 광고 안내 시트 */}
      <BottomSheet visible={!!picked} onClose={close}>
        {picked ? (
          <View style={s.sheet}>
            <HeroCard gradient={cfg.gradient} sheen={false} style={s.stageCard}>
              <View style={s.stage}>
                <StickSoldier
                  key={picked.id}
                  skin={picked.id}
                  size={128}
                  color={cfg.accent}
                  active={isFocused}
                />
              </View>
            </HeroCard>

            <View style={s.sheetText}>
              <Txt role="subtitle">{picked.name}</Txt>
              <Txt role="body" tone="secondary">{picked.desc}</Txt>
            </View>

            {!pickedOwned ? (
              <View style={s.notice}>
                <Ionicons name="gift-outline" size={18} color={tc.primary} />
                <Txt role="caption" tone="secondary" style={{ flex: 1 }}>
                  광고를 끝까지 보면 '{picked.name}'을(를) 얻고 바로 홈에 적용돼요.
                  중간에 닫으면 받을 수 없어요. 원하지 않으면 취소를 누르세요.
                </Txt>
              </View>
            ) : null}

            {note ? <Txt role="caption" tone={note.tone}>{note.text}</Txt> : null}

            <View style={s.btns}>
              <Button title={pickedOwned ? '닫기' : '취소'} variant="ghost" onPress={close} style={s.btn} />
              {pickedOwned ? (
                <Button
                  title={picked.id === selected ? '사용 중' : '이 막대병으로 바꾸기'}
                  onPress={handleSelect}
                  disabled={picked.id === selected}
                  style={s.btn}
                />
              ) : (
                <Button
                  title={watchLabel}
                  icon={status === 'ready' ? 'play-circle' : undefined}
                  onPress={status === 'failed' ? retry : handleWatch}
                  loading={status === 'loading' || status === 'idle' || status === 'showing'}
                  disabled={status === 'unavailable'}
                  style={s.btn}
                />
              )}
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: sp.lg },
    heroStage: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
    heroText: { flex: 1, gap: sp.xxs },
    count: { marginTop: sp.xs },

    card: {
      gap: sp.xs,
      padding: sp.md,
      borderRadius: r.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tc.border,
      backgroundColor: tc.card,
    },
    cardOn: { borderWidth: 2, borderColor: tc.primary },
    thumb: {
      height: 76,
      borderRadius: r.sm,
      backgroundColor: tc.surfaceSunken,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: sp.xxs,
    },
    lockedFig: { opacity: 0.3 },
    lockBadge: {
      position: 'absolute',
      top: sp.xs,
      right: sp.xs,
      width: 22,
      height: 22,
      borderRadius: r.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tc.card,
    },
    chip: { alignSelf: 'flex-start' },
    adRow: { flexDirection: 'row', alignItems: 'center', gap: sp.xxs },

    sheet: { gap: sp.md },
    stageCard: { alignSelf: 'stretch' },
    stage: { height: 140, alignItems: 'center', justifyContent: 'center' },
    sheetText: { gap: sp.xs },
    notice: {
      flexDirection: 'row',
      gap: sp.sm,
      padding: sp.md,
      borderRadius: r.sm,
      backgroundColor: tc.primarySoft,
    },
    btns: { flexDirection: 'row', gap: sp.sm, marginTop: sp.xs },
    btn: { flex: 1 },
  });
