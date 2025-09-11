import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ArrowRight, LogIn, LogOut, UserPlus } from 'lucide-react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import SidebarContent from '../components/SidebarContent';
import { Button } from '../components/ui/button';

interface SidebarScreenProps {
  onNavigate: (screen: string) => void;
  onBack: () => void;
}

const SidebarScreen: React.FC<SidebarScreenProps> = ({ onNavigate, onBack }) => {
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const { isGuestMode, user, logout } = useAuth();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark, isRTL);

  const handleLogin = () => {
    // In a real app, you might navigate to a dedicated login screen
    // For now, we can just log a message or trigger the auth flow
    console.log('Navigate to login');
  };

  const handleSignup = () => {
    console.log('Navigate to signup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          {isRTL ? <ArrowRight size={24} color={styles.headerTitle.color} /> : <ArrowLeft size={24} color={styles.headerTitle.color} />}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('sidebar.title') || 'Menu'}</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={{ flex: 1 }}>
        <SidebarContent />
      </View>

      <View style={styles.footer}>
        {isGuestMode ? (
          <>
            <View style={styles.guestInfo}>
              <Text style={styles.guestTitle}>{t('guest.mode')}</Text>
              <Text style={styles.guestSubtitle}>{t('guest.featuresAvailable')}</Text>
            </View>
            <View style={styles.authButtons}>
              <Button style={{ flex: 1 }} onPress={handleLogin}>
                <LogIn size={16} color="#fff" />
                <Text style={styles.buttonTextPrimary}>{t('auth.login')}</Text>
              </Button>
              <Button variant="outline" style={{ flex: 1 }} onPress={handleSignup}>
                <UserPlus size={16} color={isDark ? '#fff' : '#000'} />
                <Text style={styles.buttonText}>{t('auth.signup')}</Text>
              </Button>
            </View>
          </>
        ) : (
          <>
            <View style={styles.userInfo}>
              <Text style={styles.userText}>
                {t('auth.loggedInAs')} <Text style={styles.userEmail}>{user?.email}</Text>
              </Text>
            </View>
            <Button variant="destructive" onPress={logout}>
              <LogOut size={16} color="#fff" />
              <Text style={styles.buttonTextPrimary}>{t('app.logout')}</Text>
            </Button>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
  },
  header: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#27272a' : '#e4e4e7',
  },
  headerButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#111827',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#27272a' : '#e4e4e7',
    backgroundColor: isDark ? '#1f2937' : '#f9fafb',
  },
  guestInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 4,
  },
  guestSubtitle: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
  },
  authButtons: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    gap: 12,
  },
  buttonText: {
    color: isDark ? '#f9fafb' : '#111827',
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#ffffff',
    fontWeight: '600',
  },
  userInfo: {
    marginBottom: 12,
  },
  userText: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
  },
  userEmail: {
    fontWeight: '600',
    color: isDark ? '#f9fafb' : '#111827',
  },
});

export default SidebarScreen;