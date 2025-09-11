import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSession } from '../contexts/SessionContext';
import ContractTermsList from '../components/ContractTermsList';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';

interface ResultsScreenProps {
  onBack: () => void;
  sessionId?: string;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ onBack }) => {
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const { analysisTerms, sessionDetails } = useSession();
  
  const isDark = theme === 'dark';
  const styles = getStyles(isDark, isRTL);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Smooth entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]} edges={['top', 'left', 'right', 'bottom']}>

      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          {isRTL ? <ArrowRight size={24} color={styles.headerTitle.color} /> : <ArrowLeft size={24} color={styles.headerTitle.color} />}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('results.title')}</Text>
        <View style={styles.headerButton} />
      </Animated.View>

      <Animated.View 
        style={[
          styles.termsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ContractTermsList />
      </Animated.View>
    </SafeAreaView>
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0a0a0a' : '#f8fafc',
  },
  header: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#272727' : '#e5e7eb',
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#111827',
  },
  termsContainer: {
    flex: 1,
    paddingHorizontal: 4,
    paddingTop: 8,
  },
});

export default ResultsScreen;