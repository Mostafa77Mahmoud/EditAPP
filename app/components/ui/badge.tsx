import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  style,
  textStyle,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);

  return (
    <View style={[styles.base, styles[variant], style]}>
      <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
        {children}
      </Text>
    </View>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  base: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
  default: { backgroundColor: '#10b981' },
  defaultText: { color: '#ffffff' },
  secondary: { backgroundColor: isDark ? '#374151' : '#f3f4f6' },
  secondaryText: { color: isDark ? '#f9fafb' : '#111827' },
  destructive: { backgroundColor: '#ef4444' },
  destructiveText: { color: '#ffffff' },
  outline: { borderWidth: 1, borderColor: isDark ? '#4b5563' : '#d1d5db' },
  outlineText: { color: isDark ? '#f9fafb' : '#111827' },
});
export default Badge;
// This component provides a customizable badge with different styles based on the variant prop, suitable for notifications