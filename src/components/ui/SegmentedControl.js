import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../theme/ThemeContext';
import { elev, radius as r, space as sp, type as ty } from '../../theme/tokens';
import { useMotion } from '../../hooks/useMotion';
import PressScale from './PressScale';

/**
 * 세그먼트 컨트롤 — 같은 화면 안의 '보기 전환'.
 *
 * 캘린더 탭은 칩 3개를 탭처럼 썼는데, 칩은 필터처럼 읽혀서 "화면이 바뀐다"는
 * 신호가 약했다. 트랙 + 미끄러지는 손잡이로 바꾼다.
 *
 * 손잡이 이동은 translateX — 폭 애니메이션을 쓰지 않는다.
 *
 * @param options  [{ key, label, icon? }]
 */
export default function SegmentedControl({ options, value, onChange, style }) {
  const tc = useThemeColors();
  const m = useMotion();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const [w, setW] = useState(0);

  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  const segW = w > 0 ? (w - PAD * 2) / options.length : 0;

  // 워클릿 안에서 JS 함수(m.spring)를 부르지 않도록 값으로 꺼내 둔다
  const reduced = m.reduced;
  const spr = m.spring('layout');
  const x = idx * segW;
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: reduced ? x : withSpring(x, spr) }],
  }), [x, reduced]);

  return (
    <View
      style={[styles.track, style]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {/* 손잡이는 elevation 없는 레이어 안에 둔다. 안드로이드는 elevation 이 그리기
          순서를 이겨서, 형제로 두면 손잡이(카드색)가 선택된 라벨 '위에' 그려져
          선택 칸 글자가 통째로 가려졌다. 레이어 자체는 Z=0 이라 라벨보다 먼저 그려진다. */}
      {segW > 0 ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Animated.View style={[styles.thumb, { width: segW }, thumbStyle]} />
        </View>
      ) : null}
      {options.map((o) => {
        const on = o.key === value;
        const fg = on ? tc.text : tc.textSecondary;
        return (
          <PressScale
            key={o.key}
            onPress={() => { if (!on) onChange(o.key); }}
            haptic="select"
            scale={1}
            style={styles.seg}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
          >
            {o.icon ? <Ionicons name={o.icon} size={16} color={fg} /> : null}
            <Text
              style={[styles.text, { color: fg }, on && styles.textOn]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {o.label}
            </Text>
          </PressScale>
        );
      })}
    </View>
  );
}

const PAD = 4;

const makeStyles = (tc) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      padding: PAD,
      borderRadius: r.md,
      backgroundColor: tc.surfaceSunken,
    },
    thumb: {
      position: 'absolute',
      top: PAD,
      bottom: PAD,
      left: PAD,
      borderRadius: r.sm,
      backgroundColor: tc.card,
      ...elev(tc).sm,
    },
    seg: {
      flex: 1,
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: sp.xs,
    },
    text: { ...ty.label },
    textOn: { fontWeight: '800' },
  });
