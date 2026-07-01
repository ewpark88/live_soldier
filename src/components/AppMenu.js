import React, { useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Image, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeContext';

/**
 * 네이티브 의존성 없는 커스텀 슬라이드 메뉴(햄버거).
 * 우측에서 밀려 들어오는 Modal 기반 드로어. navigation.navigate 로 화면 이동.
 *
 * @param {boolean}  visible
 * @param {function} onClose
 * @param {object}   navigation  react-navigation 객체
 * @param {string}   current     현재 화면 route name (강조 표시용)
 */
const MENU_ITEMS = [
  { key: 'home',      label: '홈',         icon: 'home-outline' },
  { key: 'discharge', label: '전역일 계산', icon: 'flag-outline' },
  { key: 'roadmap',   label: '전역 로드맵', icon: 'map-outline' },
  { key: 'leave',     label: '휴가 관리',   icon: 'calendar-outline' },
  { key: 'salary',    label: '급여 계산',   icon: 'cash-outline' },
  { key: 'todo',      label: '일정 관리',   icon: 'checkbox-outline' },
  { key: 'settings',  label: '설정',        icon: 'settings-outline' },
];

const PANEL_W = 288;

export default function AppMenu({ visible, onClose, navigation, current }) {
  const tc = useThemeColors();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const slide = useRef(new Animated.Value(PANEL_W)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
    } else {
      slide.setValue(PANEL_W);
      fade.setValue(0);
    }
  }, [visible, slide, fade]);

  const go = (key) => {
    onClose();
    if (key !== current) {
      // 닫힘 애니메이션과 겹치지 않도록 다음 틱에 이동
      requestAnimationFrame(() => navigation.navigate(key));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={s.overlayWrap} onPress={onClose}>
        <Animated.View style={[s.overlay, { opacity: fade }]} />
      </Pressable>

      <Animated.View
        style={[
          s.panel,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, transform: [{ translateX: slide }] },
        ]}
      >
        {/* 헤더 */}
        <View style={s.header}>
          <Image source={require('../../assets/icon.png')} style={s.logo} />
          <View style={{ flex: 1 }}>
            <Text style={s.appName}>전역까지</Text>
            <Text style={s.appSub}>메뉴</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={HIT}>
            <Ionicons name="close" size={24} color={tc.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 메뉴 항목 */}
        <View style={s.list}>
          {MENU_ITEMS.map((m) => {
            const active = m.key === current;
            return (
              <TouchableOpacity
                key={m.key}
                style={[s.item, active && s.itemActive]}
                onPress={() => go(m.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={active ? m.icon.replace('-outline', '') : m.icon}
                  size={21}
                  color={active ? tc.primary : tc.textSecondary}
                />
                <Text style={[s.itemLabel, active && s.itemLabelActive]}>{m.label}</Text>
                {active && <View style={s.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
}

const HIT = { top: 10, bottom: 10, left: 10, right: 10 };

const makeStyles = (tc) => StyleSheet.create({
  overlayWrap: { ...StyleSheet.absoluteFillObject },
  overlay: { flex: 1, backgroundColor: tc.overlay },
  panel: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0,
    width: PANEL_W,
    backgroundColor: tc.card,
    paddingHorizontal: 18,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: '#000', shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 18, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: tc.border },
  logo: { width: 40, height: 40, borderRadius: 10 },
  appName: { fontSize: 18, fontWeight: '800', color: tc.primary },
  appSub: { fontSize: 12, color: tc.textSecondary, marginTop: 1 },

  list: { marginTop: 6 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 15, paddingHorizontal: 12, borderRadius: 12,
  },
  itemActive: { backgroundColor: tc.highlightBg },
  itemLabel: { fontSize: 16, fontWeight: '600', color: tc.textSecondary, flex: 1 },
  itemLabelActive: { color: tc.primary, fontWeight: '800' },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: tc.accent },
});
