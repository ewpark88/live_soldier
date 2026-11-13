import React, { useState, useCallback, useMemo } from 'react';
import {
  Alert, StyleSheet, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import SectionTitle from '../components/SectionTitle';
import Card from '../components/Card';
import SegmentBar from '../components/SegmentBar';
import DatePickerField from '../components/DatePickerField';
import RangeCalendar from '../components/RangeCalendar';
import SetupRequired from '../components/SetupRequired';
import {
  Screen, Section, HeroCard, Button, Chip, StatTile,
  ListRow, Divider, EmptyState, Txt, AnimatedNumber, PressScale,
  Stepper, TextField, FormSheet, GROUP_INSET,
} from '../components/ui';
import {
  loadLeaveRecords, addLeaveRecord, deleteLeaveRecord,
  loadLeaveTotal, saveLeaveTotal, loadLeaveAnnual, saveLeaveAnnual,
  loadLeaveBonusRecords, addLeaveBonusRecord, deleteLeaveBonusRecord,
  loadMilitaryInfo,
} from '../utils/storage';
import { formatDateKo, daysBetweenInclusive, overlappingDates } from '../utils/dateUtils';
import { isOfficer, josa, termsFor } from '../constants/serviceTerms';
import { annualLeaveSummary, leaveUsedByYear } from '../utils/leaveUtils';
import useToday from '../hooks/useToday';
import useShowInterstitial from '../hooks/useShowInterstitial';
import { useSaving } from '../hooks/useSaving';
import { useMotion } from '../hooks/useMotion';
import { haptic } from '../utils/haptics';
import { guardSave, guardDelete, SAVE_FAILED } from '../utils/saveGuard';
import { motion, radius as r, space as sp, type as ty } from '../theme/tokens';
import { refreshScheduledNotifications } from '../utils/notifications';
import { updateDischargeWidget } from '../widget/updateWidget';

const MODAL_NONE = null;
const MODAL_USE = 'use';
const MODAL_BONUS = 'bonus';

/**
 * 휴가 관리 — 캘린더 탭(CalendarScreen)의 '휴가' 세그먼트 콘텐츠.
 *
 * 라우트가 아니다. 헤더·세그먼트·광고 푸터는 부모가 그리고, 상단 inset 도 부모가
 * 이미 소비했으므로 다시 먹이지 않는다. (예전엔 단독 화면 모드도 있었지만 v1.0.8
 * 이후 어디서도 단독으로 쓰지 않아 걷어냈다.)
 */
/**
 * 기록 한 줄 — 카드 하나씩 띄우지 않고 한 카드 안에 헤어라인으로 나눈다.
 *
 * 모듈 최상위에 둬야 한다. 예전엔 LeaveScreen 렌더 본문 안에서 정의해서
 * 렌더마다 컴포넌트 타입이 새로 만들어졌고, 기본휴가 입력란에 한 글자 칠 때마다
 * 모든 행이 언마운트·재마운트되며 FadeInDown 이 다시 돌았다.
 * (TodoScreen 의 TodoItem 과 같은 방식)
 */
/** 기본 휴가 입력 상한 — 간부는 '올해 연가'(연 단위, v1.6)라 60일, 그 외는 복무기간 전체 100일 */
function baseMaxFor(personnelType) {
  return isOfficer(personnelType) ? 60 : 100;
}

/** 간부 연가 입력 시작값 — 근속 6년 이상 기준 연 21일 (고칠 수 있다) */
const CADRE_ANNUAL_SUGGEST = 21;

function RecordRow({ item, bonus, bonusLabel = '포상휴가', onDelete, last }) {
  const tc = useThemeColors();
  const m = useMotion();
  const s = useMemo(() => makeStyles(tc), [tc]);
  return (
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
              accessibilityRole="button"
              accessibilityLabel={`${formatDateKo(item.date)} ${bonus ? bonusLabel : '휴가'} 기록 삭제`}
            >
              <Ionicons name="trash-outline" size={18} color={tc.textLight} />
            </PressScale>
          </View>
        }
      />
      {!last ? <Divider inset={GROUP_INSET - sp.lg} /> : null}
    </Animated.View>
  );
}

