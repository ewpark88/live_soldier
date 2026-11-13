import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { switchProps } from '../components/ui/switchProps';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import ProfileBar from '../components/ProfileBar';
import { Screen, AppHeader, Section, ListRow, ListGroup, Chip, Txt } from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { useTheme, useThemeColors } from '../theme/ThemeContext';
import { usePrefs } from '../theme/PrefsContext';
import { useStreak } from '../state/StreakContext';
import { useSkins } from '../state/SkinContext';
import { clearAllData, importAll, listProfiles, loadMilitaryInfo, loadRankPromotions } from '../utils/storage';
import { removeProfilePhoto } from '../utils/imagePicker';
import { haptic } from '../utils/haptics';
import { guardDelete, guardSave, SAVE_FAILED } from '../utils/saveGuard';
import {
  loadNotifPrefs, refreshScheduledNotifications, getNotifPermission, notifEventsFor,
} from '../utils/notifications';
import { calcDaysLeft, formatDateKo } from '../utils/dateUtils';
import { currentRankLabel } from '../utils/roadmapUtils';
import {
  branchLabelOf, hasSoldierRanks, isAlternative, isOfficer, savingsEligible, termsFor,
} from '../constants/serviceTerms';
import { benefitsFor } from '../constants/benefits';
import { backupAvailable, exportBackupFile, pickBackupFile } from '../utils/backupFile';
import { backupErrorMessage } from '../utils/backup';
import { emitProfilesChanged } from '../state/appEvents';
import { updateDischargeWidget } from '../widget/updateWidget';
import { expo as appInfo } from '../../app.json';
import { CONTACT_EMAIL, openContactEmail, openStoreReview } from '../utils/feedback';
import { space as sp } from '../theme/tokens';

