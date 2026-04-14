import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants/colors';

export default function ProgressBar({ progress = 0, showLabel = true }) {
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
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: widthInterpolated }]}
        />
      </View>
      {showLabel && (
        <Text style={styles.label}>{Math.round(progress)}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  track: {
    flex: 1,
    height: 14,
    backgroundColor: COLORS.progressBg,
    borderRadius: 7,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.progressFill,
    borderRadius: 7,
  },
  label: {
    width: 42,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'right',
  },
});
