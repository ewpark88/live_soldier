import React, { useMemo, useState, useCallback } from 'react';
import { Alert, Platform, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Card from '../components/Card';
import { Screen, AppHeader, Section, ListRow, Divider, Txt } from '../components/ui';
import { AD_UNITS } from '../constants/adUnits';
import { useTheme, useThemeColors } from '../theme/ThemeContext';
import { usePrefs } from '../theme/PrefsContext';
import { useMotion } from '../hooks/useMotion';
import { clearAllData } from '../utils/storage';
import { haptic } from '../utils/haptics';
import {
  isNotifEnabled, enableNotifications, disableNotifications, isNotifAvailable,
} from '../utils/notifications';
import { expo as appInfo } from '../../app.json';
import { space as sp } from '../theme/tokens';

const THEME_OPTIONS = [
  { key: 'system', label: '시스템 설정 따름', icon: 'phone-portrait-outline', desc: '기기의 라이트/다크 설정을 자동으로 따릅니다' },
  { key: 'light', label: '라이트', icon: 'sunny-outline', desc: '항상 밝은 테마' },
  { key: 'dark', label: '다크', icon: 'moon-outline', desc: '항상 어두운 테마' },
];

/** 그룹 라벨 + 카드 + (선택) 힌트 */
function Group({ label, hint, index, children }) {
  return (
    <Section index={index} gap={sp.md}>
      <Txt role="label" tone="secondary" style={{ marginLeft: sp.xs, marginBottom: sp.sm }}>
        {label}
      </Txt>
      {/* pad="none": 행이 좌우 패딩을 직접 갖는다.
          overflow:'hidden' 은 쓰지 않는다 — iOS 에서 카드 그림자가 잘려 사라진다. */}
      <Card pad="none" style={styles.group}>
        {children}
      </Card>
      {hint ? (
        <Txt role="caption" tone="light" style={{ marginTop: sp.sm, marginLeft: sp.xs }}>
          {hint}
        </Txt>
      ) : null}
    </Section>
  );
}

export default function SettingsScreen({ navigation }) {
  const tc = useThemeColors();
  const { mode, setMode } = useTheme();
  const { haptics, reduceMotion, setHaptics, setReduceMotion } = usePrefs();
  const m = useMotion();

  const [notifOn, setNotifOn] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      isNotifEnabled().then((v) => { if (alive) setNotifOn(v); });
      return () => { alive = false; };
    }, [])
  );

  const switchProps = (on) => ({
    trackColor: { false: tc.border, true: tc.primaryLight },
    thumbColor: Platform.OS === 'android' ? (on ? tc.primary : tc.card) : undefined,
  });

  const handleToggleNotif = async (next) => {
    if (notifBusy) return;
    setNotifBusy(true);
    try {
      if (next) {
        if (!isNotifAvailable()) {
          haptic.warning();
          Alert.alert('알림 사용 불가', 'Expo Go에서는 알림을 사용할 수 없어요. 빌드된 앱에서 이용해주세요.');
          return;
        }
        const ok = await enableNotifications();
        if (ok) {
          setNotifOn(true);
          haptic.success();
          Alert.alert('알림 켜짐', '전역 D-day·진급·일정 리마인더를 보내드릴게요.');
        } else {
          setNotifOn(false);
          haptic.warning();
          Alert.alert('권한 필요', '기기 설정에서 알림 권한을 허용해주세요.');
        }
      } else {
        await disableNotifications();
        setNotifOn(false);
      }
    } finally {
      setNotifBusy(false);
    }
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
            await clearAllData();
            Alert.alert('삭제 완료', '모든 데이터가 초기화되었습니다.', [
              { text: '확인', onPress: () => navigation.navigate('home') },
            ]);
          },
        },
      ]
    );
  };

  return (
    <Screen
      ad={AD_UNITS.HOME_BOTTOM}
      header={<AppHeader title="설정" navigation={navigation} current="settings" />}
    >
      {/* ── 화면 테마 ── */}
      <Group label="화면 테마" index={0}>
        {THEME_OPTIONS.map((opt, i) => {
          const active = mode === opt.key;
          return (
            <View key={opt.key}>
              <ListRow
                title={opt.label}
                subtitle={opt.desc}
                icon={opt.icon}
                iconTone={active ? 'primary' : 'neutral'}
                onPress={() => setMode(opt.key)}
                titleStyle={active && { color: tc.primary }}
                style={styles.row}
                right={
                  active ? (
                    <Animated.View entering={m.enter(ZoomIn, 0, 220)}>
                      <Ionicons name="checkmark-circle" size={22} color={tc.primary} />
                    </Animated.View>
                  ) : undefined
                }
              />
              {i < THEME_OPTIONS.length - 1 ? <Divider inset={sp.lg + 48} /> : null}
            </View>
          );
        })}
      </Group>

      {/* ── 알림 ── */}
      <Group
        label="알림"
        index={1}
        hint="* 알림은 이 기기에서만 예약되며, 현재 선택된 프로필 기준으로 발송됩니다."
      >
        <ListRow
          title="전역 리마인더"
          subtitle="전역 D-100·D-7·진급일·일정을 미리 알려드려요"
          icon="notifications-outline"
          iconTone={notifOn ? 'primary' : 'neutral'}
          style={styles.row}
          right={
            <Switch
              value={notifOn}
              onValueChange={handleToggleNotif}
              disabled={notifBusy}
              {...switchProps(notifOn)}
            />
          }
        />
      </Group>

      {/* ── 모션 (애니메이션·햅틱) ── */}
      <Group
        label="모션"
        index={2}
        hint="* 기기의 '동작 줄이기' 접근성 설정이 켜져 있으면 애니메이션은 자동으로 꺼집니다."
      >
        <ListRow
          title="햅틱 반응"
          subtitle="버튼·선택 시 가볍게 진동합니다"
          icon="pulse-outline"
          iconTone={haptics ? 'primary' : 'neutral'}
          style={styles.row}
          right={
            <Switch
              value={haptics}
              onValueChange={(v) => { setHaptics(v); if (v) haptic.light(); }}
              {...switchProps(haptics)}
            />
          }
        />
        <Divider inset={sp.lg + 48} />
        <ListRow
          title="애니메이션 줄이기"
          subtitle="화면 전환·카운트업 등의 움직임을 최소화합니다"
          icon="eye-off-outline"
          iconTone={reduceMotion ? 'primary' : 'neutral'}
          style={styles.row}
          right={
            <Switch
              value={reduceMotion}
              onValueChange={setReduceMotion}
              {...switchProps(reduceMotion)}
            />
          }
        />
      </Group>

      {/* ── 데이터 ── */}
      <Group
        label="데이터"
        index={3}
        hint="* 모든 데이터는 이 기기에만 저장되며 외부로 전송되지 않습니다."
      >
        <ListRow
          title="모든 데이터 삭제"
          subtitle="모든 프로필·군생활 데이터를 초기화합니다"
          icon="trash-outline"
          danger
          chevron
          onPress={handleClearData}
          style={styles.row}
        />
      </Group>

      {/* ── 앱 정보 ── */}
      <Group label="앱 정보" index={4}>
        <ListRow
          title="앱 이름"
          icon="information-circle-outline"
          iconTone="neutral"
          value={appInfo.name}
          style={styles.row}
        />
        <Divider inset={sp.lg + 48} />
        <ListRow
          title="버전"
          icon="pricetag-outline"
          iconTone="neutral"
          value={appInfo.version}
          style={styles.row}
        />
      </Group>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { paddingHorizontal: 0 },
  row: { paddingHorizontal: sp.lg },
});
