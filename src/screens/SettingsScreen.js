import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../components/Card';
import AdBanner from '../components/AdBanner';
import MenuButton from '../components/MenuButton';
import { AD_UNITS } from '../constants/adUnits';
import { useTheme, useThemeColors } from '../theme/ThemeContext';
import { clearAllData } from '../utils/storage';
import {
  isNotifEnabled, enableNotifications, disableNotifications, isNotifAvailable,
} from '../utils/notifications';
import { expo as appInfo } from '../../app.json';

const THEME_OPTIONS = [
  { key: 'system', label: '시스템 설정 따름', icon: 'phone-portrait-outline', desc: '기기의 라이트/다크 설정을 자동으로 따릅니다' },
  { key: 'light',  label: '라이트',          icon: 'sunny-outline',          desc: '항상 밝은 테마' },
  { key: 'dark',   label: '다크',            icon: 'moon-outline',           desc: '항상 어두운 테마' },
];

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const tc = useThemeColors();
  const { mode, setMode } = useTheme();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const [notifOn, setNotifOn] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    isNotifEnabled().then((v) => { if (alive) setNotifOn(v); });
    return () => { alive = false; };
  }, []));

  const handleToggleNotif = async (next) => {
    if (notifBusy) return;
    setNotifBusy(true);
    try {
      if (next) {
        if (!isNotifAvailable()) {
          Alert.alert('알림 사용 불가', 'Expo Go에서는 알림을 사용할 수 없어요. 빌드된 앱에서 이용해주세요.');
          return;
        }
        const ok = await enableNotifications();
        if (ok) {
          setNotifOn(true);
          Alert.alert('알림 켜짐', '전역 D-day·진급·일정 리마인더를 보내드릴게요.');
        } else {
          setNotifOn(false);
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollFlex}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Text style={styles.pageTitle}>설정</Text>
          <MenuButton navigation={navigation} current="settings" />
        </View>

        {/* ── 테마 ── */}
        <Text style={styles.sectionLabel}>화면 테마</Text>
        <Card style={styles.groupCard}>
          {THEME_OPTIONS.map((opt, i) => {
            const active = mode === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.row, i < THEME_OPTIONS.length - 1 && styles.rowDivider]}
                activeOpacity={0.7}
                onPress={() => setMode(opt.key)}
              >
                <Ionicons name={opt.icon} size={22} color={active ? tc.primary : tc.textSecondary} style={styles.rowIcon} />
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, active && { color: tc.primary, fontWeight: '700' }]}>{opt.label}</Text>
                  <Text style={styles.rowDesc}>{opt.desc}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color={tc.primary} />}
              </TouchableOpacity>
            );
          })}
        </Card>

        {/* ── 알림 ── */}
        <Text style={styles.sectionLabel}>알림</Text>
        <Card style={styles.groupCard}>
          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={22} color={notifOn ? tc.primary : tc.textSecondary} style={styles.rowIcon} />
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, notifOn && { color: tc.primary, fontWeight: '700' }]}>전역 리마인더</Text>
              <Text style={styles.rowDesc}>전역 D-100·D-7·진급일·일정을 미리 알려드려요</Text>
            </View>
            <Switch
              value={notifOn}
              onValueChange={handleToggleNotif}
              disabled={notifBusy}
              trackColor={{ false: tc.border, true: tc.primaryLight }}
              thumbColor={Platform.OS === 'android' ? (notifOn ? tc.primary : tc.card) : undefined}
            />
          </View>
        </Card>
        <Text style={styles.hint}>* 알림은 이 기기에서만 예약되며, 현재 선택된 프로필 기준으로 발송됩니다.</Text>

        {/* ── 데이터 ── */}
        <Text style={styles.sectionLabel}>데이터</Text>
        <Card style={styles.groupCard}>
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={handleClearData}>
            <Ionicons name="trash-outline" size={22} color={tc.danger} style={styles.rowIcon} />
            <View style={styles.rowTextWrap}>
              <Text style={[styles.rowTitle, { color: tc.danger }]}>모든 데이터 삭제</Text>
              <Text style={styles.rowDesc}>모든 프로필·군생활 데이터를 초기화합니다</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={tc.textLight} />
          </TouchableOpacity>
        </Card>
        <Text style={styles.hint}>* 모든 데이터는 이 기기에만 저장되며 외부로 전송되지 않습니다.</Text>

        {/* ── 정보 ── */}
        <Text style={styles.sectionLabel}>앱 정보</Text>
        <Card style={styles.groupCard}>
          <View style={[styles.row, styles.rowDivider]}>
            <Ionicons name="information-circle-outline" size={22} color={tc.textSecondary} style={styles.rowIcon} />
            <Text style={styles.rowTitle}>앱 이름</Text>
            <Text style={styles.rowValue}>{appInfo.name}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="pricetag-outline" size={22} color={tc.textSecondary} style={styles.rowIcon} />
            <Text style={styles.rowTitle}>버전</Text>
            <Text style={styles.rowValue}>{appInfo.version}</Text>
          </View>
        </Card>

      </ScrollView>

      {/* ── 고정 배너 광고 (탭바 위, 스크롤 무관 항상 노출) ── */}
      <View style={styles.adFooter}>
        <AdBanner unit={AD_UNITS.HOME_BOTTOM} />
      </View>
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  container: { flex: 1, backgroundColor: tc.background },
  scrollFlex: { flex: 1 },
  scroll: { padding: 16 },
  adFooter: {
    paddingHorizontal: 16,
    paddingTop: 4,
    backgroundColor: tc.card,
    borderTopWidth: 1,
    borderTopColor: tc.border,
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: tc.primary },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: tc.textSecondary,
    marginTop: 14, marginBottom: 8, marginLeft: 4,
  },
  groupCard: { padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: tc.border },
  rowIcon: { marginRight: 12 },
  rowTextWrap: { flex: 1 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: tc.text },
  rowDesc: { fontSize: 12, color: tc.textSecondary, marginTop: 2 },
  rowValue: { fontSize: 15, color: tc.textSecondary, fontWeight: '600' },
  hint: { fontSize: 12, color: tc.textLight, marginTop: 8, marginLeft: 4, lineHeight: 17 },
});
