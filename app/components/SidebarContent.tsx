import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Upload, Search, Edit, CheckSquare, MessageCircleQuestion, Download, Zap, Users, Palette, FileText, ShieldCheck, Lock } from 'lucide-react-native';

const SidebarContent: React.FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  // If you want RTL support, add a variable or logic here, or remove RTL support for now:
  const isRTL = false;
  const styles = getStyles(isDark, isRTL);

  const howItWorksSteps = [
    { key: 'sidebar.step1_new', icon: Upload },
    { key: 'sidebar.step2_new', icon: Search },
    { key: 'sidebar.step3_new', icon: Edit },
    { key: 'sidebar.step4_new', icon: CheckSquare },
    { key: 'sidebar.step5_new', icon: MessageCircleQuestion },
    { key: 'sidebar.step6_new', icon: Download },
  ];
  
  const features = [
    { key: 'features.instantAnalysis_new', icon: Zap },
    { key: 'features.designedForIslamicLaw', icon: ShieldCheck },
    { key: 'features.multilingual_new', icon: Users },
    { key: 'features.darkMode_new', icon: Palette },
    { key: 'features.exportDocuments', icon: FileText },
    { key: 'features.dataPrivacy_new', icon: Lock },
  ];

  // NOTE: You must add logo-light.png and logo-dark.png to your assets folder
  // For now, using placeholders.
  const logoSource = isDark 
    ? require('../../assets/logo-dark.png') 
    : require('../../assets/logo-light.png');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />
      </View>

      <View style={styles.section}>
        <Text style={styles.welcomeTitle}>{t('sidebar.welcome')}</Text>
        <Text style={styles.description}>{t('sidebar.description_new')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sidebar.howTo_new')}</Text>
        {howItWorksSteps.map((step) => {
          const IconComponent = step.icon;
          return (
            <View key={step.key} style={styles.listItem}>
              <IconComponent size={20} color="#10b981" style={styles.icon} />
              <Text style={styles.listItemText}>{t(step.key)}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('sidebar.features_new')}</Text>
        {features.map((feature) => {
          const IconComponent = feature.icon;
          return (
            <View key={feature.key} style={styles.listItem}>
              <IconComponent size={16} color="#10b981" style={styles.icon} />
              <Text style={styles.listItemText}>{t(feature.key)}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) => StyleSheet.create({
  container: {
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#27272a' : '#e4e4e7',
  },
  logo: {
    height: 120,
    width: '80%',
  },
  section: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    color: isDark ? '#d1d5db' : '#4b5563',
    lineHeight: 22,
    textAlign: 'center',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDark ? '#f9fafb' : '#111827',
    marginBottom: 16,
    textAlign: isRTL ? 'right' : 'left',
  },
  listItem: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  icon: {
    marginTop: 2,
    marginRight: isRTL ? 0 : 12,
    marginLeft: isRTL ? 12 : 0,
  },
  listItemText: {
    flex: 1,
    color: isDark ? '#d1d5db' : '#4b5563',
    lineHeight: 20,
    fontSize: 14,
    textAlign: isRTL ? 'right' : 'left',
  },
});

export default SidebarContent;