import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  return <View style={[styles.card, style]}>{children}</View>;
};

export const CardHeader: React.FC<CardProps> = ({ children, style }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  return <View style={[styles.header, style]}>{children}</View>;
};

export const CardContent: React.FC<CardProps> = ({ children, style }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  return <View style={[styles.content, style]}>{children}</View>;
};

export const CardFooter: React.FC<CardProps> = ({ children, style }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  return <View style={[styles.footer, style]}>{children}</View>;
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  card: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
  },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#374151' : '#e5e7eb' },
  content: { padding: 16 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: isDark ? '#374151' : '#e5e7eb' },
});
export default Card;
// // This component provides a customizable card layout with header, content, and footer sections, suitable