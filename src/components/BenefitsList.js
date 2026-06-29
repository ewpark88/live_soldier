import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeContext';
import { BENEFIT_CATEGORIES, BENEFIT_DISCLAIMER } from '../constants/benefits';

/** 군인 혜택 모음 목록 (급여 탭 내 섹션용 본문). */
export default function BenefitsList() {
  const tc = useThemeColors();
  const s = useMemo(() => makeStyles(tc), [tc]);

  const openUrl = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => Alert.alert('열 수 없음', '링크를 여는 중 문제가 발생했어요.'));
  };

  return (
    <View style={s.wrap}>
      {BENEFIT_CATEGORIES.map((cat) => (
        <View key={cat.key} style={s.cat}>
          <Text style={s.catTitle}>{cat.emoji} {cat.label}</Text>
          {cat.items.map((it, i) => (
            <TouchableOpacity
              key={it.title}
              activeOpacity={it.url ? 0.7 : 1}
              onPress={() => openUrl(it.url)}
              style={[s.row, i < cat.items.length - 1 && s.rowDivider]}
            >
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.title}>{it.title}</Text>
                  {it.tag && (
                    <View style={s.tag}><Text style={s.tagText}>{it.tag}</Text></View>
                  )}
                </View>
                <Text style={s.desc}>{it.desc}</Text>
              </View>
              {it.url && <Ionicons name="open-outline" size={18} color={tc.textLight} style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <Text style={s.disclaimer}>{BENEFIT_DISCLAIMER}</Text>
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  wrap: { marginTop: 14 },
  cat: { marginBottom: 16 },
  catTitle: { fontSize: 15, fontWeight: '800', color: tc.text, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: tc.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  title: { fontSize: 15, fontWeight: '700', color: tc.text },
  tag: { backgroundColor: tc.accent, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '800', color: tc.white },
  desc: { fontSize: 13, color: tc.textSecondary, lineHeight: 19 },
  disclaimer: { fontSize: 11.5, color: tc.textLight, lineHeight: 17, marginTop: 2 },
});
