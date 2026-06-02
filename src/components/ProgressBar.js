import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';

export default function ProgressBar({
  progress = 0,
  showLabel = true,
  trackColor,
  fillColor,
  labelColor,
}) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const widthInterpolated = animWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.wrapper}>
      <View style={[styles.track, trackColor && { backgroundColor: trackColor }]}>
        <Animated.View
          style={[styles.fill, { width: widthInterpolated }, fillColor && { backgroundColor: fillColor }]}
        />
      </View>
      {showLabel && (
        <Text style={[styles.label, labelColor && { color: labelColor }]}>
          {Math.round(progress)}%
        </Text>
      )}
    </View>
  );
}

const makeStyles = (tc) => StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    height: 14,
    backgroundColor: tc.progressBg,
    borderRadius: 7,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: tc.progressFill,
    borderRadius: 7,
  },
  label: {
    width: 42,
    fontSize: 13,
    fontWeight: '700',
    color: tc.textSecondary,
    textAlign: 'right',
  },
});
