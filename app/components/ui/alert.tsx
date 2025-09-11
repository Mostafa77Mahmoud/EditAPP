// app/components/ui/alert.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { AlertCircle, Terminal } from 'lucide-react-native';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
  style?: ViewStyle;
}

export const AlertTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  return <Text style={styles.title}>{children}</Text>;
};

export const AlertDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  return <Text style={styles.description}>{children}</Text>;
};

export const Alert: React.FC<AlertProps> = ({ children, variant = 'default', style }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  const Icon = variant === 'destructive' ? AlertCircle : Terminal;
  const iconColor = variant === 'destructive' ? '#f87171' : (isDark ? '#9ca3af' : '#374151');

  return (
    <View style={[styles.container, styles[variant], style]}>
      <Icon color={iconColor} size={16} style={styles.icon} />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    paddingLeft: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  default: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
  },
  destructive: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2',
    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
  },
  icon: {
    position: 'absolute',
    left: 16,
    top: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
    fontWeight: '600',
    color: isDark ? '#f9fafb' : '#111827',
  },
  description: {
    fontSize: 14,
    color: isDark ? '#d1d5db' : '#6b7280',
  },
}); 
export default Alert;
// This component provides a customizable alert with title, description, and icon based on the variant.