export default function LeaveScreen() {
  const tc = useThemeColors();
  const m = useMotion();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [militaryInfo, setMilitaryInfo] = useState(undefined);
  const [records, setRecords] = useState([]);
  const [bonusRecords, setBonusRecords] = useState([]);
  const [leaveBase, setLeaveBase] = useState(0);   // loadLeaveTotal 이 군종 기본값으로 채운다
  // 간부(v1.6): 복무기간 전체가 아니라 '올해 연가' — data.leaveAnnual. null = 미설정
  const [leaveAnnual, setLeaveAnnual] = useState(null);
  const today = useToday();
  const year = Number(today.slice(0, 4));
  const [editingBase, setEditingBase] = useState(false);
  const [baseInput, setBaseInput] = useState('21');
  const [modalType, setModalType] = useState(MODAL_NONE);
  // 기록 모달이 열려 있을 때만 전면광고를 프리로드한다
  const { show: showAd } = useShowInterstitial(modalType !== MODAL_NONE);

  const [formDate, setFormDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDays, setFormDays] = useState('');
  const [formMemo, setFormMemo] = useState('');
  // 저장 중 재진입 차단 — 연타하면 같은 기록이 두 건 들어가 남은 휴가가 틀어졌다.
  // ref 는 같은 프레임의 두 번째 탭을 막고, state 는 버튼 로딩 표시용이다.
  const { saving, savingRef, run: runSave } = useSaving();

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const mi = await loadMilitaryInfo();
      setMilitaryInfo(mi);
      if (!mi) return;
      setRecords(await loadLeaveRecords());
      setBonusRecords(await loadLeaveBonusRecords());
      if (isOfficer(mi.personnelType)) {
        // 간부는 연 단위 — leaveTotal 은 건드리지 않는다 (구버전 앱이 그대로 읽는 값)
        const annual = await loadLeaveAnnual();
        setLeaveAnnual(annual);
        setLeaveBase(annual ?? 0);
        setBaseInput(String(annual ?? CADRE_ANNUAL_SUGGEST));
        return;
      }
      const lt = await loadLeaveTotal();
      setLeaveBase(lt);
      // 대체복무(사회복무요원 제외)는 기본값이 0(미설정)이다 — 스테퍼는 1 이상만 받으니
      // 입력 시작값만 15로 두고, 저장하기 전까지 기본 휴가는 0 그대로다.
      setBaseInput(String(lt > 0 ? lt : 15));
    } catch (e) {
      // 빈 화면에 갇히지 않게 — 미설정 안내로 떨어진다
      setMilitaryInfo((prev) => (prev === undefined ? null : prev));
    }
  };

  const cadre = isOfficer(militaryInfo?.personnelType);
  const allUsedDays = records.reduce((acc, x) => acc + (x.days || 0), 0);
  // 간부: 올해(달력 연도) 창으로 센다 — 올해 연가 + 올해 부여된 포상휴가 − 올해 쓴 날
  const annual = cadre ? annualLeaveSummary(records, leaveAnnual, year, bonusRecords) : null;
  const usedDays = cadre ? annual.used : allUsedDays;
  const bonusDays = cadre ? annual.bonus : bonusRecords.reduce((acc, x) => acc + (x.days || 0), 0);
  const totalDays = cadre ? annual.total : leaveBase + bonusDays;
  const leftDays = totalDays - usedDays;
  const pastYears = cadre ? leaveUsedByYear(records, year).slice(0, 3) : [];

  const handleSaveBase = async () => {
    const val = parseInt(baseInput, 10);
    const maxBase = baseMaxFor(militaryInfo?.personnelType);
    if (isNaN(val) || val < 1 || val > maxBase) {
      haptic.warning();
      Alert.alert('오류', `1~${maxBase} 사이의 숫자를 입력해주세요.`);
      return;
    }
    if ((await guardSave(() => (cadre ? saveLeaveAnnual(val) : saveLeaveTotal(val)))) === SAVE_FAILED) return;
    if (cadre) setLeaveAnnual(val);
    setLeaveBase(val);
    setEditingBase(false);
    haptic.success();
  };


  const commitUse = (days) => runSave(async () => {
    const next = await guardSave(() => addLeaveRecord({ date: formDate, days, memo: formMemo.trim() }));
    if (next === SAVE_FAILED) return;   // 모달을 닫지 않는다 — 입력을 날리지 않기 위해
    setRecords(next);
    haptic.success();
    resetModal();
    afterLeaveChanged();
    showAd();
  });

  // 휴가 기록은 '휴가 전날' 알림과 위젯의 '다음 휴가' 줄의 재료다
  const afterLeaveChanged = () => {
    refreshScheduledNotifications().catch(() => {});
    updateDischargeWidget();
  };

  const handleAddUse = () => {
    if (savingRef.current) return;
    if (!formDate) { haptic.warning(); Alert.alert('오류', '휴가 시작일을 선택해주세요.'); return; }
    const days = daysBetweenInclusive(formDate, formEndDate || formDate);
    if (days < 1) { haptic.warning(); Alert.alert('오류', '휴가 날짜를 다시 선택해주세요.'); return; }

    // 이미 기록된 날짜와 겹치면 사용 일수가 이중으로 잡힌다 — 확인을 받는다
    const dup = overlappingDates(records, formDate, days);
    if (dup.length) {
      haptic.warning();
      Alert.alert(
        '겹치는 날짜',
        `${formatDateKo(dup[0])}${dup.length > 1 ? ` 외 ${dup.length - 1}일` : ''}은(는) 이미 휴가로 기록돼 있어요.
그래도 추가할까요?`,
        [
          { text: '취소', style: 'cancel' },
          { text: '추가', onPress: () => commitUse(days) },
        ]
      );
      return;
    }
    commitUse(days);
  };

  const handleAddBonus = () => {
    if (!formDate) { haptic.warning(); Alert.alert('오류', '부여일을 선택해주세요.'); return; }
    const days = parseInt(formDays, 10);
    if (isNaN(days) || days < 1) { haptic.warning(); Alert.alert('오류', '일수를 올바르게 입력해주세요.'); return; }
    runSave(async () => {
      const next = await guardSave(() => addLeaveBonusRecord({ date: formDate, days, memo: formMemo.trim() }));
      if (next === SAVE_FAILED) return;
      setBonusRecords(next);
      haptic.success();
      resetModal();
      showAd();
    });
  };

  const handleDeleteUse = (id, date) => {
    Alert.alert('삭제', `${formatDateKo(date)} 휴가 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const next = await guardDelete(() => deleteLeaveRecord(id));
          if (next === SAVE_FAILED) return;
          setRecords(next);
          afterLeaveChanged();
        },
      },
    ]);
  };

  const handleDeleteBonus = (id, date) => {
    Alert.alert('삭제', `${formatDateKo(date)} ${josa(bonusLabel, '을/를')} 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const next = await guardDelete(() => deleteLeaveBonusRecord(id));
          if (next !== SAVE_FAILED) setBonusRecords(next);
        },
      },
    ]);
  };

  /* 사용자가 닫기(배경 탭·뒤로가기) — 저장 중엔 막는다 (TodoScreen.closeSheet 와 같은 규칙).
     저장 성공 경로는 savingRef 가 아직 true 라 resetModal 을 직접 부른다. */
  const closeModal = () => {
    if (savingRef.current) return;
    resetModal();
  };

  const resetModal = () => {
    setModalType(MODAL_NONE);
    setFormDate('');
    setFormEndDate('');
    setFormDays('');
    setFormMemo('');
  };

  const isBonus = modalType === MODAL_BONUS;
  // 대체복무 (v1.6): '포상휴가'가 없다 — 병가·특별휴가 같은 '추가 휴가'로 부른다
  const terms = termsFor(militaryInfo?.personnelType);
  const bonusLabel = terms.bonusLeave;
  const bonusShort = bonusLabel === '포상휴가' ? '포상' : '추가';
  const baseUnset = leaveBase <= 0;
  const suggest = cadre ? CADRE_ANNUAL_SUGGEST : 15;

  if (militaryInfo === undefined) return <Screen scroll={false} />;
  if (!militaryInfo) return <SetupRequired />;


  return (
    <>
      {/* 광고는 CalendarScreen 이 세그먼트 밖에 하나만 그린다 */}
      <Screen contentContainerStyle={{ paddingTop: sp.xs }}>
        {/* 잔여 휴가 — 사람들이 실제로 원하는 유일한 숫자 */}
        <Section index={0}>
          <HeroCard>
            <View style={s.heroTop}>
              <Txt role="label" tone="heroMuted">{cadre ? `올해(${year}) 남은 연가` : '잔여 휴가'}</Txt>

              {!editingBase ? (
                <Chip
                  label={baseUnset
                    ? (cadre ? '올해 연가 입력' : '총 휴가 일수 입력')
                    : (cadre ? `연가 ${leaveBase}일 수정` : `기본 ${leaveBase}일 수정`)}
                  icon="create-outline"
                  size="sm"
                  onHero
                  onPress={() => setEditingBase(true)}
                  accessibilityLabel={baseUnset
                    ? (cadre ? '올해 연가 일수 입력' : '총 휴가 일수 입력')
                    : `${cadre ? '올해 연가' : '기본 휴가'} ${leaveBase}일, 수정`}
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
                <Stepper
                  value={baseInput}
                  onChange={(v) => setBaseInput(String(v))}
                  min={1}
                  max={baseMaxFor(militaryInfo?.personnelType)}
                  label={cadre ? '올해 연가 일수' : '기본 휴가 일수'}
                  editable
                  onHero
                />

                <Button title="저장" size="sm" onPress={handleSaveBase} />
                <Button
                  title="취소"
                  size="sm"
                  variant="ghost"
                  // 미설정(0)으로 되돌리면 스테퍼가 min(1) 아래 값을 들고 있게 된다
                  onPress={() => { setEditingBase(false); setBaseInput(String(leaveBase > 0 ? leaveBase : suggest)); }}
                  textStyle={{ color: tc.heroText }}
                  style={{ borderColor: tc.heroBorder }}
                />
              </Animated.View>
            ) : null}

            {baseUnset && !editingBase ? (
              <Txt role="caption" tone="heroMuted" style={{ marginTop: sp.xs }}>
                {cadre
                  ? '간부 연가는 매년 부여돼요 — 올해 연가 일수를 입력하세요'
                  : '근무처 규정에 맞춰 총 휴가 일수를 입력하세요'}
              </Txt>
            ) : null}

            {/* 기본 휴가가 미설정(0)이면 잔여가 '-사용일'로 음수가 된다 — 숫자 대신 안내.
                (예: v1.5 까지 군종 기본값 24일을 쓰던 간부가 휴가를 기록해 둔 경우) */}
            {baseUnset ? (
              <Txt role="subtitle" tone="hero" style={{ marginTop: sp.sm }}>
                {cadre ? '올해 연가 일수를 먼저 입력해 주세요' : '총 휴가 일수를 먼저 입력해 주세요'}
              </Txt>
            ) : (
              <View style={s.heroAmount}>
                <AnimatedNumber
                  value={leftDays}
                  style={[ty.display, { color: tc.heroText }]}
                />
                <Txt role="subtitle" tone="hero">일</Txt>
              </View>
            )}

            <View style={s.usageHead}>
              <Txt role="caption" tone="heroMuted">사용량</Txt>
              <Txt role="caption" tone="hero" numeric>
                {usedDays} / {totalDays}일
              </Txt>
            </View>
            {/* 칸 하나가 하루다 — 남은 칸을 눈으로 셀 수 있다.
               연속 바는 "62% 썼다"만 말하고 "9일 남았다"는 못 말한다. */}
            <SegmentBar total={totalDays} filled={usedDays} height={10} onHero />

            <View style={s.statRow}>
              <StatTile label={cadre ? '연가' : '기본'} value={leaveBase} unit="일" onHero countUp />
              <StatTile label={bonusShort} value={bonusDays} unit="일" onHero countUp />
              <StatTile label="사용" value={usedDays} unit="일" onHero countUp />
            </View>

            {/* 간부: 올해 연가 요약 + 지난 해 사용량 (최근 3년) */}
            {cadre && !baseUnset ? (
              <Txt role="caption" tone="heroMuted" style={{ marginTop: sp.sm }}>
                {`올해(${year}) 연가 ${leaveBase}일${bonusDays ? ` + ${bonusLabel} ${bonusDays}일` : ''} · 사용 ${usedDays}일 · 남은 ${leftDays}일`}
              </Txt>
            ) : null}
            {pastYears.length ? (
              <Txt role="caption" tone="heroMuted" style={{ marginTop: sp.xs }}>
                {`지난 해 사용 · ${pastYears.map((p) => `${p.year}년 ${p.used}일`).join(' · ')}`}
              </Txt>
            ) : null}
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
              title={`${bonusLabel} 추가`}
              icon="medal-outline"
              variant="accent"
              onPress={() => setModalType(MODAL_BONUS)}
              style={{ flex: 1 }}
            />
          </View>
        </Section>

        {/* 포상휴가 (대체복무: 추가 휴가) */}
        {bonusRecords.length > 0 ? (
          <Section index={3}>
            <Card>
              <SectionTitle
                icon="medal-outline"
                tone="accent"
                right={<Txt role="caption" tone="secondary">총 {bonusDays}일 추가</Txt>}
              >
                {bonusLabel}
              </SectionTitle>
              <View style={{ marginTop: sp.xs }}>
                {bonusRecords.map((item, i) => (
                  <RecordRow
                    key={item.id}
                    item={item}
                    bonus
                    bonusLabel={bonusLabel}
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
              right={
                <Txt role="caption" tone="secondary">
                  {cadre ? `올해 ${usedDays}일 · 전체 ${allUsedDays}일` : `총 ${usedDays}일 사용`}
                </Txt>
              }
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
      <FormSheet
        visible={modalType !== MODAL_NONE}
        onClose={closeModal}
        title={isBonus ? `${bonusLabel} 추가` : '휴가 사용 기록'}
        onSubmit={isBonus ? handleAddBonus : handleAddUse}
        submitVariant={isBonus ? 'accent' : 'primary'}
        saving={saving}
      >
        {isBonus ? (
          <>
            <View style={s.notice}>
              <Ionicons name="information-circle-outline" size={16} color={tc.accentText} />
              <Txt role="caption" style={{ flex: 1, color: tc.accentText }}>
                {cadre
                  ? `${josa(bonusLabel, '은/는')} 부여일이 속한 해의 연가에 합산됩니다.`
                  : `${josa(bonusLabel, '은/는')} 총 가용 휴가에 자동으로 합산됩니다.`}
              </Txt>
            </View>

            <DatePickerField
              label={`${bonusLabel} 부여일`}
              value={formDate}
              onChange={setFormDate}
              placeholder="날짜를 선택하세요"
            />

            <TextField
              label={`${bonusShort} 일수`}
              value={formDays}
              onChangeText={(t) => setFormDays(t.replace(/[^0-9]/g, ''))}
              placeholder="숫자만 입력 (예: 3)"
              keyboardType="number-pad"
              maxLength={3}
              suffix="일"
            />
          </>
        ) : (
          <View style={{ gap: sp.sm }}>
            <Txt role="label" tone="secondary">휴가 기간 (시작 ~ 종료)</Txt>
            <View style={s.calendarBox}>
              <RangeCalendar
                startDate={formDate}
                endDate={formEndDate}
                onChange={(start, end) => { setFormDate(start); setFormEndDate(end); }}
              />
            </View>
          </View>
        )}

        <TextField
          label="메모 (선택)"
          value={formMemo}
          onChangeText={setFormMemo}
          placeholder={isBonus ? terms.bonusLeaveHint : '예) 1박 2일 귀향'}
          multiline
          numberOfLines={2}
          maxLength={60}
        />
      </FormSheet>
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
    heroAmount: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: sp.xs,
      marginTop: sp.xs,
      marginBottom: sp.lg,
    },
    stepper: {
      flexDirection: 'row',
      flexWrap: 'wrap',   // 360dp + 큰 글꼴에서 저장/취소가 히어로 밖으로 밀려났다
      alignItems: 'center',
      gap: sp.sm,
      marginTop: sp.md,
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
    // 아이콘은 18 이지만 누르는 면적은 40 — 예전엔 ~25 라 옆 칩을 잘못 누르기 쉬웠다
    trash: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

    notice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sp.sm,
      backgroundColor: tc.accentSoft,
      borderRadius: r.sm,
      padding: sp.md,
    },
    calendarBox: {
      backgroundColor: tc.surfaceSunken,
      borderRadius: r.md,
      padding: sp.sm,
    },
  });
