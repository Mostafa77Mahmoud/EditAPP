
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { useLanguage } from '../contexts/LanguageContext';

interface AnalysisProgressCardProps {
  sessionId: string;
  onCancel?: () => void;
  onViewDetails?: () => void;
  progress?: number;
}

export const AnalysisProgressCard: React.FC<AnalysisProgressCardProps> = ({
  sessionId,
  onCancel,
  onViewDetails,
  progress = 0,
}) => {
  const { t } = useLanguage();
  const [animValue] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const animatedOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.iconContainer,
            { opacity: animatedOpacity }
          ]}
        >
          <View style={styles.spinner} />
        </Animated.View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {t('analyzing_contract') || 'Analyzing Contract'}
          </Text>
          <Text style={styles.subtitle}>
            {t('processing_in_background') || 'Processing in background...'}
          </Text>
          {progress > 0 && (
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress, 100)}%` }
                ]} 
              />
            </View>
          )}
        </View>

        <View style={styles.actions}>
          {onViewDetails && (
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={onViewDetails}
            >
              <Text style={styles.viewButtonText}>
                {t('view') || 'View'}
              </Text>
            </TouchableOpacity>
          )}
          
          {onCancel && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>
                {t('cancel') || 'Cancel'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.gray200,
    borderTopColor: colors.primary,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.gray200,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  actions: {
    flexDirection: 'column',
    gap: 8,
  },
  viewButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  viewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.gray300,
    minWidth: 60,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});