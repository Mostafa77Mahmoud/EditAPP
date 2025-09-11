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
        {/* Compliance Summary Dashboard */}
        <View style={styles.summaryCard}>
          <View style={styles.complianceHeader}>
            <View style={styles.complianceIconContainer}>
              {complianceRate >= 80 ? (
                <CheckCircle size={24} color="#10b981" />
              ) : complianceRate >= 60 ? (
                <AlertCircle size={24} color="#f59e0b" />
              ) : (
                <AlertCircle size={24} color="#ef4444" />
              )}
            </View>
            <View style={styles.complianceInfo}>
              <Text style={styles.complianceStatus}>
                {complianceRate >= 80 ? 'High Compliance' : 
                 complianceRate >= 60 ? 'Moderate Compliance' : 
                 'Low Compliance'}
              </Text>
              <Text style={styles.compliancePercentage}>{complianceRate}%</Text>
            </View>
          </View>
          
          <Text style={styles.termsAnalyzed}>
            {totalTerms} total terms analyzed
          </Text>
          
          <Text style={styles.complianceDescription}>
            {complianceRate >= 60 ? 'Some terms need attention' : 'Multiple issues require review'}
          </Text>

          {/* Compliance Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.statIndicator, { backgroundColor: '#10b981' }]} />
              <Text style={styles.statNumber}>{compliantTerms}</Text>
              <Text style={styles.statLabel}>COMPLIANT</Text>
            </View>
            
            <View style={styles.statItem}>
              <View style={[styles.statIndicator, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.statNumber}>{totalTerms - compliantTerms}</Text>
              <Text style={styles.statLabel}>NON-COMPLIANT</Text>
            </View>
          </View>

          {/* Overall Compliance Progress Bar */}
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Overall Compliance</Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar,
                  {
                    width: `${complianceRate}%`,
                    backgroundColor: complianceRate >= 80 ? '#10b981' : 
                                   complianceRate >= 60 ? '#f59e0b' : '#ef4444'
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>📈 {complianceRate}%</Text>
          </View>
        </View>

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
  complianceHeader: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  complianceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? '#065f46' : '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: isRTL ? 0 : 12,
    marginLeft: isRTL ? 12 : 0,
  },
  complianceInfo: {
    flex: 1,
  },
  complianceStatus: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#111827',
    marginBottom: 4,
  },
  termsAnalyzed: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginBottom: 8,
  },
  complianceDescription: {
    fontSize: 14,
    color: isDark ? '#d1d5db' : '#374151',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    gap: 8,
  },
  statIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#111827',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
  },
  progressSection: {
    gap: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#d1d5db' : '#374151',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: isRTL ? 'left' : 'right',
  },
});

export default ResultsScreen;