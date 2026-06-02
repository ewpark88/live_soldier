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
    borderRadius: 16,
    padding: 16,
    shadowColor: tc.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 12,
  },
});
