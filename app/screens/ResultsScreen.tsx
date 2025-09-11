import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSession } from '../contexts/SessionContext';
import ContractTermsList from '../components/ContractTermsList';
import { ArrowLeft, ArrowRight, FileText, CheckCircle, AlertCircle } from 'lucide-react-native';

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
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

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
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const compliantTerms = analysisTerms?.filter(term => 
    term.expert_override_is_valid_sharia ?? (term.isUserConfirmed ? (term.isReviewedSuggestionValid ?? true) : term.is_valid_sharia) ?? false
  ).length || 0;
  
  const totalTerms = analysisTerms?.length || 0;
  const complianceRate = totalTerms > 0 ? Math.round((compliantTerms / totalTerms) * 100) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]} edges={['top', 'left', 'right']}>
      <View style={styles.safeTopSpace} />
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
  safeTopSpace: {
    height: Platform.OS === 'ios' ? 10 : 5,
  },
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
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#111827',
    flex: 1,
  },
  complianceContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 20,
  },
  complianceScore: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: isDark ? '#064e3b' : '#ecfdf5',
    borderRadius: 12,
    minWidth: 100,
  },
  compliancePercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: isDark ? '#6ee7b7' : '#10b981',
  },
  complianceLabel: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginTop: 4,
  },
  complianceDetails: {
    flex: 1,
    gap: 12,
  },
  complianceItem: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 8,
  },
  complianceText: {
    fontSize: 14,
    color: isDark ? '#d1d5db' : '#374151',
    fontWeight: '500',
  },
  termsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});

export default ResultsScreen;