import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Alert, Platform, StyleSheet, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Card from '../components/Card';
import ProfileBar from '../components/ProfileBar';
import { Screen, AppHeader, Section, ListRow, ListGroup, Chip, Txt } from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { useTheme, useThemeColors } from '../theme/ThemeContext';
import { usePrefs } from '../theme/PrefsContext';
import { useStreak } from '../state/StreakContext';
import { clearAllData, importAll, listProfiles, loadMilitaryInfo, loadRankPromotions } from '../utils/storage';
import { removeProfilePhoto } from '../utils/imagePicker';
import { haptic } from '../utils/haptics';
import { guardDelete, guardSave, SAVE_FAILED } from '../utils/saveGuard';
import {
  loadNotifPrefs, refreshScheduledNotifications, getNotifPermission, NOTIF_EVENTS,
} from '../utils/notifications';
import {
  calcDaysLeft, calcRankByEnlistDate, calcRankFromPromotions, formatDateKo,
} from '../utils/dateUtils';
import { BRANCHES, isOfficer, personnelLabel } from '../constants/serviceTerms';
import { backupAvailable, exportBackupFile, pickBackupFile } from '../utils/backupFile';
import { backupErrorMessage } from '../utils/backup';
import { emitProfilesChanged } from '../state/appEvents';
import { updateDischargeWidget } from '../widget/updateWidget';
import { expo as appInfo } from '../../app.json';
import { space as sp } from '../theme/tokens';

export default function SettingsScreen({ navigation }) {
  const tc = useThemeColors();
  const { theme: currentTheme, introSeen, reload: reloadTheme } = useTheme();
  const { haptics, reduceMotion, setHaptics, setReduceMotion, reload: reloadPrefs } = usePrefs();
  const { refresh: refreshStreak } = useStreak();

  const [notifSummary, setNotifSummary] = useState(null);
  const [info, setInfo] = useState(null);
  const [promotions, setPromotions] = useState(null);
  const backupBusy = useRef(false);

  const loadProfile = useCallback(async () => {
    const mi = await loadMilitaryInfo();
    setInfo(mi);
    setPromotions(await loadRankPromotions(mi?.enlistDate));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([loadNotifPrefs(), getNotifPermission()]).then(([p, pm]) => {
        if (!alive) return;
        const on = NOTIF_EVENTS.filter((e) => p[e.key]).length;
        setNotifSummary({
          master: p.master,
          blocked: p.master && pm.status !== 'granted' && pm.status !== 'unavailable',
          text: p.master ? `${on}개 이벤트 켜짐` : '꺼짐',
        });
      });
      loadProfile();
      return () => { alive = false; };
    }, [loadProfile])
  );

  /* 요약 한 줄 — 계급 · 군별 · 전역일 */
  const summary = useMemo(() => {
    if (!info) return null;
    const officer = isOfficer(info.personnelType);
    const rank = officer
      ? (info.officerRank ?? personnelLabel(info.personnelType))
      : (calcRankFromPromotions(promotions) ?? calcRankByEnlistDate(info.enlistDate));
    const branch = BRANCHES.find((b) => b.key === info.branch)?.label ?? '';
    const left = calcDaysLeft(info.dischargeDate);
    return {
      line1: [branch, rank].filter(Boolean).join(' · '),
      line2: `${formatDateKo(info.dischargeDate)} 전역 · ${left > 0 ? `D-${left}` : '전역 완료'}`,
    };
  }, [info, promotions]);

  /* 병사/간부에 따라 봉급표 행이 갈린다 (예전엔 햄버거 메뉴가 하던 분기) */
  const payRow = isOfficer(info?.personnelType)
    ? { title: '간부 봉급 참고', subtitle: '계급·호봉별 봉급표', icon: 'ribbon-outline', route: 'officerPay' }
    : { title: '병사 월급 가이드', subtitle: '계급별 표준 월급', icon: 'card-outline', route: 'salaryGuide' };

  const SHORTCUTS = [
    { title: '전역 정보', subtitle: '입대일·군별·진급일 수정', icon: 'flag-outline', route: 'discharge' },
    { title: '가족·곰신에게 공유', subtitle: '공유 코드·QR 로 전역일 함께 세기', icon: 'people-outline', route: 'shareProfile' },
    { title: '전역 로드맵', subtitle: '진급·반환점·전역까지의 이정표', icon: 'map-outline', route: 'roadmap' },
    payRow,
    // 홈·급여 탭과 같은 아이콘 — 같은 기능이 화면마다 다른 아이콘이면 다른 기능처럼 보인다
    { title: '장병내일적금', subtitle: '전역 시 받을 목돈 계산', icon: 'calculator-outline', route: 'savings' },
    { title: '군인 혜택 모음', subtitle: '금융·교통·문화 할인', icon: 'gift-outline', route: 'benefits' },
  ];

  const switchProps = (on, label) => ({
    trackColor: { false: tc.border, true: tc.primaryLight },
    thumbColor: Platform.OS === 'android' ? (on ? tc.primary : tc.card) : undefined,
    accessibilityLabel: label,
    accessibilityRole: 'switch',
  });

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
            if ((await guardDelete(() => clearAllData())) === SAVE_FAILED) return;
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
            await Promise.all([reloadTheme?.(), reloadPrefs?.(), refreshStreak?.()]).catch(() => {});
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
      ad={AD_UNITS.HOME_BOTTOM}
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
              : '전역·진급·휴가·일정·월급날 등 이벤트별 설정'}
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
                {...switchProps(haptics, '햅틱 반응')}
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
                {...switchProps(reduceMotion, '애니메이션 줄이기')}
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

      {/* ── 앱 정보 ── */}
      <Section index={6} gap={sp.lg}>
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
