import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { ScreenType } from '@/app/MobileApp';

interface EnhancedHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightComponent?: React.ReactNode;
  onNavigate?: (screen: ScreenType) => void;
  disabled?: boolean;
}

export const EnhancedHeader: React.FC<EnhancedHeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightComponent,
  onNavigate,
  disabled = false,
}) => {
  const { isRTL } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark, isRTL);

  return (
    <View style={styles.container}>
      <View style={styles.sideContainer}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton} disabled={disabled}>
            {isRTL ? <ArrowRight size={24} color={styles.title.color} /> : <ArrowLeft size={24} color={styles.title.color} />}
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.sideContainer}>
        {rightComponent}
      </View>
    </View>
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) => StyleSheet.create({
  container: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#27272a' : '#e5e7eb',
  },
  sideContainer: {
    width: 40,
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: isDark ? '#f9fafb' : '#111827',
  },
});
export default EnhancedHeader;
// This component provides a customizable header with optional back navigation and a right component slot.