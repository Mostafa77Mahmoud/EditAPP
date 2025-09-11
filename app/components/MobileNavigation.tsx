import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSession } from '../contexts/SessionContext';
import { Icon, PrimaryIcon, SecondaryIcon } from './ui/icons';
import { ScreenType } from "../MobileApp"; // أو المسار الصح للملف اللي فيه ScreenType

interface MobileNavigationProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  disabled?: boolean;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentScreen,
  onNavigate,
  disabled = false,
}) => {
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const { isAnalyzingContract } = useSession();
  const isDark = theme === 'dark';

  // Navigation is disabled when globally disabled or during analysis
  const isNavigationDisabled = disabled || isAnalyzingContract;

  const styles = getStyles(isDark, isRTL);

  const navItems = [
    {
      id: 'home',
      label: t('navigation.home'),
      icon: 'home',
    },
    {
      id: 'upload',
      label: t('navigation.upload'),
      icon: 'cloud-upload',
    },
    {
      id: 'camera',
      label: t('navigation.camera'),
      icon: 'camera',
    },
    {
      id: 'history',
      label: t('navigation.history'),
      icon: 'time',
    },
    {
      id: 'profile',
      label: t('navigation.profile'),
      icon: 'person',
    },
  ];

  const handleNavigate = (screen: ScreenType) => {
    try {
      if (isNavigationDisabled) {
        console.log('🔒 MobileNavigation: Navigation disabled');
        console.log('🔒 State:', {
          globalDisabled: disabled,
          currentScreen,
          isAnalyzing: isAnalyzingContract,
          targetScreen: screen,
          navigationDisabled: isNavigationDisabled
        });
        return;
      }

      if (typeof onNavigate === 'function') {
        onNavigate(screen);
      } else {
        console.error('❌ onNavigate is not a function:', onNavigate);
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.navItem,
                isActive && styles.activeNavItem,
                isNavigationDisabled && { opacity: 0.5 }
              ]}
              onPress={() => handleNavigate(item.id as ScreenType)}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              disabled={isNavigationDisabled}
            >
              <Icon
                name={item.icon as any}
                size={22}
                color={isActive ? '#3b82f6' : (isDark ? '#9ca3af' : '#6b7280')}
                style={isNavigationDisabled ? { opacity: 0.5 } : undefined}
              />
              <Text
                style={[
                  styles.navLabel,
                  isActive && styles.activeNavLabel,
                  { textAlign: isRTL ? 'right' : 'left' },
                  isNavigationDisabled && { opacity: 0.5 }
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) => StyleSheet.create({
  safeArea: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
  },
  container: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderTopWidth: 1,
    borderTopColor: isDark ? '#374151' : '#e5e7eb',
    ...Platform.select({
      web: {
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 60,
  },
  activeNavItem: {
    backgroundColor: isDark ? '#1e3a8a15' : '#3b82f615',
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: isDark ? '#9ca3af' : '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  activeNavLabel: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});

export default MobileNavigation;