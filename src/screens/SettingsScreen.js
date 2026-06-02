import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Card from '../components/Card';
import { useTheme, useThemeColors } from '../theme/ThemeContext';
import { clearAllData } from '../utils/storage';
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
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>설정</Text>

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
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  container: { flex: 1, backgroundColor: tc.background },
  scroll: { padding: 16 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: tc.primary, marginBottom: 6 },
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
