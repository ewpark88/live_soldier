import React, { useState, useCallback, useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown, LinearTransition,
  useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeContext';
import SectionTitle from '../components/SectionTitle';
import Card from '../components/Card';
import JourneyRail from '../components/JourneyRail';
import DatePickerField from '../components/DatePickerField';
import {
  Screen, AppHeader, Section, HeroCard, Grid, Button, Chip,
  ListRow, ListGroup, Txt, AnimatedNumber, PressScale, Stepper, SegmentedControl,
  FormSheet, TextField,
} from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import {
  loadMilitaryInfo, saveMilitaryInfo,
  loadRankPromotions, saveRankPromotions, resetRankPromotions, calcDefaultPromotions,
  savePersonnelType, loadPersonnelType, unmarkCelebrated,
} from '../utils/storage';
import { ranksFor } from '../constants/militaryRanks';
import useShowInterstitial from '../hooks/useShowInterstitial';
import { useSaving } from '../hooks/useSaving';
import { useMotion } from '../hooks/useMotion';
import { haptic } from '../utils/haptics';
import { guardSave, SAVE_FAILED } from '../utils/saveGuard';
import {
  calcDischargeDate, calcDaysLeft, calcProgress, formatDate, formatDateKo,
  isFutureDate, isValidDateString, parseDate,
  getMessageForPhase,
} from '../utils/dateUtils';
import { todayStr } from '../utils/daily';
import {
  buildRoadmap, cadreCurrentRank, validOfficerPromotions, validExtensions, baseServiceMonths,
} from '../utils/roadmapUtils';
import {
  BRANCHES, PERSONNEL_TYPES, isOfficer, isAlternative, hasSoldierRanks,
  defaultMonthsFor, subTypesFor, serviceLabel, branchLabelOf, savingsEligible, termsFor, josa,
} from '../constants/serviceTerms';
import { getPhase } from '../constants/phases';
import { updateDischargeWidget } from '../widget/updateWidget';
import { refreshScheduledNotifications } from '../utils/notifications';
import { motion, radius as r, space as sp, type as ty } from '../theme/tokens';

const PROMO_RANKS = ['일병', '상병', '병장'];

/* 현역 | 대체복무 — 신분 그리드를 두 묶음으로 나눈다 (8종을 한 그리드에 두면 읽히지 않는다) */
const GROUP_OPTIONS = [
  { key: 'active', label: '현역' },
  { key: 'alt', label: '대체복무' },
];

/** 응원 메시지 풀 선택 — 대체복무면 종료 용어, 현역이면 null (dateUtils 규약) */
/* 간부 의무복무기간 빠른 선택 — 흔한 경로만 (실제 기간은 임관 경로·군별마다 달라 고칠 수 있다).
   예전엔 24/36/48 숫자만 있어 무엇이 몇 개월인지 알 수 없었다. */
const CADRE_PRESETS = {
  nco: [
    { months: 48, label: '단기 부사관 48개월' },
  ],
  officer: [
    { months: 28, label: 'ROTC(육군) 28개월' },
    { months: 36, label: '학사장교 36개월' },
    { months: 120, label: '사관학교 120개월' },
  ],
};

/* 간부 복무개월 상한 — 장기복무(20년 이상)도 담는다. 공유 코드 디코더(구버전 포함)는
   600 까지 받으므로 호환된다. 대체복무는 기존 240 그대로. */
const CADRE_MAX_MONTHS = 480;
const ALT_MAX_MONTHS = 240;
const EXT_MAX_MONTHS = 120;   // 연장 1건 상한

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const altEndOf = (pt) => (isAlternative(pt) ? termsFor(pt).end : null);

/** 신분 타일 보조 문구 — 대체복무만 기본 복무개월 ('34·23개월'), 현역은 없음 */
function typeMonthsSub(pt) {
  if (!pt.months) return undefined;
  const ms = [...new Set(subTypesFor(pt.key).map((x) => x.months))];
  return `${(ms.length ? ms : [pt.months]).join('·')}개월`;
}

/** 세부 유형 기본값 — 이전 선택이 그 유형에 있으면 유지, 없으면 첫 항목 */
function pickSubType(pt, prev) {
  const subs = subTypesFor(pt);
  if (!subs.length) return null;
  return subs.some((x) => x.key === prev) ? prev : subs[0].key;
}

/* 복무 단계는 constants/phases 의 getPhase 하나만 쓴다 — 예전엔 이 파일에
   같은 함수가 한 벌 더 있었다 (경계가 갈라지면 화면마다 단계가 달라진다). */

export default function DischargeScreen({ navigation }) {
  const tc = useThemeColors();
  const m = useMotion();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const [enlistDate, setEnlistDate] = useState('');
  const [branch, setBranch] = useState('army');
  const [personnelType, setPersonnelType] = useState('soldier');
  const [monthsInput, setMonthsInput] = useState('');
  const [officerRank, setOfficerRank] = useState(null);
  const [subType, setSubType] = useState(null);   // 대체복무 세부 유형 (산업기능요원·전문직)
  const [info, setInfo] = useState(null);
  const [editing, setEditing] = useState(false);
  // 전역 정보 폼이 열려 있을 때만 전면광고를 프리로드한다
  const { show: showAd } = useShowInterstitial(editing);

  const [promotions, setPromotions] = useState(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(false);
  const [editPromo, setEditPromo] = useState(null);

  // 간부 복무연장 · 진급 이력 시트 (v1.6)
  const [extOpen, setExtOpen] = useState(false);
  const [extMonths, setExtMonths] = useState('12');
  const [extDate, setExtDate] = useState('');
  const [extMemo, setExtMemo] = useState('');
  const [opOpen, setOpOpen] = useState(false);
  const [opRank, setOpRank] = useState(null);
  const [opDate, setOpDate] = useState('');
  const { saving: cadreSaving, run: runCadre } = useSaving();

  const [message, setMessage] = useState(() => getMessageForPhase('normal'));
  // '다른 메시지 보기' — 오늘의 메시지에서 몇 칸 옮겼나. 메시지가 날짜에 고정된 뒤로
  // 같은 함수를 다시 불러도 같은 문구만 나와서, 버튼이 진동만 하고 아무 일도 안 했다.
  const [msgOffset, setMsgOffset] = useState(0);

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
      // 대체복무는 branch 가 null 이다 — 현역으로 바꿀 때를 대비해 육군으로 둔다
      setBranch(mi.branch ?? 'army');
      setPersonnelType(mi.personnelType ?? 'soldier');
      setOfficerRank(mi.officerRank ?? null);
      setSubType(mi.subType ?? null);
      setMonthsInput(String(mi.months ?? ''));
      setEditing(false);
      setPromotions(hasSoldierRanks(mi.personnelType) ? await loadRankPromotions(mi.enlistDate) : null);
      setMsgOffset(0);
      setMessage(getMessageForPhase(getPhase(calcDaysLeft(mi.dischargeDate)), undefined, 0, altEndOf(mi.personnelType), isOfficer(mi.personnelType)));
    } else {
      const pt = await loadPersonnelType();
      const sub = pickSubType(pt, null);
      setInfo(null);
      setEnlistDate('');
      setBranch('army');
      setPersonnelType(pt ?? 'soldier');
      setOfficerRank(null);
      setSubType(sub);
      // 온보딩에서 대체복무를 골랐으면 기본 복무개월을 미리 채운다
      setMonthsInput(isAlternative(pt) ? String(defaultMonthsFor(pt, sub)) : '');
      setEditing(true);
      setPromotions(null);
    }
  };

  // 저장된 branch 가 손상돼도 크래시하지 않도록 첫 군종으로 폴백
  const selectedBranch = BRANCHES.find((b) => b.key === branch) ?? BRANCHES[0];
  const officer = isOfficer(personnelType);
  const alt = isAlternative(personnelType);
  const group = alt ? 'alt' : 'active';
  const subs = subTypesFor(personnelType);
  const t = termsFor(personnelType);   // 폼(지금 고른 신분) 문구

  /* 신분 선택 — 대체복무는 세부 유형·기본 복무개월을 함께 채운다.
     간부로 바꿀 땐 기존 동작 그대로 (복무개월 입력값 유지). */
  const selectType = (key) => {
    setPersonnelType(key);
    // 고른 계급이 새 신분의 계급표에 없으면 지운다 — 예전엔 부사관에서 '하사'를 고른 뒤
    // 장교로 바꾸면 '장교 · 하사'로 저장됐다 (화면엔 칩이 안 보여 고칠 수도 없었다).
    const ranks = ranksFor(key);
    // 계급이 하나뿐인 신분(준사관 = 준위)은 고를 것이 없으니 바로 채운다
    if (ranks.length === 1) setOfficerRank(ranks[0]);
    else if (!ranks.includes(officerRank)) setOfficerRank(null);
    if (isAlternative(key)) {
      const sub = pickSubType(key, subType);
      setSubType(sub);
      setMonthsInput(String(defaultMonthsFor(key, sub)));
    } else {
      setSubType(null);
    }
  };
  const selectSubType = (key) => {
    setSubType(key);
    setMonthsInput(String(defaultMonthsFor(personnelType, key)));
  };
  const selectGroup = (g) => {
    if (g === group) return;
    selectType(g === 'alt' ? 'social' : 'soldier');
  };

  /* 연타 방지 — 저장 사이에 두 번째 탭이 들어오면 전면광고·햅틱이 두 번 돈다 */
  const { saving, run: runSave } = useSaving();
  const handleSave = () => runSave(_handleSave);

  const _handleSave = async () => {
    if (!enlistDate) { haptic.warning(); Alert.alert('오류', `${josa(t.startDate, '을/를')} 선택해주세요.`); return; }
    if (!isValidDateString(enlistDate)) {
      haptic.warning();
      Alert.alert('오류', `${josa(t.startDate, '이/가')} 올바르지 않습니다. 다시 선택해주세요.`);
      return;
    }
    // 문자열 비교로 판정한다 — new Date('YYYY-MM-DD') 는 UTC 자정으로 파싱돼
    // KST 오전 9시 이전에는 '오늘'이 미래로 잘못 판정됐다.
    if (isFutureDate(enlistDate)) {
      haptic.warning();
      Alert.alert('오류', `${josa(t.startDate, '은/는')} 오늘보다 미래일 수 없습니다.`);
      return;
    }

    let months;
    // 간부·대체복무는 복무개월을 직접 정한다 (대체복무는 기본값이 미리 채워져 있다)
    if (officer || alt) {
      const max = officer ? CADRE_MAX_MONTHS : ALT_MAX_MONTHS;
      months = parseInt(monthsInput, 10);
      if (isNaN(months) || months < 1 || months > max) {
        haptic.warning();
        Alert.alert('오류', `복무 개월 수를 올바르게 입력해주세요 (1~${max}).`);
        return;
      }
    } else {
      months = selectedBranch.months;
    }

    const dischargeDate = calcDischargeDate(enlistDate, months);
    if (!dischargeDate) {
      haptic.warning();
      Alert.alert('오류', `${josa(t.endDate, '을/를')} 계산할 수 없습니다. ${josa(t.startDate, '과/와')} 복무 개월을 확인해주세요.`);
      return;
    }
    /* 간부 복무연장·진급 이력(v1.6)은 이 폼에 없다 — 다시 저장해도 지우지 않고 넘긴다.
       간부 → 간부(부사관→장교 등)면 새 신분의 계급만, 임관일 이후 것만 남긴다. */
    const keepCadre = officer && info && isOfficer(info.personnelType);
    const extensions = keepCadre ? validExtensions(info) : [];
    const officerPromotions = keepCadre
      ? validOfficerPromotions(info, ranksFor(personnelType)).filter((p) => p.date >= enlistDate)
      : [];
    const extSum = extensions.reduce((n, e) => n + e.months, 0);
    if (officer && extSum > 0 && months <= extSum) {
      haptic.warning();
      Alert.alert('오류', `복무 연장 합계(${extSum}개월)보다 총 복무 개월이 커야 합니다.\n연장 기록을 먼저 지우거나 개월 수를 늘려주세요.`);
      return;
    }
    const mi = {
      enlistDate,
      // 대체복무는 군별이 없다 — 공유 코드·동일인 판정·연가 기본값이 모두 null 을 전제한다
      branch: alt ? null : selectedBranch.key,
      personnelType,
      // 진급 이력이 있으면 오늘 기준 계급을 함께 적는다 — 구버전 앱·공유 코드는 이 값만 본다
      officerRank: officer ? (cadreCurrentRank({ personnelType, officerPromotions }) ?? officerRank ?? null) : null,
      subType: alt ? (subType ?? null) : null,
      dischargeDate: formatDate(dischargeDate),
      months,
      ...(officer ? { extensions, officerPromotions } : {}),
    };
    try {
      // 신분 먼저 — 입대정보가 저장된 뒤 신분 저장이 실패하면 loadPersonnelType 은
      // data.personnelType(옛 값)을 우선해서 두 값이 어긋난 채로 남는다.
      await savePersonnelType(personnelType);
      await saveMilitaryInfo(mi);
    } catch (e) {
      // 저장이 실패했는데 성공한 것처럼 화면을 넘기면, 사용자는 입력이
      // 남은 줄 알고 앱을 닫았다가 다음 실행에서 온보딩을 다시 만난다.
      haptic.warning();
      Alert.alert('저장 실패', `${josa(t.info, '을/를')} 저장하지 못했습니다. 기기 저장공간을 확인한 뒤 다시 시도해주세요.`);
      return;
    }

    /* 진급일 초기화는 부수 작업이다 — 입대 정보는 이미 저장됐으니 여기서 실패했다고
       핸들러를 끊으면 편집 화면이 안 닫힌다. 실패하면 이전 진급일이 남고, 진급일
       편집에서 초기화할 수 있다. */
    const resetPromos = () => resetRankPromotions().then(() => true, () => false);
    // 진급 체계는 병사만 — 간부·대체복무로 저장하면 진급일을 비운다
    if (!hasSoldierRanks(personnelType)) {
      if (await resetPromos()) setPromotions(null);
    } else if (!info || info.enlistDate !== enlistDate || info.personnelType !== personnelType) {
      if (await resetPromos()) setPromotions(calcDefaultPromotions(enlistDate));
    }

    setInfo(mi);
    setEditing(false);
    // 입대일이 바뀌면 단계(phase)도 바뀐다 — 메시지를 다시 고른다
    setMsgOffset(0);
    setMessage(getMessageForPhase(getPhase(calcDaysLeft(mi.dischargeDate)), undefined, 0, altEndOf(personnelType), isOfficer(personnelType)));
    updateDischargeWidget();
    refreshScheduledNotifications().catch(() => {});
    haptic.success();
    showAd();
  };

  /* ── 간부: 복무연장 · 진급 이력 (v1.6) ──
     mi.months 는 '연장을 합친 총 개월'이다. 구버전 앱·공유 코드(JY1)·저장소의 전역일 재계산이
     모두 months 만 보므로, 연장 이력이 없는 쪽에서도 전역일은 똑같이 나온다. */
  const persistCadre = async (next, { unmarkFuture = false } = {}) => {
    const d = calcDischargeDate(next.enlistDate, next.months);
    if (!d) { haptic.warning(); Alert.alert('오류', `${josa(ti.endDate, '을/를')} 계산할 수 없습니다.`); return false; }
    const mi = { ...next, dischargeDate: formatDate(d) };
    mi.officerRank = cadreCurrentRank(mi) ?? mi.officerRank ?? null;
    if ((await guardSave(() => saveMilitaryInfo(mi))) === SAVE_FAILED) return false;
    if (unmarkFuture) {
      // 연장으로 다시 미래가 된 '전역 100일 전'·'전역' 은 새 날짜에 다시 축하받아야 한다
      const again = buildRoadmap(mi, null)
        .filter((x) => !x.done && (x.key === 'd100out' || x.key === 'discharge'))
        .map((x) => x.key);
      if (again.length) await unmarkCelebrated(again).catch(() => {});
    }
    setInfo(mi);
    setMonthsInput(String(mi.months));
    setOfficerRank(mi.officerRank);
    updateDischargeWidget();
    refreshScheduledNotifications().catch(() => {});
    haptic.success();
    return true;
  };

  const openExt = () => { setExtMonths('12'); setExtDate(todayStr()); setExtMemo(''); setExtOpen(true); };
  const handleAddExt = () => runCadre(async () => {
    const n = parseInt(extMonths, 10);
    if (!Number.isInteger(n) || n < 1 || n > EXT_MAX_MONTHS) {
      haptic.warning(); Alert.alert('오류', `연장 개월 수를 확인해주세요 (1~${EXT_MAX_MONTHS}).`); return;
    }
    if (!isValidDateString(extDate)) { haptic.warning(); Alert.alert('오류', '연장 결정일을 선택해주세요.'); return; }
    const total = Number(info.months) + n;
    if (total > CADRE_MAX_MONTHS) {
      haptic.warning(); Alert.alert('오류', `총 복무 개월은 ${CADRE_MAX_MONTHS}개월을 넘을 수 없습니다.`); return;
    }
    const ext = { id: newId(), months: n, date: extDate, memo: extMemo.trim().slice(0, 40) || null };
    const ok = await persistCadre({ ...info, months: total, extensions: [...validExtensions(info), ext] }, { unmarkFuture: true });
    if (ok) setExtOpen(false);
  });
  const handleDeleteExt = (e) => {
    Alert.alert('연장 기록 삭제', `+${e.months}개월 연장을 지우면 ${josa(ti.endDate, '이/가')} 그만큼 당겨집니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => runCadre(() => persistCadre({
          ...info,
          months: Math.max(1, Number(info.months) - e.months),
          extensions: validExtensions(info).filter((x) => x.id !== e.id),
        })),
      },
    ]);
  };

  const openOp = () => {
    const ranks = ranksFor(info.personnelType);
    const have = validOfficerPromotions(info).map((p) => p.rank);
    const cur = cadreCurrentRank(info) ?? info.officerRank;
    // 다음 계급을 미리 골라 둔다 (현재 계급 다음, 이미 기록한 계급은 건너뜀)
    const start = cur ? ranks.indexOf(cur) + 1 : 0;
    setOpRank(ranks.slice(Math.max(0, start)).find((rk) => !have.includes(rk)) ?? null);
    setOpDate('');
    setOpOpen(true);
  };
  const handleAddOp = () => runCadre(async () => {
    const ranks = ranksFor(info.personnelType);
    if (!opRank || !ranks.includes(opRank)) { haptic.warning(); Alert.alert('오류', '진급한 계급을 골라주세요.'); return; }
    if (!isValidDateString(opDate)) { haptic.warning(); Alert.alert('오류', '진급일을 선택해주세요.'); return; }
    if (opDate < info.enlistDate || opDate > info.dischargeDate) {
      haptic.warning();
      Alert.alert('오류', `진급일은 ${josa(ti.startDate, '과/와')} ${ti.endDate} 사이여야 합니다.`);
      return;
    }
    const list = validOfficerPromotions(info, ranks).filter((p) => p.rank !== opRank);
    const next = [...list, { rank: opRank, date: opDate }].sort((a, b) => (a.date < b.date ? -1 : 1));
    // 날짜 순서와 계급 순서가 같아야 한다 (중위 다음에 소위로 '진급'할 수 없다)
    const inOrder = next.every((p, i) => i === 0 || ranks.indexOf(p.rank) > ranks.indexOf(next[i - 1].rank));
    if (!inOrder) {
      haptic.warning();
      Alert.alert('오류', '진급 순서가 맞지 않습니다.\n계급이 높을수록 진급일이 늦어야 합니다.');
      return;
    }
    const ok = await persistCadre({ ...info, officerPromotions: next });
    if (ok) setOpOpen(false);
  });
  const handleDeleteOp = (p) => {
    Alert.alert('진급 기록 삭제', `${p.rank} 진급 기록을 지울까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => runCadre(() => {
          const rest = validOfficerPromotions(info).filter((x) => x.rank !== p.rank);
          // 지운 기록이 지금 계급이었다면 남은 기록 → 바로 아래 계급 순으로 되돌린다
          const ranks = ranksFor(info.personnelType);
          const i = ranks.indexOf(p.rank);
          const fallback = cadreCurrentRank({ ...info, officerPromotions: rest })
            ?? (info.officerRank === p.rank && i > 0 ? ranks[i - 1] : info.officerRank);
          return persistCadre({ ...info, officerPromotions: rest, officerRank: fallback ?? null });
        }),
      },
    ]);
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
    if ((await guardSave(() => saveRankPromotions(editPromo))) === SAVE_FAILED) return;
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
            if ((await guardSave(() => resetRankPromotions())) === SAVE_FAILED) return;
            // 저장소는 이미 기본값이다 — 화면 상태도 맞춘다. 예전엔 편집 값만 바꿔서,
            // 여기서 '취소'를 누르면 레일·로드맵은 옛 날짜를, 위젯·알림은 기본값을 봤다.
            setEditPromo(defaults);
            setPromotions(defaults);
            updateDischargeWidget();
            refreshScheduledNotifications().catch(() => {});
          },
        },
      ]
    );
  };

  const daysLeft = info ? calcDaysLeft(info.dischargeDate) : 0;
  const infoCadre = info ? isOfficer(info.personnelType) : false;
  const exts = infoCadre ? validExtensions(info) : [];
  const ops = infoCadre ? validOfficerPromotions(info) : [];
  const origDischarge = infoCadre && exts.length
    ? calcDischargeDate(info.enlistDate, baseServiceMonths(info))
    : null;
  // 폼: 진급 이력으로 이미 정해진 계급이 있으면 칩으로 바꾸지 않게 한다
  const formRankLocked = officer && info && isOfficer(info.personnelType) && personnelType === info.personnelType
    && !!cadreCurrentRank(info);
  const infoRanks = info ? hasSoldierRanks(info.personnelType) : false;
  const infoAlt = info ? isAlternative(info.personnelType) : false;
  const activePromo = editingPromo ? editPromo : promotions;
  const ti = termsFor(info?.personnelType);   // 요약(저장된 신분) 문구
  // '육군 · 병사' / '공중보건의사' — 대체복무는 군별이 없어 신분(세부 유형)만
  const heroLabel = info ? [branchLabelOf(info), serviceLabel(info)].filter(Boolean).join(' · ') : '';

  // 복무 진행률 — 여정 레일의 채워진 부분
  // 홈 히어로와 같은 기준(일수)을 쓴다. 예전엔 여기만 servedMonths/months 라
  // 같은 프로필인데 전역 탭과 홈의 진행률이 달랐고, 개월 기준이라 5.5%p 씩 뛰었다.
  const progress = info ? calcProgress(info.enlistDate, info.dischargeDate) / 100 : 0;

  /* 여정 레일의 마일스톤. 홈·로드맵과 같은 buildRoadmap 을 쓴다 — 여기서
     날짜를 다시 계산하면 화면마다 다른 여정이 그려진다. */
  const journey = useMemo(
    () => (info ? buildRoadmap(info, promotions) : []),
    [info, promotions]
  );

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
        header={<AppHeader title={editing ? t.infoScreen : ti.infoScreen} back />}
      >
        {editing ? (
          /* ── 입력 폼 ── */
          <Section index={0}>
            <Card>
              <SectionTitle icon="create-outline">{t.info} 입력</SectionTitle>

              {/* 복무 형태 — 현역 | 대체복무 */}
              <Txt role="label" tone="secondary" style={s.label}>복무 형태</Txt>
              <SegmentedControl options={GROUP_OPTIONS} value={group} onChange={selectGroup} />

              {/* 구분 — 2-up (현역 4종 = 2×2, 대체복무는 이름이 길다) */}
              <Txt role="label" tone="secondary" style={s.label}>구분</Txt>
              <Grid columns={2} gap={sp.sm}>
                {PERSONNEL_TYPES.filter((pt) => pt.group === group).map((pt) => (
                  <SelectTile
                    key={pt.key}
                    icon={pt.icon}
                    label={pt.label}
                    sub={typeMonthsSub(pt)}
                    selected={personnelType === pt.key}
                    onPress={() => selectType(pt.key)}
                  />
                ))}
              </Grid>

              <View style={{ marginTop: sp.lg }}>
                <DatePickerField
                  label={t.startDate}
                  value={enlistDate}
                  onChange={setEnlistDate}
                  maximumDate={new Date()}
                  placeholder={`${josa(t.startDate, '을/를')} 선택하세요`}
                />
              </View>

              {/* 군별 — 2-up. 예전엔 width:'47.5%' + gap:8 이라 오른쪽이 너덜너덜했다.
                  대체복무는 군부대 밖 복무라 군별이 없다. */}
              {!alt ? (
                <>
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
                </>
              ) : null}

              {alt ? (
                <>
                  {subs.length ? (
                    <>
                      <Txt role="label" tone="secondary" style={s.label}>세부 구분</Txt>
                      <View style={s.chipWrap}>
                        {subs.map((c) => (
                          <Chip
                            key={c.key}
                            label={`${c.label} · ${c.months}개월`}
                            selected={subType === c.key}
                            onPress={() => selectSubType(c.key)}
                          />
                        ))}
                      </View>
                    </>
                  ) : null}

                  <Txt role="label" tone="secondary" style={s.label}>총 복무 개월 수</Txt>
                  <Stepper
                    value={monthsInput}
                    onChange={(v) => setMonthsInput(String(v))}
                    min={1}
                    max={240}
                    label="총 복무 개월 수"
                    editable
                  />
                  <Txt role="caption" tone="secondary" style={{ marginTop: sp.md }}>
                    * 기본 {defaultMonthsFor(personnelType, subType)}개월이 채워져 있어요. 실제 복무기간이 다르면 조정하세요.
                    {personnelType === 'artsports' ? '\n* 예술·체육요원은 34개월 동안 544시간의 공익복무를 함께 해요.' : ''}
                  </Txt>
                </>
              ) : officer ? (
                <>
                  <Txt role="label" tone="secondary" style={s.label}>현재 계급</Txt>
                  {formRankLocked ? (
                    <Txt role="caption" tone="secondary">
                      {cadreCurrentRank(info)} · 진급 이력에서 정해져요 (아래 '진급 이력'에서 고치세요)
                    </Txt>
                  ) : (
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
                  )}

                  <Txt role="label" tone="secondary" style={s.label}>총 복무 개월 수</Txt>
                  <Stepper
                    value={monthsInput}
                    onChange={(v) => setMonthsInput(String(v))}
                    min={1}
                    max={CADRE_MAX_MONTHS}
                    label="총 복무 개월 수"
                    editable
                  />

                  <View style={s.chipWrap}>
                    {(CADRE_PRESETS[personnelType] ?? []).map((p) => (
                      <Chip
                        key={p.months}
                        label={p.label}
                        size="sm"
                        selected={parseInt(monthsInput, 10) === p.months}
                        onPress={() => setMonthsInput(String(p.months))}
                      />
                    ))}
                  </View>
                  <Txt role="caption" tone="secondary" style={{ marginTop: sp.md }}>
                    * 호봉은 {t.startDate} 기준으로 1년마다 1호봉씩 추정해요.{'\n'}* 복무가 연장되면 저장 뒤 '복무 연장'에 기록하세요 — 원래 {ti.endDate}도 함께 남아요.
                  </Txt>
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
                <Button title="저장" icon="checkmark" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
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
                  <Chip label={heroLabel} size="sm" onHero />
                  <Chip label={`${info.months}개월`} size="sm" onHero />
                </View>

                <Chip
                  label="수정"
                  icon="create-outline"
                  size="sm"
                  onHero
                  onPress={() => setEditing(true)}
                  accessibilityLabel={`${ti.info} 수정`}
                />
              </View>

              {/* 전역 후엔 홈처럼 '전역 완료' — 예전엔 Math.max(0, …) 로 'D- 0' 이 영원히 남았다 */}
              <View style={s.heroAmount}>
                {daysLeft > 0 ? (
                  <>
                    <Txt role="subtitle" tone="heroMuted">D-</Txt>
                    <AnimatedNumber value={daysLeft} style={[ty.hero, { color: tc.heroText }]} />
                  </>
                ) : (
                  <Txt role="hero" tone="hero">{daysLeft === 0 ? 'D-Day!' : `${ti.endDone}!`}</Txt>
                )}
              </View>

              {/* 여정 레일 — 입대·진급·반환점·전역이 날짜 비례로 놓이고
                  현재 위치에 마커가 선다. 예전엔 [● 입대] —바— [○ 전역]
                  두 점뿐이라 "어디쯤 왔는지"가 퍼센트 숫자에만 있었다. */}
              <View style={s.rail}>
                <JourneyRail
                  milestones={journey}
                  progress={progress}
                  onHero
                  fillColor={tc.heroText}
                  compact
                  delay={320}
                />
              </View>

              <View style={s.railLabels}>
                <View>
                  <Txt role="micro" tone="heroMuted">{ti.start}</Txt>
                  <Txt role="caption" tone="hero">{formatDateKo(info.enlistDate)}</Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt role="micro" tone="heroMuted">{ti.end}</Txt>
                  <Txt role="caption" tone="hero">{formatDateKo(info.dischargeDate)}</Txt>
                </View>
              </View>
            </HeroCard>
          </Section>
        ) : null}

        {/* ── 진급일 관리 (병사만) ── */}
        {info && infoRanks && (activePromo || editingPromo) ? (
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
                          <DatePickerField
                            label={`${rk} 진급일`}
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

        {/* ── 간부: 진급 이력 (v1.6) ── */}
        {info && infoCadre && !editing ? (
          <Section index={1}>
            <Card>
              <SectionTitle icon="ribbon-outline">진급 이력</SectionTitle>
              <Txt role="caption" tone="secondary" style={{ marginTop: sp.xs }}>
                진급일을 기록하면 그날부터 계급·봉급 참고값이 바뀌고, 로드맵과 알림에도 나와요.
              </Txt>
              {ops.length ? (
                <ListGroup style={{ marginTop: sp.md }}>
                  {ops.map((p) => {
                    const dd = calcDaysLeft(p.date);
                    return (
                      <ListRow
                        key={p.rank}
                        title={`${p.rank} 진급`}
                        subtitle={`${formatDateKo(p.date)} · ${dd > 0 ? `D-${dd} 예정` : '완료'}`}
                        icon="chevron-up-circle-outline"
                        right={(
                          <PressScale
                            onPress={() => handleDeleteOp(p)}
                            haptic="select"
                            style={s.refresh}
                            accessibilityRole="button"
                            accessibilityLabel={`${p.rank} 진급 기록 삭제`}
                          >
                            <Ionicons name="trash-outline" size={18} color={tc.textSecondary} />
                          </PressScale>
                        )}
                      />
                    );
                  })}
                </ListGroup>
              ) : null}
              <Button
                title="진급 기록 추가"
                icon="add"
                variant="secondary"
                full
                onPress={openOp}
                style={{ marginTop: sp.md }}
              />
            </Card>
          </Section>
        ) : null}

        {/* ── 간부: 복무 연장 (v1.6) ── */}
        {info && infoCadre && !editing ? (
          <Section index={1}>
            <Card>
              <SectionTitle icon="time-outline">복무 연장</SectionTitle>
              {exts.length && origDischarge ? (
                <Txt role="body" style={{ marginTop: sp.xs }}>
                  원래 {formatDateKo(formatDate(origDischarge))} → 현재 {formatDateKo(info.dischargeDate)}
                  {` (+${exts.reduce((n, e) => n + e.months, 0)}개월)`}
                </Txt>
              ) : (
                <Txt role="caption" tone="secondary" style={{ marginTop: sp.xs }}>
                  복무 연장이 확정되면 기록하세요. 원래 {ti.endDate}과 연장 이력이 함께 남아요.
                </Txt>
              )}
              {exts.length ? (
                <ListGroup style={{ marginTop: sp.md }}>
                  {exts.map((e) => (
                    <ListRow
                      key={e.id ?? `${e.date}-${e.months}`}
                      title={`+${e.months}개월 연장`}
                      subtitle={[e.date ? `${formatDateKo(e.date)} 결정` : null, e.memo].filter(Boolean).join(' · ')}
                      icon="add-circle-outline"
                      right={(
                        <PressScale
                          onPress={() => handleDeleteExt(e)}
                          haptic="select"
                          style={s.refresh}
                          accessibilityRole="button"
                          accessibilityLabel={`${e.months}개월 연장 기록 삭제`}
                        >
                          <Ionicons name="trash-outline" size={18} color={tc.textSecondary} />
                        </PressScale>
                      )}
                    />
                  ))}
                </ListGroup>
              ) : null}
              <Button
                title="복무 연장 기록"
                icon="add"
                variant="secondary"
                full
                onPress={openExt}
                style={{ marginTop: sp.md }}
              />
            </Card>
          </Section>
        ) : null}

        {/* ── 이어지는 화면들 — 카드 두 장 대신 한 묶음 ── */}
        {info ? (
          <Section index={2}>
            <ListGroup>
              <ListRow
                title={ti.roadmapTitle}
                subtitle={infoAlt ? '100일·반환점 등 주요 순간을 한눈에' : isOfficer(info?.personnelType) ? '호봉 승급과 주요 순간을 한눈에' : '다음 진급과 주요 순간을 한눈에'}
                icon="map-outline"
                chevron
                onPress={() => navigation.navigate('roadmap')}
              />
              {/* 장병내일준비적금은 현역병·사회복무요원만 가입할 수 있다 */}
              {savingsEligible(info.personnelType) ? (
                <ListRow
                  title="장병내일적금 계산기"
                  subtitle={`${ti.end} 시 받을 목돈을 미리 계산`}
                  icon="calculator-outline"
                  iconTone="success"
                  chevron
                  onPress={() => navigation.navigate('savings')}
                />
              ) : null}
              <ListRow
                title={`${ti.familyAnd}에게 공유`}
                subtitle={`공유 코드·QR 로 ${ti.endDate} 함께 세기`}
                icon="people-outline"
                chevron
                onPress={() => navigation.navigate('shareProfile')}
              />
            </ListGroup>
          </Section>
        ) : null}

        {/* ── 응원 메시지 ── */}
        {info ? (
          <Section index={3}>
            <Card>
              <View style={s.msgRow}>
                <Ionicons name="chatbubble-ellipses" size={20} color={tc.primary} />
                <Txt role="body" style={{ flex: 1 }} numberOfLines={3}>
                  {message}
                </Txt>
                <PressScale
                  onPress={() => {
                    const next = msgOffset + 1;
                    setMsgOffset(next);
                    setMessage(getMessageForPhase(getPhase(daysLeft), undefined, next, altEndOf(info.personnelType), isOfficer(info.personnelType)));
                  }}
                  haptic="select"
                  style={s.refresh}
                  accessibilityRole="button"
                  accessibilityLabel="다른 메시지 보기"
                >
                  <Ionicons name="refresh" size={18} color={tc.primary} />
                </PressScale>
              </View>
            </Card>
          </Section>
        ) : null}
      </Screen>

      {/* 간부: 복무 연장 기록 */}
      <FormSheet
        visible={extOpen}
        onClose={() => setExtOpen(false)}
        title="복무 연장 기록"
        onSubmit={handleAddExt}
        saving={cadreSaving}
      >
        <View style={{ gap: sp.sm }}>
          <Txt role="label" tone="secondary">연장 개월 수</Txt>
          <Stepper
            value={extMonths}
            onChange={(v) => setExtMonths(String(v))}
            min={1}
            max={EXT_MAX_MONTHS}
            label="연장 개월 수"
            editable
          />
        </View>
        <DatePickerField label="연장 결정일" value={extDate} onChange={setExtDate} />
        <TextField
          label="메모 (선택)"
          value={extMemo}
          onChangeText={setExtMemo}
          placeholder="예) 1년 연장 확정"
          maxLength={40}
        />
        {info && Number.isInteger(parseInt(extMonths, 10)) ? (
          <Txt role="caption" tone="secondary">
            {(() => {
              const d = calcDischargeDate(info.enlistDate, Number(info.months) + parseInt(extMonths, 10));
              return d ? `${ti.endDate}: ${formatDateKo(info.dischargeDate)} → ${formatDateKo(formatDate(d))}` : '';
            })()}
          </Txt>
        ) : null}
      </FormSheet>

      {/* 간부: 진급 기록 추가 */}
      <FormSheet
        visible={opOpen}
        onClose={() => setOpOpen(false)}
        title="진급 기록 추가"
        onSubmit={handleAddOp}
        saving={cadreSaving}
      >
        <View style={{ gap: sp.sm }}>
          <Txt role="label" tone="secondary">진급한 계급</Txt>
          <View style={s.chipWrap}>
            {(info ? ranksFor(info.personnelType) : []).map((rk) => (
              <Chip key={rk} label={rk} selected={opRank === rk} onPress={() => setOpRank(rk)} />
            ))}
          </View>
        </View>
        <DatePickerField
          label="진급일 (예정일도 가능)"
          value={opDate}
          onChange={setOpDate}
          minimumDate={info ? parseDate(info.enlistDate) ?? undefined : undefined}
          maximumDate={info ? parseDate(info.dischargeDate) ?? undefined : undefined}
        />
      </FormSheet>
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
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
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

    btnRow: { flexDirection: 'row', gap: sp.sm, marginTop: sp.xl },
    resetBtn: { alignSelf: 'center', marginTop: sp.md, borderWidth: 0 },

    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: sp.sm,
    },
    chipRow: { flexDirection: 'row', gap: sp.sm, flexShrink: 1 },
    heroAmount: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: sp.xxs,
      marginTop: sp.lg,
      marginBottom: sp.xl,
    },

    // 마커가 레일 위아래로 삐져나오므로 세로 여유를 준다
    rail: { paddingVertical: sp.md },
    railLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: sp.sm,
    },

    msgRow: { flexDirection: 'row', alignItems: 'center', gap: sp.md },
    refresh: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  });
