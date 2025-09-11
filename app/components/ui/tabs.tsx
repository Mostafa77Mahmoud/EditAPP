// app/components/ui/tabs.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface TabsProps {
  tabs: { value: string; label: string }[];
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const isDark = theme === 'dark';

  const styles = getStyles(isDark, isRTL);

  return (
    <View style={styles.list}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.value}
          style={[styles.trigger, activeTab === tab.value && styles.activeTrigger]}
          onPress={() => onTabChange(tab.value)}
        >
          <Text style={[styles.triggerText, activeTab === tab.value && styles.activeTriggerText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) => StyleSheet.create({
  list: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  trigger: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTrigger: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  triggerText: {
    fontSize: 14,
    color: isDark ? '#d1d5db' : '#6b7280',
    fontWeight: '500',
  },
  activeTriggerText: {
    color: isDark ? '#f9fafb' : '#111827',
  },
});
export default Tabs;
// This component provides a customizable tab navigation with styles based on the current theme and language direction.