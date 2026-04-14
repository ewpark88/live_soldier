import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../constants/colors';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import AdBanner from '../components/AdBanner';
import { AD_UNITS } from '../constants/adUnits';
import {
  loadMilitaryInfo,
  loadLeaveRecords,
  loadLeaveTotal,
} from '../utils/storage';
import {
  calcDaysLeft,
  calcProgress,
  calcServedDays,
  calcRank,
  getRandomMessage,
  formatDateKo,
} from '../utils/dateUtils';

const BRANCH_LABEL = { army: '육군', navy: '해군', airforce: '공군' };

export default function HomeScreen({ navigation }) {
  const [info, setInfo] = useState(null);
  const [leaveUsed, setLeaveUsed] = useState(0);
  const [leaveTotal, setLeaveTotal] = useState(21);
  const [message, setMessage] = useState(getRandomMessage());
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      loadData();
      setMessage(getRandomMessage());
    }, [])
  );

  const loadData = async () => {
    const mi = await loadMilitaryInfo();
    setInfo(mi);
    const records = await loadLeaveRecords();
    const used = records.reduce((sum, r) => sum + (r.days || 0), 0);
    setLeaveUsed(used);
    const lt = await loadLeaveTotal();
    setLeaveTotal(lt);
  };

  const startPulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  if (!info) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🪖</Text>
          <Text style={styles.emptyTitle}>환영합니다!</Text>
          <Text style={styles.emptyText}>
            입대 정보를 입력하면{'\n'}전역까지 얼마나 남았는지 알 수 있어요.
          </Text>
          <TouchableOpacity
            style={styles.setupBtn}
            onPress={() => navigation.navigate('discharge')}
          >
            <Text style={styles.setupBtnText}>입대 정보 입력하기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const daysLeft = calcDaysLeft(info.dischargeDate);
  const progress = calcProgress(info.enlistDate, info.dischargeDate);
  const servedDays = calcServedDays(info.enlistDate);
  const rank = calcRank(servedDays);
  const leaveLeft = leaveTotal - leaveUsed;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>전역까지</Text>
          <Text style={styles.headerSub}>{BRANCH_LABEL[info.branch]} · {rank}</Text>
        </View>

        {/* D-Day 메인 카드 */}
        <TouchableOpacity activeOpacity={0.88} onPress={startPulse}>
          <Card style={styles.mainCard}>
            <Text style={styles.mainLabel}>전역까지</Text>
            <Animated.Text style={[styles.dday, { transform: [{ scale: pulseAnim }] }]}>
              {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'D-Day!' : '전역 완료!'}
            </Animated.Text>
            <Text style={styles.dischargeDate}>{formatDateKo(info.dischargeDate)}</Text>
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>복무 진행률</Text>
              <ProgressBar progress={progress} />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{servedDays}</Text>
                <Text style={styles.statLabel}>복무 일수</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{daysLeft > 0 ? daysLeft : 0}</Text>
                <Text style={styles.statLabel}>남은 일수</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: COLORS.accentLight }]}>{progress}%</Text>
                <Text style={styles.statLabel}>진행률</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* ── 광고 1: 메인 카드 아래 ── */}
        <AdBanner unit={AD_UNITS.HOME_TOP} />

        {/* 응원 메시지 */}
        <Card style={styles.messageCard}>
          <Text style={styles.messageEmoji}>💬</Text>
          <Text style={styles.messageText}>{message}</Text>
          <TouchableOpacity
            onPress={() => setMessage(getRandomMessage())}
            style={styles.refreshBtn}
          >
            <Text style={styles.refreshText}>다른 메시지 보기 ↻</Text>
          </TouchableOpacity>
        </Card>

        {/* 빠른 요약 */}
        <View style={styles.quickRow}>
          <Card style={styles.quickCard}>
            <Text style={styles.quickEmoji}>🏖️</Text>
            <Text style={styles.quickValue}>{leaveLeft}일</Text>
            <Text style={styles.quickLabel}>남은 휴가</Text>
          </Card>
          <Card style={styles.quickCard}>
            <Text style={styles.quickEmoji}>⚔️</Text>
            <Text style={styles.quickValue}>{servedDays}일</Text>
            <Text style={styles.quickLabel}>복무 일수</Text>
          </Card>
        </View>

        {/* ── 광고 2: 하단 배너 ── */}
        <AdBanner unit={AD_UNITS.HOME_BOTTOM} style={{ marginBottom: 12 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, paddingBottom: 24 },
  header: { marginBottom: 14, marginTop: 6 },
  headerTitle: { fontSize: 30, fontWeight: '800', color: COLORS.primary },
  headerSub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 3 },

  mainCard: { alignItems: 'center', paddingVertical: 28, backgroundColor: COLORS.primary },
  mainLabel: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  dday: { fontSize: 68, fontWeight: '900', color: COLORS.white, letterSpacing: -2 },
  dischargeDate: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 20 },
  progressSection: { width: '100%', paddingHorizontal: 4, marginBottom: 20 },
  progressLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 18,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.white },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  messageCard: { alignItems: 'center', paddingVertical: 22 },
  messageEmoji: { fontSize: 30, marginBottom: 10 },
  messageText: { fontSize: 16, color: COLORS.text, textAlign: 'center', lineHeight: 24, fontWeight: '500' },
  refreshBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 20,
  },
  refreshText: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '600' },

  quickRow: { flexDirection: 'row', gap: 12 },
  quickCard: { flex: 1, alignItems: 'center', paddingVertical: 20, marginBottom: 12 },
  quickEmoji: { fontSize: 30, marginBottom: 8 },
  quickValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  quickLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 18 },
  emptyTitle: { fontSize: 26, fontWeight: '800', color: COLORS.primary, marginBottom: 10 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  setupBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 30 },
  setupBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 17 },
});
