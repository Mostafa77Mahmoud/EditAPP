// app/components/ui/label.tsx
import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface LabelProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const Label: React.FC<LabelProps> = ({ children, style }) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark, isRTL);

  return <Text style={[styles.label, style]}>{children}</Text>;
};

const getStyles = (isDark: boolean, isRTL: boolean) => StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#374151',
    marginBottom: 8,
    textAlign: isRTL ? 'right' : 'left',
  },
});
export default Label;     