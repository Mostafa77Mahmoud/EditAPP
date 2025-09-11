// app/components/ui/separator.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface SeparatorProps {
  style?: ViewStyle;
  orientation?: 'horizontal' | 'vertical';
}

export const Separator: React.FC<SeparatorProps> = ({ style, orientation = 'horizontal' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);

  return (
    <View
      style={[
        styles.separator,
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        style,
      ]}
    />
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  separator: {
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
  },
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
});
export default Separator;
// This component provides a customizable separator with horizontal and vertical orientations, suitable for UI layouts.