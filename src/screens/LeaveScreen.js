import React, { useState, useCallback, useMemo } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import SectionTitle from '../components/SectionTitle';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import DatePickerField from '../components/DatePickerField';
import RangeCalendar from '../components/RangeCalendar';
import SetupRequired from '../components/SetupRequired';
import {
  Screen, AppHeader, Section, HeroCard, Button, Chip, StatTile,
  ListRow, Divider, EmptyState, Txt, AnimatedNumber, BottomSheet, PressScale,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import {
  loadLeaveRecords, addLeaveRecord, deleteLeaveRecord,
  loadLeaveTotal, saveLeaveTotal,
  loadLeaveBonusRecords, addLeaveBonusRecord, deleteLeaveBonusRecord,
  loadMilitaryInfo,
} from '../utils/storage';
import { formatDateKo, daysBetweenInclusive } from '../utils/dateUtils';
import useShowInterstitial from '../hooks/useShowInterstitial';
import { useMotion } from '../hooks/useMotion';
import { haptic } from '../utils/haptics';
import { motion, radius as r, space as sp, type as ty } from '../theme/tokens';

const MODAL_NONE = null;
const MODAL_USE = 'use';
const MODAL_BONUS = 'bonus';

/**
 * 휴가 관리.
 *
 * `embedded` 면 캘린더 탭 안에서 세그먼트 콘텐츠로 렌더된다 — 자기 헤더를
 * 그리지 않고, 상단 inset 도 부모(CalendarScreen)가 이미 소비했으므로 다시
 * 먹이지 않는다. 본문 로직은 두 모드가 완전히 동일하다.
 */
export default function LeaveScreen({ navigation, embedded = false }) {
  const tc = useThemeColors();
  const m = useMotion();
  const s = useMemo(() => makeStyles(tc), [tc]);
  const { show: showAd } = useShowInterstitial();

  const [militaryInfo, setMilitaryInfo] = useState(undefined);
  const [records, setRecords] = useState([]);
  const [bonusRecords, setBonusRecords] = useState([]);
  const [leaveBase, setLeaveBase] = useState(21);
  const [editingBase, setEditingBase] = useState(false);
  const [baseInput, setBaseInput] = useState('21');
  const [modalType, setModalType] = useState(MODAL_NONE);

  const [formDate, setFormDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDays, setFormDays] = useState('');
  const [formMemo, setFormMemo] = useState('');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const mi = await loadMilitaryInfo();
    setMilitaryInfo(mi);
    if (!mi) return;
    setRecords(await loadLeaveRecords());
    setBonusRecords(await loadLeaveBonusRecords());
    const lt = await loadLeaveTotal();
    setLeaveBase(lt);
    setBaseInput(String(lt));
  };

  const usedDays = records.reduce((acc, x) => acc + (x.days || 0), 0);
  const bonusDays = bonusRecords.reduce((acc, x) => acc + (x.days || 0), 0);
  const totalDays = leaveBase + bonusDays;
  const leftDays = totalDays - usedDays;
  const usedRatio = totalDays > 0 ? Math.min(1, usedDays / totalDays) : 0;

  const handleSaveBase = async () => {
    const val = parseInt(baseInput, 10);
    if (isNaN(val) || val < 1 || val > 100) {
      haptic.warning();
      Alert.alert('오류', '1~100 사이의 숫자를 입력해주세요.');
      return;
    }
    await saveLeaveTotal(val);
    setLeaveBase(val);
    setEditingBase(false);
    haptic.success();
  };

  const stepBase = (delta) => {
    const next = Math.max(1, Math.min(100, (parseInt(baseInput, 10) || 0) + delta));
    setBaseInput(String(next));
    haptic.select();
  };

  const handleAddUse = async () => {
    if (!formDate) { haptic.warning(); Alert.alert('오류', '휴가 시작일을 선택해주세요.'); return; }
    const days = daysBetweenInclusive(formDate, formEndDate || formDate);
    if (days < 1) { haptic.warning(); Alert.alert('오류', '휴가 날짜를 다시 선택해주세요.'); return; }
    setRecords(await addLeaveRecord({ date: formDate, days, memo: formMemo.trim() }));
    haptic.success();
    closeModal();
    showAd();
  };

  const handleAddBonus = async () => {
    if (!formDate) { haptic.warning(); Alert.alert('오류', '부여일을 선택해주세요.'); return; }
    const days = parseInt(formDays, 10);
    if (isNaN(days) || days < 1) { haptic.warning(); Alert.alert('오류', '일수를 올바르게 입력해주세요.'); return; }
    setBonusRecords(await addLeaveBonusRecord({ date: formDate, days, memo: formMemo.trim() }));
    haptic.success();
    closeModal();
    showAd();
  };

  const handleDeleteUse = (id, date) => {
    Alert.alert('삭제', `${formatDateKo(date)} 휴가 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => setRecords(await deleteLeaveRecord(id)) },
    ]);
  };

  const handleDeleteBonus = (id, date) => {
    Alert.alert('삭제', `${formatDateKo(date)} 포상휴가를 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => setBonusRecords(await deleteLeaveBonusRecord(id)) },
    ]);
  };

  const closeModal = () => {
    setModalType(MODAL_NONE);
    setFormDate('');
    setFormEndDate('');
    setFormDays('');
    setFormMemo('');
  };

  const isBonus = modalType === MODAL_BONUS;

  if (militaryInfo === undefined) return <Screen scroll={false} />;
  if (!militaryInfo) return <SetupRequired />;

  /** 기록 한 줄 — 카드 하나씩 띄우지 않고 한 카드 안에 헤어라인으로 나눈다 */
  const RecordRow = ({ item, bonus, onDelete, last }) => (
    <Animated.View
      entering={m.enter(FadeInDown, 0, motion.duration.base)}
      exiting={m.exit(FadeOutRight)}
      layout={m.layout(LinearTransition.springify().damping(20).stiffness(200))}
    >
      <ListRow
        title={formatDateKo(item.date)}
        subtitle={item.memo || undefined}
        icon={bonus ? 'medal-outline' : 'airplane-outline'}
        iconTone={bonus ? 'accent' : 'primary'}
        right={
          <View style={s.rowRight}>
            <Chip
              label={bonus ? `+${item.days}일` : `${item.days}일`}
              size="sm"
              tone={bonus ? 'accent' : 'neutral'}
            />
            <PressScale
              onPress={() => onDelete(item.id, item.date)}
              haptic="light"
              style={s.trash}
              accessibilityLabel="삭제"
            >
              <Ionicons name="trash-outline" size={17} color={tc.textLight} />
            </PressScale>
          </View>
        }
      />
      {!last ? <Divider inset={48} /> : null}
    </Animated.View>
  );

  return (
    <>
      <Screen
        ad={AD_UNITS.LEAVE_BOTTOM}
        header={embedded ? undefined : <AppHeader title="휴가 관리" />}
        contentContainerStyle={embedded ? { paddingTop: sp.xs } : undefined}
      >
        {/* 잔여 휴가 — 사람들이 실제로 원하는 유일한 숫자 */}
        <Section index={0}>
          <HeroCard>
            <View style={s.heroTop}>
              <Txt role="label" tone="heroMuted">잔여 휴가</Txt>

              {!editingBase ? (
                <Chip
                  label={`기본 ${leaveBase}일 수정`}
                  icon="create-outline"
                  size="sm"
                  onPress={() => setEditingBase(true)}
                  style={s.heroChip}
                  textStyle={{ color: tc.heroText }}
                />
              ) : null}
            </View>

            {/* 기본휴가 수정 — 칩이 그 자리에서 스테퍼로 뒤집힌다.
                예전의 별도 baseEditRow 블록(+상단 구분선)이 통째로 사라진다. */}
            {editingBase ? (
              <Animated.View
                entering={m.enter(FadeInDown, 0, motion.duration.fast)}
                layout={m.layout(LinearTransition.springify())}
                style={s.stepper}
              >
                <PressScale onPress={() => stepBase(-1)} haptic="select" style={s.stepBtn}>
                  <Ionicons name="remove" size={18} color={tc.heroText} />
                </PressScale>

                <TextInput
                  style={s.stepInput}
                  value={baseInput}
                  onChangeText={(t) => setBaseInput(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                />

                <PressScale onPress={() => stepBase(1)} haptic="select" style={s.stepBtn}>
                  <Ionicons name="add" size={18} color={tc.heroText} />
                </PressScale>

                <Button title="저장" size="sm" variant="accent" onPress={handleSaveBase} />
                <Button
                  title="취소"
                  size="sm"
                  variant="ghost"
                  onPress={() => { setEditingBase(false); setBaseInput(String(leaveBase)); }}
                  textStyle={{ color: tc.heroText }}
                  style={{ borderColor: tc.heroBorder }}
                />
              </Animated.View>
            ) : null}

            <View style={s.heroAmount}>
              <AnimatedNumber
                value={leftDays}
                style={[ty.display, { color: tc.heroText }]}
              />
              <Txt role="subtitle" tone="hero">일</Txt>
            </View>

            <View style={s.usageHead}>
              <Txt role="caption" tone="heroMuted">사용량</Txt>
              <Txt role="caption" tone="hero" numeric>
                {usedDays} / {totalDays}일
              </Txt>
            </View>
            <ProgressBar progress={usedRatio} height={8} tone="hero" />

            <View style={s.statRow}>
              <StatTile label="기본" value={leaveBase} unit="일" onHero countUp />
              <StatTile label="포상" value={bonusDays} unit="일" onHero countUp />
              <StatTile label="사용" value={usedDays} unit="일" onHero countUp />
            </View>
          </HeroCard>
        </Section>

        {/* 추가 버튼 */}
        <Section index={1}>
          <View style={s.btnRow}>
            <Button
              title="휴가 사용"
              icon="add"
              onPress={() => setModalType(MODAL_USE)}
              style={{ flex: 1 }}
            />
            <Button
              title="포상휴가 추가"
              icon="medal-outline"
              variant="accent"
              onPress={() => setModalType(MODAL_BONUS)}
              style={{ flex: 1 }}
            />
          </View>
        </Section>

        {/* 달력 안내 */}
        <Section index={2}>
          <Card pad="none" style={{ paddingHorizontal: 0 }}>
            <ListRow
              title="휴가·일정 달력"
              subtitle="이번 달 전체를 한눈에 볼 수 있어요"
              icon="calendar-outline"
              chevron
              onPress={() => navigation.navigate('calendar', { section: 'month', ts: Date.now() })}
              style={{ paddingHorizontal: sp.lg }}
            />
          </Card>
        </Section>

        {/* 포상휴가 */}
        {bonusRecords.length > 0 ? (
          <Section index={3}>
            <Card>
              <SectionTitle
                icon="medal-outline"
                tone="accent"
                right={<Txt role="caption" tone="secondary">총 {bonusDays}일 추가</Txt>}
              >
                포상휴가
              </SectionTitle>
              <View style={{ marginTop: sp.xs }}>
                {bonusRecords.map((item, i) => (
                  <RecordRow
                    key={item.id}
                    item={item}
                    bonus
                    onDelete={handleDeleteBonus}
                    last={i === bonusRecords.length - 1}
                  />
                ))}
              </View>
            </Card>
          </Section>
        ) : null}

        {/* 사용 기록 */}
        <Section index={4}>
          <Card>
            <SectionTitle
              icon="list-outline"
              right={<Txt role="caption" tone="secondary">총 {usedDays}일 사용</Txt>}
            >
              사용 기록
            </SectionTitle>

            {records.length === 0 ? (
              <EmptyState
                icon="file-tray-outline"
                title="아직 휴가 기록이 없어요"
                desc="휴가를 다녀왔다면 기록해두세요. 잔여 일수가 자동으로 계산됩니다."
                action={{
                  label: '휴가 사용 기록 추가',
                  icon: 'add',
                  onPress: () => setModalType(MODAL_USE),
                }}
                compact
              />
            ) : (
              <View style={{ marginTop: sp.xs }}>
                {records.map((item, i) => (
                  <RecordRow
                    key={item.id}
                    item={item}
                    onDelete={handleDeleteUse}
                    last={i === records.length - 1}
                  />
                ))}
              </View>
            )}
          </Card>
        </Section>
      </Screen>


      {/* 추가 시트 (사용 / 포상 공용) */}
      <BottomSheet visible={modalType !== MODAL_NONE} onClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Txt role="subtitle" style={{ marginBottom: sp.lg }}>
              {isBonus ? '포상휴가 추가' : '휴가 사용 기록'}
            </Txt>

            {isBonus ? (
              <>
                <View style={s.notice}>
                  <Ionicons name="information-circle-outline" size={16} color={tc.accentText} />
                  <Txt role="caption" tone="accent" style={{ flex: 1 }}>
                    포상휴가는 총 가용 휴가에 자동으로 합산됩니다.
                  </Txt>
                </View>

                <DatePickerField
                  label="포상휴가 부여일"
                  value={formDate}
                  onChange={setFormDate}
                  placeholder="날짜를 선택하세요"
                />

                <Txt role="label" tone="secondary" style={s.formLabel}>포상 일수</Txt>
                <TextInput
                  style={s.input}
                  value={formDays}
                  onChangeText={(t) => setFormDays(t.replace(/[^0-9]/g, ''))}
                  placeholder="숫자만 입력 (예: 3)"
                  placeholderTextColor={tc.textLight}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </>
            ) : (
              <>
                <Txt role="label" tone="secondary" style={s.formLabel}>
                  휴가 기간 (시작 ~ 종료)
                </Txt>
                <View style={s.calendarBox}>
                  <RangeCalendar
                    startDate={formDate}
                    endDate={formEndDate}
                    onChange={(start, end) => { setFormDate(start); setFormEndDate(end); }}
                  />
                </View>
              </>
            )}

            <Txt role="label" tone="secondary" style={s.formLabel}>메모 (선택)</Txt>
            <TextInput
              style={[s.input, s.textarea]}
              value={formMemo}
              onChangeText={setFormMemo}
              placeholder={isBonus ? '예) 분대장 포상, GOP 포상' : '예) 1박 2일 귀향'}
              placeholderTextColor={tc.textLight}
              multiline
              numberOfLines={2}
            />

            <View style={s.sheetBtns}>
              <Button title="취소" variant="ghost" onPress={closeModal} style={{ flex: 1 }} />
              <Button
                title="저장"
                variant={isBonus ? 'accent' : 'primary'}
                onPress={isBonus ? handleAddBonus : handleAddUse}
                style={{ flex: 1 }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>
    </>
  );
}

const makeStyles = (tc) =>
  StyleSheet.create({
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: sp.sm,
    },
    heroChip: { backgroundColor: 'rgba(255,255,255,0.12)' },
    heroAmount: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: sp.xs,
      marginTop: sp.xs,
      marginBottom: sp.lg,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.sm,
      marginTop: sp.md,
    },
    stepBtn: {
      width: 34,
      height: 34,
      borderRadius: r.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    stepInput: {
      width: 56,
      height: 34,
      borderRadius: r.sm,
      backgroundColor: 'rgba(255,255,255,0.12)',
      color: tc.heroText,
      textAlign: 'center',
      ...ty.body,
      fontWeight: '800',
      padding: 0,
    },

    usageHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: sp.sm,
    },
    statRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.lg },

    btnRow: { flexDirection: 'row', gap: sp.sm },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
    trash: { padding: sp.xs },

    notice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.sm,
      backgroundColor: tc.accentSoft,
      borderRadius: r.sm,
      padding: sp.md,
      marginBottom: sp.md,
    },
    formLabel: { marginTop: sp.md, marginBottom: sp.sm },
    input: {
      backgroundColor: tc.surfaceSunken,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: tc.surfaceSunkenBorder,
      borderRadius: r.sm,
      paddingHorizontal: sp.md,
      paddingVertical: sp.md,
      ...ty.bodyLg,
      color: tc.text,
    },
    textarea: { minHeight: 64, textAlignVertical: 'top' },
    calendarBox: {
      backgroundColor: tc.surfaceSunken,
      borderRadius: r.md,
      padding: sp.sm,
    },
    sheetBtns: { flexDirection: 'row', gap: sp.sm, marginTop: sp.xl },
  });
