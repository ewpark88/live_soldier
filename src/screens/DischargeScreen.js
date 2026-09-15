import React, { useState, useCallback, useMemo } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, LinearTransition,
  useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import SectionTitle from '../components/SectionTitle';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import DatePickerField from '../components/DatePickerField';
import {
  Screen, AppHeader, Section, HeroCard, Grid, Button, Chip,
  ListRow, Txt, AnimatedNumber, PressScale,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import {
  loadMilitaryInfo, saveMilitaryInfo,
  loadRankPromotions, saveRankPromotions, resetRankPromotions, calcDefaultPromotions,
  savePersonnelType, loadPersonnelType,
} from '../utils/storage';
import { ranksFor } from '../constants/militaryRanks';
import useShowInterstitial from '../hooks/useShowInterstitial';
import { useMotion } from '../hooks/useMotion';
import { haptic } from '../utils/haptics';
import {
  calcDischargeDate, calcDaysLeft, calcProgress, formatDate, formatDateKo,
  isFutureDate, isValidDateString,
  getMessageForPhase,
} from '../utils/dateUtils';
import { BRANCHES, PERSONNEL_TYPES, isOfficer } from '../constants/serviceTerms';
import { updateDischargeWidget } from '../widget/updateWidget';
import { refreshScheduledNotifications } from '../utils/notifications';
import { motion, radius as r, space as sp, type as ty } from '../theme/tokens';

const PROMO_RANKS = ['일병', '상병', '병장'];

/* ─── 복무 단계 (응원 메시지용) ─────────────────────────── */
function getPhase(daysLeft) {
  if (daysLeft <= 0) return 'done';
  if (daysLeft <= 3) return 'd3';
  if (daysLeft <= 7) return 'd7';
  if (daysLeft <= 30) return 'd30';
  if (daysLeft <= 100) return 'd100';
  return 'normal';
}

export default function DischargeScreen({ navigation }) {
  const tc = useThemeColors();
  const m = useMotion();
  const s = useMemo(() => makeStyles(tc), [tc]);
  const { show: showAd } = useShowInterstitial();

  const [enlistDate, setEnlistDate] = useState('');
  const [branch, setBranch] = useState('army');
  const [personnelType, setPersonnelType] = useState('soldier');
  const [monthsInput, setMonthsInput] = useState('');
  const [officerRank, setOfficerRank] = useState(null);
  const [info, setInfo] = useState(null);
  const [editing, setEditing] = useState(false);

  const [promotions, setPromotions] = useState(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(false);
  const [editPromo, setEditPromo] = useState(null);

  const [message, setMessage] = useState(() => getMessageForPhase('normal'));

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      await _loadData();
    } catch (e) {
      if (__DEV__) console.warn('[DischargeScreen] 데이터 로드 실패:', e && e.message);
      // info=null, editing=false 로 남으면 헤더만 있고 본문이 비어
      // 입대 정보를 입력할 방법이 없어진다. 입력 폼을 열어준다.
      setEditing(true);
    }
  };

  const _loadData = async () => {
    const mi = await loadMilitaryInfo();
    if (mi) {
      setInfo(mi);
      setEnlistDate(mi.enlistDate);
      setBranch(mi.branch);
      setPersonnelType(mi.personnelType ?? 'soldier');
      setOfficerRank(mi.officerRank ?? null);
      setMonthsInput(String(mi.months ?? ''));
      setEditing(false);
      setPromotions(await loadRankPromotions(mi.enlistDate));
      setMessage(getMessageForPhase(getPhase(calcDaysLeft(mi.dischargeDate))));
    } else {
      const pt = await loadPersonnelType();
      setInfo(null);
      setEnlistDate('');
      setBranch('army');
      setPersonnelType(pt ?? 'soldier');
      setOfficerRank(null);
      setMonthsInput('');
      setEditing(true);
      setPromotions(null);
    }
  };

  // 저장된 branch 가 손상돼도 크래시하지 않도록 첫 군종으로 폴백
  const selectedBranch = BRANCHES.find((b) => b.key === branch) ?? BRANCHES[0];
  const officer = isOfficer(personnelType);

  const handleSave = async () => {
    if (!enlistDate) { haptic.warning(); Alert.alert('오류', '입대일을 선택해주세요.'); return; }
    if (!isValidDateString(enlistDate)) {
      haptic.warning();
      Alert.alert('오류', '입대일이 올바르지 않습니다. 다시 선택해주세요.');
      return;
    }
    // 문자열 비교로 판정한다 — new Date('YYYY-MM-DD') 는 UTC 자정으로 파싱돼
    // KST 오전 9시 이전에는 '오늘'이 미래로 잘못 판정됐다.
    if (isFutureDate(enlistDate)) {
      haptic.warning();
      Alert.alert('오류', '입대일이 오늘보다 미래일 수 없습니다.');
      return;
    }

    let months;
    if (officer) {
      months = parseInt(monthsInput, 10);
      if (isNaN(months) || months < 1 || months > 240) {
        haptic.warning();
        Alert.alert('오류', '복무 개월 수를 올바르게 입력해주세요 (1~240).');
        return;
      }
    } else {
      months = selectedBranch.months;
    }

    const dischargeDate = calcDischargeDate(enlistDate, months);
    if (!dischargeDate) {
      haptic.warning();
      Alert.alert('오류', '전역일을 계산할 수 없습니다. 입대일과 복무 개월을 확인해주세요.');
      return;
    }
    const mi = {
      enlistDate,
      branch: selectedBranch.key,
      personnelType,
      officerRank: officer ? (officerRank ?? null) : null,
      dischargeDate: formatDate(dischargeDate),
      months,
    };
    try {
      await saveMilitaryInfo(mi);
      await savePersonnelType(personnelType);
    } catch (e) {
      // 저장이 실패했는데 성공한 것처럼 화면을 넘기면, 사용자는 입력이
      // 남은 줄 알고 앱을 닫았다가 다음 실행에서 온보딩을 다시 만난다.
      haptic.warning();
      Alert.alert('저장 실패', '입대 정보를 저장하지 못했습니다. 기기 저장공간을 확인한 뒤 다시 시도해주세요.');
      return;
    }

    if (officer) {
      await resetRankPromotions();
      setPromotions(null);
    } else if (!info || info.enlistDate !== enlistDate || info.personnelType !== personnelType) {
      await resetRankPromotions();
      setPromotions(calcDefaultPromotions(enlistDate));
    }

    setInfo(mi);
    setEditing(false);
    updateDischargeWidget();
    refreshScheduledNotifications().catch(() => {});
    haptic.success();
    showAd();
  };

  const handleStartEditPromo = () => {
    setEditPromo({ ...promotions });
    setEditingPromo(true);
  };

  const handleSavePromo = async () => {
    if (!editPromo?.일병 || !editPromo?.상병 || !editPromo?.병장) {
      haptic.warning();
      Alert.alert('오류', '진급일을 모두 입력해주세요.');
      return;
    }
    if (editPromo.일병 >= editPromo.상병 || editPromo.상병 >= editPromo.병장) {
      haptic.warning();
      Alert.alert('오류', '진급일 순서가 올바르지 않습니다.\n일병 < 상병 < 병장 순이어야 합니다.');
      return;
    }
    await saveRankPromotions(editPromo);
    setPromotions(editPromo);
    setEditingPromo(false);
    updateDischargeWidget();
    refreshScheduledNotifications().catch(() => {});
    haptic.success();
  };

  const handleResetPromo = () => {
    Alert.alert(
      '기본값으로 초기화',
      '표준 진급일 기준으로 되돌립니다.\n(일병 2개월, 상병 8개월, 병장 14개월)',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            const defaults = calcDefaultPromotions(info.enlistDate);
            if (!defaults) {
              // 입대일이 깨져 있으면 기본값을 만들 수 없다. 저장소를 건드리지 않고
              // 편집 상태도 유지한다 — null 을 넣으면 편집 카드가 통째로 사라져
              // 저장·취소 버튼까지 없어진다.
              haptic.warning();
              Alert.alert('오류', '입대일이 올바르지 않아 기본값을 계산할 수 없습니다. 입대일을 다시 저장해주세요.');
              return;
            }
            await resetRankPromotions();
            setEditPromo(defaults);
          },
        },
      ]
    );
  };

  const daysLeft = info ? calcDaysLeft(info.dischargeDate) : 0;
  const infoOfficer = info ? isOfficer(info.personnelType) : false;
  const activePromo = editingPromo ? editPromo : promotions;
  const typeLabel = PERSONNEL_TYPES.find((t) => t.key === info?.personnelType)?.label ?? '';
  const branchLabel = BRANCHES.find((b) => b.key === info?.branch)?.label ?? '';

  // 복무 진행률 — 여정 레일의 채워진 부분
  // 홈 히어로와 같은 기준(일수)을 쓴다. 예전엔 여기만 servedMonths/months 라
  // 같은 프로필인데 전역 탭과 홈의 진행률이 달랐고, 개월 기준이라 5.5%p 씩 뛰었다.
  const progress = info ? calcProgress(info.enlistDate, info.dischargeDate) / 100 : 0;

  const chevron = useSharedValue(0);
  const togglePromo = () => {
    const next = !promoOpen;
    setPromoOpen(next);
    chevron.value = withTiming(next ? 1 : 0, { duration: m.dur(220) });
    haptic.select();
  };
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  return (
    <>
      <Screen
        standalone
        ad={AD_UNITS.DISCHARGE_BOTTOM}
        header={<AppHeader title="전역 정보" back />}
      >
        {editing ? (
          /* ── 입력 폼 ── */
          <Section index={0}>
            <Card>
              <SectionTitle icon="create-outline">입대 정보 입력</SectionTitle>

              <View style={{ marginTop: sp.lg }}>
                <Txt role="label" tone="secondary" style={s.label}>입대일</Txt>
                <DatePickerField
                  value={enlistDate}
                  onChange={setEnlistDate}
                  maximumDate={new Date()}
                  placeholder="입대일을 선택하세요"
                />
              </View>

              {/* 구분 — 3-up */}
              <Txt role="label" tone="secondary" style={s.label}>구분</Txt>
              <Grid columns={3} gap={sp.sm}>
                {PERSONNEL_TYPES.map((t) => (
                  <SelectTile
                    key={t.key}
                    icon={t.icon}
                    label={t.label}
                    selected={personnelType === t.key}
                    onPress={() => setPersonnelType(t.key)}
                  />
                ))}
              </Grid>

              {/* 군별 — 2-up. 예전엔 width:'47.5%' + gap:8 이라 오른쪽이 너덜너덜했다 */}
              <Txt role="label" tone="secondary" style={s.label}>군별</Txt>
              <Grid columns={2} gap={sp.sm}>
                {BRANCHES.map((b) => (
                  <SelectTile
                    key={b.key}
                    icon={b.icon}
                    label={b.label}
                    sub={officer ? undefined : `${b.months}개월`}
                    selected={branch === b.key}
                    onPress={() => setBranch(b.key)}
                  />
                ))}
              </Grid>

              {officer ? (
                <>
                  <Txt role="label" tone="secondary" style={s.label}>현재 계급</Txt>
                  <View style={s.chipWrap}>
                    {ranksFor(personnelType).map((rk) => (
                      <Chip
                        key={rk}
                        label={rk}
                        selected={officerRank === rk}
                        onPress={() => setOfficerRank(rk)}
                      />
                    ))}
                  </View>

                  <Txt role="label" tone="secondary" style={s.label}>총 복무 개월 수</Txt>
                  <View style={s.stepperRow}>
                    <PressScale
                      onPress={() => setMonthsInput(String(Math.max(1, (parseInt(monthsInput, 10) || 0) - 1)))}
                      haptic="select"
                      style={s.stepBtn}
                    >
                      <Ionicons name="remove" size={18} color={tc.primary} />
                    </PressScale>

                    <TextInput
                      style={s.stepInput}
                      value={monthsInput}
                      onChangeText={(t) => setMonthsInput(t.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      placeholder="예: 36"
                      placeholderTextColor={tc.textLight}
                      maxLength={3}
                    />

                    <PressScale
                      onPress={() => setMonthsInput(String(Math.min(240, (parseInt(monthsInput, 10) || 0) + 1)))}
                      haptic="select"
                      style={s.stepBtn}
                    >
                      <Ionicons name="add" size={18} color={tc.primary} />
                    </PressScale>
                  </View>

                  <View style={s.chipWrap}>
                    {[24, 36, 48].map((v) => (
                      <Chip
                        key={v}
                        label={`${v}개월`}
                        size="sm"
                        selected={parseInt(monthsInput, 10) === v}
                        onPress={() => setMonthsInput(String(v))}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <Txt role="caption" tone="light" style={{ marginTop: sp.md }}>
                  * 병사는 군별 의무복무기간이 자동 적용됩니다 ({selectedBranch?.months}개월)
                </Txt>
              )}

              <View style={s.btnRow}>
                {info ? (
                  <Button
                    title="취소"
                    variant="ghost"
                    onPress={() => { setEditing(false); loadData(); }}
                    style={{ flex: 1 }}
                  />
                ) : null}
                <Button title="저장" icon="checkmark" onPress={handleSave} style={{ flex: 1 }} />
              </View>
            </Card>
          </Section>
        ) : info ? (
          /* ── 요약 히어로 ──
             예전의 2×2 라벨/값 격자 + 별도 ddayBox(같은 정보 중복)를
             D-N 하나 + 여정 레일 하나로 바꾼다. */
          <Section index={0}>
            <HeroCard>
              <View style={s.heroTop}>
                <View style={s.chipRow}>
                  <Chip label={`${branchLabel} · ${typeLabel}`} size="sm" tone="accent" />
                  <Chip label={`${info.months}개월`} size="sm" style={s.heroChip} textStyle={{ color: tc.heroText }} />
                </View>

                <Chip
                  label="수정"
                  icon="create-outline"
                  size="sm"
                  onPress={() => setEditing(true)}
                  style={s.heroChip}
                  textStyle={{ color: tc.heroText }}
                />
              </View>

              <View style={s.heroAmount}>
                <Txt role="subtitle" tone="heroMuted">D-</Txt>
                <AnimatedNumber
                  value={Math.max(0, daysLeft)}
                  style={[ty.hero, { color: tc.heroText }]}
                />
              </View>

              {/* 여정 레일: [● 입대] ——— [○ 전역], 채워진 선이 복무 진행률 */}
              <View style={s.rail}>
                <View style={[s.railDot, { backgroundColor: tc.accentLight }]} />
                <View style={s.railTrack}>
                  <ProgressBar progress={progress} height={3} tone="hero" delay={320} />
                </View>
                <View
                  style={[
                    s.railDot,
                    s.railDotEnd,
                    daysLeft <= 0 && { backgroundColor: tc.accentLight },
                  ]}
                />
              </View>

              <View style={s.railLabels}>
                <View>
                  <Txt role="micro" tone="heroMuted">입대</Txt>
                  <Txt role="caption" tone="hero">{formatDateKo(info.enlistDate)}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt role="micro" tone="heroMuted">전역</Txt>
                  <Txt role="caption" tone="hero">{formatDateKo(info.dischargeDate)}</Txt>
                </View>
              </View>
            </HeroCard>
          </Section>
        ) : null}

        {/* ── 진급일 관리 (병사만) ── */}
        {info && !infoOfficer && (activePromo || editingPromo) ? (
          <Section index={1}>
            <Animated.View layout={m.layout(LinearTransition.springify())}>
              <Card>
                <PressScale onPress={togglePromo} haptic="select" scale={0.995}>
                  <SectionTitle
                    icon="ribbon-outline"
                    right={
                      <Animated.View style={chevronStyle}>
                        <Ionicons name="chevron-down" size={18} color={tc.textLight} />
                      </Animated.View>
                    }
                  >
                    진급일 관리
                  </SectionTitle>
                </PressScale>

                {promoOpen ? (
                  <Animated.View entering={m.enter(FadeInDown, 0, motion.duration.base)}>
                    <Txt role="caption" tone="secondary" style={{ marginTop: sp.sm }}>
                      실제 진급일이 다르면 직접 수정하세요.
                    </Txt>

                    <View style={{ marginTop: sp.md }}>
                      {PROMO_RANKS.map((rk) => (
                        <View key={rk} style={{ marginBottom: sp.md }}>
                          <Txt role="label" tone="secondary" style={s.label}>{rk} 진급일</Txt>
                          <DatePickerField
                            value={activePromo?.[rk] ?? ''}
                            onChange={(d) => setEditPromo((p) => ({ ...p, [rk]: d }))}
                            disabled={!editingPromo}
                            placeholder="날짜를 선택하세요"
                          />
                        </View>
                      ))}
                    </View>

                    {editingPromo ? (
                      <>
                        <View style={s.btnRow}>
                          <Button
                            title="취소"
                            variant="ghost"
                            onPress={() => { setEditingPromo(false); setEditPromo(null); }}
                            style={{ flex: 1 }}
                          />
                          <Button title="저장" onPress={handleSavePromo} style={{ flex: 1 }} />
                        </View>
                        <Button
                          title="기본값으로 초기화"
                          variant="ghost"
                          size="sm"
                          onPress={handleResetPromo}
                          textStyle={{ color: tc.danger }}
                          style={s.resetBtn}
                        />
                      </>
                    ) : (
                      <Button
                        title="진급일 수정"
                        icon="create-outline"
                        variant="secondary"
                        full
                        onPress={handleStartEditPromo}
                        style={{ marginTop: sp.sm }}
                      />
                    )}
                  </Animated.View>
                ) : null}
              </Card>
            </Animated.View>
          </Section>
        ) : null}

        {/* ── 전역 로드맵 ── */}
        {info ? (
          <Section index={2}>
            <Card pad="none" style={{ paddingHorizontal: 0 }}>
              <ListRow
                title="전역 로드맵"
                subtitle="다음 진급·호봉과 주요 순간을 한눈에"
                icon="map"
                chevron
                onPress={() => navigation.navigate('roadmap')}
                style={s.navRow}
              />
            </Card>
          </Section>
        ) : null}

        {/* ── 장병내일적금 계산기 ── */}
        {info ? (
          <Section index={3}>
            <Card pad="none" style={{ paddingHorizontal: 0 }}>
              <ListRow
                title="장병내일적금 계산기"
                subtitle="전역 시 받을 목돈을 미리 계산"
                icon="calculator"
                iconTone="accent"
                chevron
                onPress={() => navigation.navigate('savings')}
                style={s.navRow}
              />
            </Card>
          </Section>
        ) : null}

        {/* ── 응원 메시지 ── */}
        {info ? (
          <Section index={4}>
            <Card>
              <View style={s.msgRow}>
                <Ionicons name="chatbubble-ellipses" size={20} color={tc.primaryLight} />
                <Txt role="body" style={{ flex: 1 }} numberOfLines={3}>
                  {message}
                </Txt>
                <PressScale
                  onPress={() => setMessage(getMessageForPhase(getPhase(daysLeft)))}
                  haptic="select"
                  style={s.refresh}
                  accessibilityLabel="다른 메시지 보기"
                >
                  <Ionicons name="refresh" size={16} color={tc.primaryLight} />
                </PressScale>
              </View>
            </Card>
          </Section>
        ) : null}
      </Screen>

    </>
  );
}

/* 선택 타일 — 채워진 primary + 흰 아이콘.
   예전의 15% 알파 틴트 선택 표시는 싸구려로 읽혔다. */
function SelectTile({ icon, label, sub, selected, onPress }) {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  return (
    <PressScale
      onPress={onPress}
      haptic="select"
      style={[s.tile, selected && { backgroundColor: tc.primary, borderColor: tc.primary }]}
      accessibilityState={{ selected }}
    >
      <Ionicons name={icon} size={20} color={selected ? tc.onPrimary : tc.textSecondary} />
      <Txt
        role="bodySm"
        style={{ fontWeight: '700', color: selected ? tc.onPrimary : tc.text }}
        numberOfLines={1}
      >
        {label}
      </Txt>
      {sub ? (
        <Txt
          role="micro"
          style={{ color: selected ? tc.onPrimary : tc.textLight, opacity: selected ? 0.8 : 1 }}
        >
          {sub}
        </Txt>
      ) : null}
    </PressScale>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    label: { marginTop: sp.lg, marginBottom: sp.sm },

    tile: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: sp.xs,
      minHeight: 78,
      paddingVertical: sp.md,
      paddingHorizontal: sp.xs,
      borderRadius: r.md,
      backgroundColor: tc.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tc.surfaceSunkenBorder,
    },

    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm, marginTop: sp.sm },
    stepperRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
    stepBtn: {
      width: 44,
      height: 48,
      borderRadius: r.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tc.primarySoft,
    },
    stepInput: {
      flex: 1,
      height: 48,
      borderRadius: r.sm,
      backgroundColor: tc.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tc.surfaceSunkenBorder,
      textAlign: 'center',
      ...ty.bodyLg,
      fontWeight: '700',
      color: tc.text,
      padding: 0,
    },

    btnRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.xl },
    resetBtn: { alignSelf: 'center', marginTop: sp.md, borderWidth: 0 },

    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: sp.sm,
    },
    chipRow: { flexDirection: 'row', gap: sp.sm, flexShrink: 1 },
    heroChip: { backgroundColor: tc.heroSheen },
    heroAmount: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: sp.xxs,
      marginTop: sp.lg,
      marginBottom: sp.xl,
    },

    rail: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
    railTrack: { flex: 1 },
    railDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: tc.accentLight,
    },
    railDotEnd: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: tc.heroBorder,
    },
    railLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: sp.sm,
    },

    navRow: { paddingHorizontal: sp.lg },
    msgRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    refresh: { padding: sp.xs },
  });
