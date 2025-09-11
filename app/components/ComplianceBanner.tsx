
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useSession } from '../contexts/SessionContext';
import { useTheme } from '../contexts/ThemeContext';
import { CheckCircle, AlertTriangle, Info, TrendingUp, Shield, AlertOctagon } from 'lucide-react-native';
import { Progress } from './ui/progress';

const ComplianceBanner: React.FC = () => {
  const { t } = useLanguage();
  const { complianceStats } = useSession();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const styles = getStyles(isDark);

  if (!complianceStats) {
    return (
      <View style={styles.loadingContainer}>
        <View style={[styles.loadingBar, { width: '75%' }]} />
        <View style={[styles.loadingBar, { width: '50%', marginTop: 8 }]} />
        <View style={styles.loadingStatsContainer}>
          <View style={styles.loadingStatBox} />
          <View style={styles.loadingStatBox} />
        </View>
        <View style={[styles.loadingBar, { height: 12, marginTop: 16 }]} />
      </View>
    );
  }

  const {
    currentUserEffectiveCompliantCount,
    currentUserEffectiveNonCompliantCount,
    overallCompliancePercentage
  } = complianceStats;

  const totalTerms = currentUserEffectiveCompliantCount + currentUserEffectiveNonCompliantCount;

  const getComplianceLevel = () => {
    if (overallCompliancePercentage >= 90) return 'excellent';
    if (overallCompliancePercentage >= 80) return 'good';
    if (overallCompliancePercentage >= 60) return 'moderate';
    if (overallCompliancePercentage >= 40) return 'poor';
    return 'critical';
  };

  const getComplianceColors = () => {
    const level = getComplianceLevel();
    switch (level) {
      case 'excellent':
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
          border: isDark ? 'rgba(16, 185, 129, 0.4)' : '#a7f3d0',
          text: isDark ? '#6ee7b7' : '#047857',
          iconBg: isDark ? 'rgba(16, 185, 129, 0.25)' : '#d1fae5',
          progressFill: isDark ? '#34d399' : '#10b981',
          accent: isDark ? '#059669' : '#065f46',
        };
      case 'good':
        return {
          bg: isDark ? 'rgba(34, 197, 94, 0.12)' : '#f0fdf4',
          border: isDark ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0',
          text: isDark ? '#86efac' : '#15803d',
          iconBg: isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7',
          progressFill: isDark ? '#22c55e' : '#16a34a',
          accent: isDark ? '#16a34a' : '#14532d',
        };
      case 'moderate':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
          border: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a',
          text: isDark ? '#fcd34d' : '#b45309',
          iconBg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
          progressFill: isDark ? '#f59e0b' : '#d97706',
          accent: isDark ? '#d97706' : '#92400e',
        };
      case 'poor':
        return {
          bg: isDark ? 'rgba(251, 146, 60, 0.12)' : '#fff7ed',
          border: isDark ? 'rgba(251, 146, 60, 0.3)' : '#fed7aa',
          text: isDark ? '#fdba74' : '#c2410c',
          iconBg: isDark ? 'rgba(251, 146, 60, 0.2)' : '#ffedd5',
          progressFill: isDark ? '#fb923c' : '#ea580c',
          accent: isDark ? '#ea580c' : '#9a3412',
        };
      case 'critical':
        return {
          bg: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
          border: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
          text: isDark ? '#fca5a5' : '#b91c1c',
          iconBg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2',
          progressFill: isDark ? '#ef4444' : '#dc2626',
          accent: isDark ? '#dc2626' : '#991b1b',
        };
      default:
        return {
          bg: isDark ? 'rgba(156, 163, 175, 0.12)' : '#f9fafb',
          border: isDark ? 'rgba(156, 163, 175, 0.3)' : '#d1d5db',
          text: isDark ? '#d1d5db' : '#4b5563',
          iconBg: isDark ? 'rgba(156, 163, 175, 0.2)' : '#f3f4f6',
          progressFill: isDark ? '#9ca3af' : '#6b7280',
          accent: isDark ? '#6b7280' : '#374151',
        };
    }
  };

  const colors = getComplianceColors();
  const level = getComplianceLevel();
  
  const ComplianceIcon = level === 'excellent' || level === 'good' ? CheckCircle : 
                         level === 'moderate' ? Info : 
                         level === 'poor' ? AlertTriangle : AlertOctagon;

  const getComplianceTitle = () => {
    switch (level) {
      case 'excellent': return t('compliance.excellent') || 'Excellent Compliance';
      case 'good': return t('compliance.good') || 'Good Compliance';
      case 'moderate': return t('compliance.moderate') || 'Moderate Compliance';
      case 'poor': return t('compliance.poor') || 'Poor Compliance';
      case 'critical': return t('compliance.critical') || 'Critical Issues';
      default: return t('compliance.unknown') || 'Unknown Status';
    }
  };

  const getComplianceDescription = () => {
    switch (level) {
      case 'excellent': return t('compliance.excellentDesc') || 'Contract meets all Sharia requirements';
      case 'good': return t('compliance.goodDesc') || 'Contract mostly complies with Sharia law';
      case 'moderate': return t('compliance.moderateDesc') || 'Some terms need attention';
      case 'poor': return t('compliance.poorDesc') || 'Several terms require modification';
      case 'critical': return t('compliance.criticalDesc') || 'Major Sharia compliance issues found';
      default: return t('compliance.terms') || 'Contract analysis results';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      {/* Header with enhanced icon and status */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
          <ComplianceIcon color={colors.text} size={28} />
          <View style={[styles.statusDot, { backgroundColor: colors.progressFill }]} />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>
            {getComplianceTitle()}
          </Text>
          <Text style={[styles.subtitle, { color: colors.accent }]}>
            {totalTerms} {t('compliance.totalTerms') || 'total terms analyzed'}
          </Text>
        </View>
        <View style={styles.percentageContainer}>
          <Text style={[styles.percentageText, { color: colors.text }]}>
            {Math.round(overallCompliancePercentage)}%
          </Text>
        </View>
      </View>

      {/* Enhanced description */}
      <Text style={[styles.description, { color: isDark ? '#d1d5db' : '#6b7280' }]}>
        {getComplianceDescription()}
      </Text>

      {/* Improved stats container */}
      <View style={styles.statsContainer}>
        <View style={[styles.statBox, styles.compliantStatBox]}>
          <View style={styles.statIconContainer}>
            <Shield size={18} color={isDark ? '#6ee7b7' : '#059669'} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statNumber, { color: isDark ? '#6ee7b7' : '#059669' }]}>
              {currentUserEffectiveCompliantCount}
            </Text>
            <Text style={styles.statLabel}>{t('compliance.compliantTerms') || 'Compliant'}</Text>
          </View>
        </View>
        
        <View style={[styles.statBox, styles.nonCompliantStatBox]}>
          <View style={styles.statIconContainer}>
            <AlertTriangle size={18} color={isDark ? '#fca5a5' : '#dc2626'} />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statNumber, { color: isDark ? '#fca5a5' : '#dc2626' }]}>
              {currentUserEffectiveNonCompliantCount}
            </Text>
            <Text style={styles.statLabel}>{t('compliance.nonCompliantTerms') || 'Non-Compliant'}</Text>
          </View>
        </View>
      </View>

      {/* Enhanced progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
            {t('compliance.overall') || 'Overall Compliance'}
          </Text>
          <View style={styles.progressStats}>
            <TrendingUp size={14} color={colors.text} />
            <Text style={[styles.progressPercentage, { color: colors.text }]}>
              {Math.round(overallCompliancePercentage)}%
            </Text>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <Progress 
            value={overallCompliancePercentage} 
            indicatorStyle={{ 
              backgroundColor: colors.progressFill,
              borderRadius: 6,
            }}
            style={styles.progressBar}
          />
        </View>
      </View>
    </View>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  loadingContainer: { 
    backgroundColor: isDark ? '#1f2937' : '#f9fafb', 
    borderRadius: 16, 
    padding: 24, 
    marginHorizontal: 16, 
    marginVertical: 16, 
    borderWidth: 1, 
    borderColor: isDark ? '#374151' : '#e5e7eb' 
  },
  loadingBar: { 
    height: 16, 
    backgroundColor: isDark ? '#374151' : '#e5e7eb', 
    borderRadius: 8 
  },
  loadingStatsContainer: { 
    flexDirection: 'row', 
    gap: 16, 
    marginTop: 16 
  },
  loadingStatBox: { 
    flex: 1, 
    height: 80, 
    backgroundColor: isDark ? '#374151' : '#e5e7eb', 
    borderRadius: 12 
  },
  container: { 
    borderRadius: 16, 
    padding: 24, 
    marginHorizontal: 16, 
    marginVertical: 16, 
    borderWidth: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 8, 
    elevation: 4 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  iconContainer: { 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: isDark ? '#1f2937' : '#ffffff',
  },
  headerContent: {
    flex: 1,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  percentageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  percentageText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: { 
    fontSize: 15, 
    marginBottom: 20, 
    lineHeight: 22,
    fontWeight: '500',
  },
  statsContainer: { 
    flexDirection: 'row', 
    gap: 16, 
    marginBottom: 24 
  },
  statBox: { 
    flex: 1, 
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)', 
    padding: 16, 
    borderRadius: 12, 
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  compliantStatBox: {
    borderLeftWidth: 4,
    borderLeftColor: isDark ? '#6ee7b7' : '#059669',
  },
  nonCompliantStatBox: {
    borderLeftWidth: 4,
    borderLeftColor: isDark ? '#fca5a5' : '#dc2626',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statNumber: { 
    fontSize: 24, 
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: { 
    fontSize: 12, 
    color: isDark ? '#9ca3af' : '#6b7280', 
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
  },
});

export default ComplianceBanner;
