import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Linking, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSession } from '../contexts/SessionContext';
import { ArrowLeft, ArrowRight, LogOut, Moon, Sun, Languages, User, Shield, HelpCircle, Share2, Star, UserCheck } from 'lucide-react-native';

interface ProfileScreenProps {
  onBack: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  // Temporary fix - derive guest mode from user state
  const isGuestMode = !user;
  const { theme, toggleTheme } = useTheme();
  const { currentUserRole, toggleUserRole } = useSession();
  const [notifications, setNotifications] = useState(true);

  const isDark = theme === 'dark';
  const styles = getStyles(isDark, isRTL);

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.logout'), style: 'destructive', onPress: logout },
      ]
    );
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleAccountPress = () => {
    const emailUrl = 'mailto:mostafa.mahmoud.osman77@gmail.com';
    Linking.openURL(emailUrl).catch(err => {
      Alert.alert(
        t('error.generic') || 'Error',
        'Could not open email client'
      );
    });
  };

  const handlePrivacyPress = () => {
    const linkedInUrl = 'https://singular-quokka-acf95d.netlify.app/#';
    Linking.openURL(linkedInUrl).catch(err => {
      Alert.alert(
        t('error.generic') || 'Error',
        'Could not open LinkedIn profile'
      );
    });
  };

  const handleShareApp = async () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.mostafa.shariaaanalyzer';
    const message = t('profile.shareMessage') || 'Check out this amazing Sharia Contract Analyzer app!';
    
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Share.share({
          message: `${message} ${playStoreUrl}`,
          url: playStoreUrl,
        });
      } else {
        // Fallback for web
        await Linking.openURL(playStoreUrl);
      }
    } catch (error) {
      Alert.alert(
        t('error.generic') || 'Error',
        'Could not share the app'
      );
    }
  };

  const handleRateApp = () => {
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.mostafa.shariaaanalyzer';
    Linking.openURL(playStoreUrl).catch(err => {
      Alert.alert(
        t('error.generic') || 'Error',
        'Could not open Play Store'
      );
    });
  };

  const OptionRow = ({ icon, label, value, onToggle, isSwitch, onPress }: any) => (
    <TouchableOpacity style={styles.optionRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.optionLabelContainer}>
        {icon}
        <Text style={styles.optionLabel}>{label}</Text>
      </View>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: isDark ? '#4b5563' : '#d1d5db', true: '#10b981' }}
          thumbColor="#ffffff"
        />
      ) : (
        <View style={styles.optionValueContainer}>
          {value && <Text style={styles.optionValue}>{value}</Text>}
          {onPress && (isRTL ? <ArrowLeft size={16} color={styles.optionValue.color} /> : <ArrowRight size={16} color={styles.optionValue.color} />)}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          {isRTL ? <ArrowRight size={24} color={styles.headerTitle.color} /> : <ArrowLeft size={24} color={styles.headerTitle.color} />}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.profile')}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {isGuestMode ? 'G' : (user?.username?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>
            {isGuestMode ? t('home.guestUser') : user?.username || user?.email?.split('@')[0]}
          </Text>
          <Text style={styles.userEmail}>
            {isGuestMode ? t('profile.temporaryAccount') : user?.email}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>
          <TouchableOpacity style={styles.userRoleRow} onPress={toggleUserRole}>
            <View style={styles.optionLabelContainer}>
              <UserCheck size={20} color={styles.optionLabel.color} />
              <Text style={styles.optionLabel}>{t('profile.userRole')}</Text>
            </View>
            <View style={styles.roleToggleContainer}>
              <View style={[
                styles.roleToggle,
                { backgroundColor: currentUserRole === 'shariah_expert' ? '#f59e0b' : '#3b82f6' }
              ]}>
                <Text style={styles.roleToggleText}>
                  {currentUserRole === 'regular_user' ? t('user.regular') : t('user.expert')}
                </Text>
              </View>
              {isRTL ? <ArrowLeft size={16} color={styles.optionValue.color} /> : <ArrowRight size={16} color={styles.optionValue.color} />}
            </View>
          </TouchableOpacity>
          <OptionRow
            icon={<Moon size={20} color={styles.optionLabel.color} />}
            label={t('profile.darkMode')}
            value={isDark}
            onToggle={toggleTheme}
            isSwitch
          />
          <OptionRow
            icon={<Languages size={20} color={styles.optionLabel.color} />}
            label={t('profile.language')}
            value={language === 'en' ? 'English' : 'العربية'}
            onPress={toggleLanguage}
          />
          <OptionRow
            icon={<User size={20} color={styles.optionLabel.color} />}
            label={t('profile.account')}
            onPress={handleAccountPress}
          />
          <OptionRow
            icon={<Shield size={20} color={styles.optionLabel.color} />}
            label={t('profile.privacy')}
            onPress={handlePrivacyPress}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.support')}</Text>
          <OptionRow
            icon={<HelpCircle size={20} color={styles.optionLabel.color} />}
            label={t('profile.help')}
            onPress={() => {}}
          />
          <OptionRow
            icon={<Share2 size={20} color={styles.optionLabel.color} />}
            label={t('profile.share')}
            onPress={handleShareApp}
          />
          <OptionRow
            icon={<Star size={20} color={styles.optionLabel.color} />}
            label={t('profile.rate')}
            onPress={handleRateApp}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.logoutText}>
            {isGuestMode ? t('guest.exit') : t('auth.logout')}
          </Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0a0a0a' : '#f8fafc', paddingTop: 20 },
  header: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: isDark ? '#1f2937' : '#ffffff', borderBottomWidth: 1, borderBottomColor: isDark ? '#27272a' : '#e5e7eb' },
  headerButton: { padding: 8, width: 40 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#111827' },
  profileSection: { alignItems: 'center', paddingVertical: 30, backgroundColor: isDark ? '#1f2937' : '#ffffff' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#ffffff' },
  userName: { fontSize: 24, fontWeight: 'bold', color: isDark ? '#f9fafb' : '#1f2937', marginBottom: 4 },
  userEmail: { fontSize: 16, color: isDark ? '#9ca3af' : '#6b7280' },
  section: { backgroundColor: isDark ? '#1f2937' : '#ffffff', marginHorizontal: 16, marginTop: 24, borderRadius: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: isDark ? '#9ca3af' : '#6b7280', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, textTransform: 'uppercase', textAlign: isRTL ? 'right' : 'left' },
  optionRow: { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: isDark ? '#27272a' : '#e5e7eb' },
  optionLabelContainer: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 16 },
  optionLabel: { fontSize: 16, color: isDark ? '#f9fafb' : '#111827' },
  optionValueContainer: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 },
  optionValue: { fontSize: 16, color: isDark ? '#9ca3af' : '#6b7280' },
  userRoleRow: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#27272a' : '#e5e7eb',
  },
  roleToggleContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  roleToggleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: isDark ? '#4b1d1d' : '#fee2e2', marginHorizontal: 16, marginTop: 32, paddingVertical: 14, borderRadius: 12 },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
});

export default ProfileScreen;