export default function SettingsScreen({ navigation }) {
  const tc = useThemeColors();
  const { theme: currentTheme, introSeen, reload: reloadTheme } = useTheme();
  const { haptics, reduceMotion, setHaptics, setReduceMotion, reload: reloadPrefs } = usePrefs();
  const { refresh: refreshStreak } = useStreak();
  const { reload: reloadSkins } = useSkins();

  const [notifSummary, setNotifSummary] = useState(null);
  const [info, setInfo] = useState(null);
  const [promotions, setPromotions] = useState(null);
  const backupBusy = useRef(false);

  const loadProfile = useCallback(async () => {
    try {
      const mi = await loadMilitaryInfo();
      setInfo(mi);
      setPromotions(await loadRankPromotions(mi?.enlistDate));
    } catch (e) { /* 프로필 요약만 비어 보인다 — 메뉴는 그대로 쓸 수 있다 */ }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([loadNotifPrefs(), getNotifPermission(), loadMilitaryInfo().catch(() => null)]).then(([p, pm, mi]) => {
        if (!alive) return;
        // 신분에 없는 이벤트(대체복무의 진급·월급날 등)는 세지 않는다 — 알림 화면과 같은 목록
        const on = notifEventsFor(mi?.personnelType).filter((e) => p[e.key]).length;
        setNotifSummary({
          master: p.master,
          blocked: p.master && pm.status !== 'granted' && pm.status !== 'unavailable',
          text: p.master ? `${on}개 이벤트 켜짐` : '꺼짐',
        });
      }).catch(() => {});
      loadProfile();
      return () => { alive = false; };
    }, [loadProfile])
  );

  /* 요약 한 줄 — 계급 · 군별 · 전역일 */
  const summary = useMemo(() => {
    if (!info) return null;
    const rank = currentRankLabel(info, promotions);   // 대체복무는 신분(세부 유형) 이름
    const branch = branchLabelOf(info);                 // 대체복무는 null
    const left = calcDaysLeft(info.dischargeDate);
    const t = termsFor(info.personnelType);
    return {
      line1: [branch, rank].filter(Boolean).join(' · '),
      line2: `${formatDateKo(info.dischargeDate)} ${t.end} · ${left > 0 ? `D-${left}` : t.endDone}`,
    };
  }, [info, promotions]);

  const pt = info?.personnelType;
  const t = termsFor(pt);
  const alt = isAlternative(pt);

  /* 신분에 따라 봉급표 행이 갈린다 (예전엔 햄버거 메뉴가 하던 분기).
     병사·사회복무요원 → 병사 월급표, 간부 → 간부 봉급, 그 외 대체복무 → 근무처 급여라 없음 */
  const payRow = isOfficer(pt)
    ? { title: '간부 봉급 참고', subtitle: '초임(1호봉) 월 기본급', icon: 'list-outline', route: 'officerPay' }
    : (!alt || pt === 'social')
      ? { title: '병사 월급 가이드', subtitle: pt === 'social' ? '현역병 기준 참고 월급' : '계급별 표준 월급', icon: 'list-outline', route: 'salaryGuide' }
      : null;

  const SHORTCUTS = [
    {
      title: t.infoScreen,
      subtitle: alt ? '복무 시작일·유형 수정' : hasSoldierRanks(pt) ? '입대일·군별·진급일 수정' : `${t.startDate}·계급·복무개월 수정`,   // 간부: 임관일
      icon: 'flag-outline',
      route: 'discharge',
    },
    { title: `${t.familyAnd}에게 공유`, subtitle: `공유 코드·QR 로 ${t.endDate} 함께 세기`, icon: 'people-outline', route: 'shareProfile' },
    {
      title: t.roadmapTitle,
      subtitle: hasSoldierRanks(pt) ? `진급·반환점·${t.end}까지의 이정표` : `반환점·${t.end}까지의 이정표`,
      icon: 'map-outline',
      route: 'roadmap',
    },
    payRow,
    // 홈·급여 탭과 같은 아이콘 — 같은 기능이 화면마다 다른 아이콘이면 다른 기능처럼 보인다
    savingsEligible(pt) ? { title: '장병내일적금', subtitle: `${t.end} 시 받을 목돈 계산`, icon: 'calculator-outline', route: 'savings' } : null,
    benefitsFor(pt).length > 0 ? {
      title: t.benefitsTitle,
      // 간부·대체복무는 철도·버스 할인 등 병사 전용 항목이 빠진다 — '교통 할인'을 약속하지 않는다
      subtitle: hasSoldierRanks(pt) ? '금융·교통·문화 할인' : alt ? '복무 중 받을 수 있는 지원' : '금융·문화·자기계발 지원',
      icon: 'gift-outline',
      route: 'benefits',
    } : null,
    { title: '막대병 도감', subtitle: '홈 링 안 막대병 모습 바꾸기', icon: 'body-outline', route: 'soldierDex' },
  ].filter(Boolean);


  /* 데이터가 통째로 바뀐 뒤(삭제·복원) — 화면 밖에 남아 있는 것들까지 맞춘다.
     예전엔 전체 삭제 후 홈 위젯이 지운 프로필의 D-day 를 계속 보여주고,
     지운 데이터의 'D-30' 알림이 그대로 울렸다. */
  const afterDataReplaced = async () => {
    emitProfilesChanged();
    updateDischargeWidget();
    await refreshScheduledNotifications({ force: true }).catch(() => {});
    loadProfile();
  };

  const handleClearData = () => {
    haptic.warning();
    Alert.alert(
      '모든 데이터 삭제',
      '삭제를 하면 모든 데이터가 사라집니다. 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            // 프로필 사진 파일은 저장소 밖(documentDirectory)에 있다 — 복원과 같이 지운다
            const oldPhotos = (await listProfiles().catch(() => ({ profiles: [] }))).profiles
              .map((p) => p.photo).filter(Boolean);
            if ((await guardDelete(() => clearAllData())) === SAVE_FAILED) return;
            oldPhotos.forEach((u) => removeProfilePhoto(u));
            await afterDataReplaced();
            Alert.alert('삭제 완료', '모든 데이터가 초기화되었습니다.', [
              { text: '확인', onPress: () => navigation.navigate('home') },
            ]);
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    if (backupBusy.current) return;
    backupBusy.current = true;
    try {
      await exportBackupFile();
    } catch (e) {
      haptic.warning();
      Alert.alert('백업 실패', '백업 파일을 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      backupBusy.current = false;
    }
  };

  const handleImport = async () => {
    if (backupBusy.current) return;
    backupBusy.current = true;
    let picked;
    try {
      picked = await pickBackupFile();
    } catch (e) {
      picked = { ok: false, reason: 'json' };
    } finally {
      backupBusy.current = false;
    }
    if (!picked) return;   // 취소
    if (!picked.ok) {
      haptic.warning();
      Alert.alert('복원할 수 없어요', backupErrorMessage(picked.reason));
      return;
    }
    const { summary } = picked;
    // exportedAt 은 UTC(toISOString) — 앞 10자를 자르면 한국 0~9시에 만든 백업이 전날로 보인다
    const when = summary.exportedAt ? formatDateKo(new Date(summary.exportedAt)) : '';
    haptic.warning();
    Alert.alert(
      '백업에서 복원',
      `${when ? `${when}에 만든 ` : ''}백업 (${summary.names.join(', ')})으로 이 기기의 데이터를 덮어씁니다.\n지금 데이터는 사라져요. 계속할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '복원',
          style: 'destructive',
          onPress: async () => {
            // 복원하면 모든 프로필 사진이 빠진다 — 덮어쓰기 전 사진 파일을 기억해 두고 지운다
            const oldPhotos = (await listProfiles().catch(() => ({ profiles: [] }))).profiles
              .map((p) => p.photo).filter(Boolean);
            const res = await guardSave(() => importAll(picked.text), '백업을 복원하지 못했습니다.\n기기 저장공간을 확인한 뒤 다시 시도해주세요.', '복원 실패');
            if (res === SAVE_FAILED) return;
            oldPhotos.forEach((u) => removeProfilePhoto(u));
            await Promise.all([reloadTheme?.(), reloadPrefs?.(), refreshStreak?.(), reloadSkins?.()]).catch(() => {});
            await afterDataReplaced();
            haptic.success();
            Alert.alert(
              '복원 완료',
              `프로필 ${res.count}개를 되살렸어요.\n프로필 사진은 백업에 들어가지 않으니 다시 골라 주세요.`,
              [{ text: '확인', onPress: () => navigation.navigate('home') }]
            );
          },
        },
      ]
    );
  };

  const canBackup = backupAvailable();

  return (
    <Screen
      ad={AD_UNITS.SETTINGS_BOTTOM}
      header={<AppHeader title="내 정보" />}
    >
      {/* ── 프로필 ── */}
      <Section index={0} gap={sp.xl}>
        <Card pad="lg">
          <ProfileBar onChange={loadProfile} />
          {summary ? (
            <View style={styles.summary}>
              <Txt role="bodyLg" style={{ fontWeight: '700' }}>{summary.line1}</Txt>
              <Txt role="caption" tone="secondary" numeric>{summary.line2}</Txt>
            </View>
          ) : null}
        </Card>
      </Section>

      {/* ── 바로가기 ──
          예전엔 이 항목들이 우상단 햄버거 메뉴에만 있었다. 탭 + 드로어라는
          두 개의 네비게이션이 공존해 "이 기능 어디 있지"를 두 군데서 찾아야 했다. */}
      <Section index={1} gap={sp.xl}>
        <ListGroup label="바로가기">
          {SHORTCUTS.map((row) => (
            <ListRow
              key={row.route}
              title={row.title}
              subtitle={row.subtitle}
              icon={row.icon}
              chevron
              onPress={() => navigation.navigate(row.route)}
            />
          ))}
        </ListGroup>
      </Section>

      {/* ── 외형 ── */}
      <Section index={2} gap={sp.xl}>
        <ListGroup label="외형">
          <ListRow
            title="테마"
            subtitle="앱 전체 색과 밝기"
            icon="color-palette-outline"
            iconTone="accent"
            chevron
            onPress={() => navigation.navigate('theme')}
            value={introSeen ? currentTheme?.name : undefined}
            right={introSeen ? undefined : <Chip label="NEW" size="sm" tone="accent" />}
          />
        </ListGroup>
      </Section>

      {/* ── 알림 ──
          여기엔 한 줄만 둔다. 이벤트별 스위치·시각·예약 현황은 알림 화면(2단계)에서. */}
      <Section index={3} gap={sp.xl}>
        <ListGroup label="알림">
          <ListRow
            title="알림"
            subtitle={notifSummary?.blocked
              ? '휴대폰 알림 권한이 꺼져 있어요'
              : hasSoldierRanks(pt)
                ? `${t.end}·진급·휴가·일정·월급날 등 이벤트별 설정`
                : alt ? `${t.end}·휴가·일정 등 이벤트별 설정` : `${t.end}·휴가·일정·월급날 등 이벤트별 설정`}
            icon={notifSummary?.blocked ? 'alert-circle-outline' : 'notifications-outline'}
            iconTone={notifSummary?.blocked ? 'danger' : notifSummary?.master ? 'primary' : 'neutral'}
            value={notifSummary?.text}
            chevron
            onPress={() => navigation.navigate('notifications')}
          />
        </ListGroup>
      </Section>

      {/* ── 모션 (애니메이션·햅틱) ── */}
      <Section index={4} gap={sp.xl}>
        <ListGroup label="모션" footnote="* 기기의 '동작 줄이기' 접근성 설정이 켜져 있으면 애니메이션은 자동으로 꺼집니다.">
          <ListRow
            title="햅틱 반응"
            subtitle="버튼·선택 시 가볍게 진동합니다"
            icon="pulse-outline"
            iconTone={haptics ? 'primary' : 'neutral'}
            right={
              <Switch
                value={haptics}
                onValueChange={(v) => { setHaptics(v); if (v) haptic.light(); }}
                {...switchProps(tc, haptics, '햅틱 반응')}
              />
            }
          />
          <ListRow
            title="애니메이션 줄이기"
            subtitle="화면 전환·카운트업 등의 움직임을 최소화합니다"
            icon="eye-off-outline"
            iconTone={reduceMotion ? 'primary' : 'neutral'}
            right={
              <Switch
                value={reduceMotion}
                onValueChange={setReduceMotion}
                {...switchProps(tc, reduceMotion, '애니메이션 줄이기')}
              />
            }
          />
        </ListGroup>
      </Section>

      {/* ── 데이터 ──
          서버가 없으니 폰을 바꾸면 데이터가 따라오지 않는다. 백업 파일을
          카톡 '나와의 채팅'·드라이브에 두면 새 폰에서 되살릴 수 있다. */}
      <Section index={5} gap={sp.xl}>
        <ListGroup
          label="데이터"
          footnote="* 모든 데이터는 이 기기에만 저장됩니다. 폰을 바꾸기 전에 백업 파일을 카톡 '나와의 채팅'이나 드라이브에 보관하세요."
        >
          {canBackup ? (
            <ListRow
              title="백업 파일 만들기"
              subtitle="모든 프로필·휴가·일정·설정을 파일로 내보내요"
              icon="cloud-upload-outline"
              chevron
              onPress={handleExport}
            />
          ) : null}
          {canBackup ? (
            <ListRow
              title="백업에서 복원"
              subtitle="백업 파일로 이 기기의 데이터를 덮어써요"
              icon="cloud-download-outline"
              chevron
              onPress={handleImport}
            />
          ) : null}
          <ListRow
            title="모든 데이터 삭제"
            subtitle="모든 프로필·군생활 데이터를 초기화합니다"
            icon="trash-outline"
            danger
            chevron
            onPress={handleClearData}
          />
        </ListGroup>
      </Section>

      {/* ── 의견·문의 ── 리뷰 버튼은 스토어 링크다 (In-App Review API 는 저장 흐름에서만) */}
      <Section index={6} gap={sp.xl}>
        <ListGroup label="의견·문의">
          <ListRow
            title="스토어에 리뷰 남기기"
            subtitle="의견·칭찬은 Play 스토어 리뷰로 남겨주세요"
            icon="star-outline"
            chevron
            onPress={openStoreReview}
          />
          <ListRow
            title="문의·버그 신고"
            subtitle={`${CONTACT_EMAIL} 로 메일을 보내요`}
            icon="mail-outline"
            chevron
            onPress={openContactEmail}
          />
        </ListGroup>
      </Section>

      {/* ── 앱 정보 ── */}
      <Section index={7} gap={sp.lg}>
        <ListGroup label="앱 정보">
          <ListRow
            title="앱 이름"
            icon="information-circle-outline"
            iconTone="neutral"
            value={appInfo.name}
          />
          <ListRow
            title="버전"
            icon="pricetag-outline"
            iconTone="neutral"
            value={appInfo.version}
          />
        </ListGroup>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { marginTop: sp.md, gap: sp.xxs },
});
