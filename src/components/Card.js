import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';

export default function Card({ children, style }) {
  const tc = useThemeColors();
  const styles = useMemo(() => makeStyles(tc), [tc]);
  return <View style={[styles.card, style]}>{children}</View>;
}

const makeStyles = (tc) => StyleSheet.create({
  card: {
    backgroundColor: tc.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tc.border,
    shadowColor: tc.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
    marginBottom: 12,
  },
});
