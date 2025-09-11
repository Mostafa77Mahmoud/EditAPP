import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { FileText, Search, CheckCircle, Sparkles, Loader, Eye, Brain, Shield, Zap } from 'lucide-react-native';
import { colors, gradients } from '../theme/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AnalyzingAnimationProps {
  isVisible: boolean;
  stage?: number;
  progress?: number;
  currentStage?: string;
}

const AnalyzingAnimation: React.FC<AnalyzingAnimationProps> = ({ 
  isVisible, 
  stage = 1, 
  progress = 0,
  currentStage
}) => {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const orbitAnim = useRef(new Animated.Value(0)).current;

  const [currentStep, setCurrentStep] = useState(1);
  const [stepProgress, setStepProgress] = useState(0);

  const isDark = theme === 'dark';

  const stages = [
    { 
      key: 'stage1', 
      icon: FileText, 
      color: colors.primary, 
      title: t('analyzing.steps.stage1.title') || 'Extracting Text',
      desc: t('analyzing.steps.stage1.desc') || 'Extracting and parsing document content'
    },
    { 
      key: 'stage2', 
      icon: Search, 
      color: colors.primary, 
      title: t('analyzing.steps.stage2.title') || 'Determine Clauses',
      desc: t('analyzing.steps.stage2.desc') || 'Identifying contractual clauses and terms'
    },
    { 
      key: 'stage3', 
      icon: Brain, 
      color: colors.primary, 
      title: t('analyzing.steps.stage3.title') || 'Generate Suggestions',
      desc: t('analyzing.steps.stage3.desc') || 'Generating Sharia-compliant suggestions'
    },
    { 
      key: 'stage4', 
      icon: Shield, 
      color: colors.primary, 
      title: t('analyzing.steps.stage4.title') || 'Compliance Check',
      desc: t('analyzing.steps.stage4.desc') || 'Evaluating Islamic law compliance'
    },
    { 
      key: 'stage5', 
      icon: CheckCircle, 
      color: colors.primary, 
      title: t('analyzing.steps.stage5.title') || 'Generate Report',
      desc: t('analyzing.steps.stage5.desc') || 'Preparing final analysis report'
    },
  ];

  useEffect(() => {
    if (isVisible) {
      // Entry animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous animations
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      );

      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      const orbitAnimation = Animated.loop(
        Animated.timing(orbitAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      );

      rotateAnimation.start();
      pulseAnimation.start();
      orbitAnimation.start();

      // Step progression logic - each step takes 6-7 seconds
      let stepTimer: NodeJS.Timeout;
      let progressTimer: NodeJS.Timeout;

      const startStepProgression = () => {
        setCurrentStep(1);
        setStepProgress(0);

        const runStep = (stepNumber: number) => {
          if (stepNumber > stages.length) return;

          setCurrentStep(stepNumber);
          setStepProgress(0);

          // Progress within each step (longer duration to cover API delays)
          const stepDuration = 10000 + Math.random() * 5000; // 10-15 seconds per step
          const progressInterval = 150; // Update every 150ms for smoother animation
          const progressIncrement = 100 / (stepDuration / progressInterval);

          progressTimer = setInterval(() => {
            setStepProgress(prev => {
              const newProgress = prev + progressIncrement;
              if (newProgress >= 100) {
                clearInterval(progressTimer);
                // Move to next step after a brief pause
                stepTimer = setTimeout(() => runStep(stepNumber + 1), 800);
                return 100;
              }
              return newProgress;
            });
          }, progressInterval);
        };

        runStep(1);
      };

      startStepProgression();

      return () => {
        rotateAnimation.stop();
        pulseAnimation.stop();
        orbitAnimation.stop();
        if (stepTimer) clearTimeout(stepTimer);
        if (progressTimer) clearInterval(progressTimer);
      };
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const orbit = orbitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const currentStageData = stages[Math.min(currentStep - 1, stages.length - 1)];
  const StageIcon = currentStageData.icon;

  if (!isVisible) return null;

  const styles = getStyles(isDark);

  return (
    <View style={styles.overlay}>
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideAnim }
            ],
          }
        ]}
      >
        {/* Main Icon with Enhanced Animation */}
        <View style={styles.iconWrapper}>
          <Animated.View 
            style={[
              styles.iconContainer,
              { 
                backgroundColor: `${currentStageData.color}20`,
                borderColor: `${currentStageData.color}40`,
                transform: [{ rotate: spin }]
              }
            ]}
          >
            <StageIcon size={36} color={currentStageData.color} />

            {/* Orbiting elements */}
            <Animated.View style={[
              styles.orbitingElement,
              { 
                transform: [
                  { rotate: orbit },
                  { translateX: 45 },
                  { rotate: orbitAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '-360deg'],
                  }) }
                ]
              }
            ]}>
              <View style={[styles.orbitDot, { backgroundColor: currentStageData.color }]} />
            </Animated.View>

            <Animated.View style={[
              styles.orbitingElement,
              { 
                transform: [
                  { rotate: orbitAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['180deg', '540deg'],
                  }) },
                  { translateX: 55 },
                  { rotate: orbitAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '-540deg'],
                  }) }
                ]
              }
            ]}>
              <View style={[styles.orbitDot, { backgroundColor: currentStageData.color, opacity: 0.7 }]} />
            </Animated.View>
          </Animated.View>

          {/* Pulse rings */}
          <Animated.View style={[
            styles.pulseRing,
            {
              borderColor: currentStageData.color,
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0.5, 0],
                extrapolate: 'clamp',
              })
            }
          ]} />
          <Animated.View style={[
            styles.pulseRing,
            styles.pulseRingDelayed,
            {
              borderColor: currentStageData.color,
              transform: [{ scale: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [1.1, 1.3],
              }) }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0.3, 0],
                extrapolate: 'clamp',
              })
            }
          ]} />
        </View>

        {/* Live Indicator */}
        <View style={styles.liveContainer}>
          <Animated.View style={[
            styles.liveDot, 
            { transform: [{ scale: pulseAnim }] }
          ]} />
          <Text style={styles.liveText}>{t('analyzing.live') || 'LIVE'}</Text>
          <Zap size={12} color="#ffffff" />
        </View>

        <Animated.Text 
          style={[
            styles.stageTitle, 
            { 
              color: currentStageData.color,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {currentStageData.title}
        </Animated.Text>

        <Text style={styles.stageDesc}>
          {currentStageData.desc}
        </Text>

        {/* Step Progress */}
        <View style={styles.progressContainer}>
          <Text style={[styles.stepText, { color: currentStageData.color }]}>
            Step {currentStep} of {stages.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${stepProgress}%`,
                  backgroundColor: currentStageData.color,
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: currentStageData.color }]}>
            {Math.round(stepProgress)}%
          </Text>
        </View>

        {/* Stage Indicators */}
        <View style={styles.stageIndicators}>
          {stages.map((stageItem, index) => (
            <Animated.View 
              key={stageItem.key}
              style={[
                styles.stageIndicator,
                { 
                  backgroundColor: index < currentStep ? stageItem.color : (isDark ? '#374151' : '#e5e7eb'),
                  transform: [{ 
                    scale: index === currentStep - 1 ? pulseAnim.interpolate({
                      inputRange: [1, 1.2],
                      outputRange: [1, 1.3],
                    }) : 1 
                  }]
                }
              ]} 
            />
          ))}
        </View>

        {/* Enhanced Badges */}
        <View style={styles.badgeContainer}>
          <Animated.View style={[
            styles.badge, 
            { transform: [{ scale: pulseAnim.interpolate({
              inputRange: [1, 1.2],
              outputRange: [1, 1.05],
            }) }] }
          ]}>
            <CheckCircle size={12} color="#ffffff" />
            <Text style={styles.badgeText}>{t('analyzing.shariaCompliant') || 'Sharia Compliant'}</Text>
          </Animated.View>
          <View style={styles.badge}>
            <Brain size={12} color="#ffffff" />
            <Text style={styles.badgeText}>{t('analyzing.aiPowered') || 'AI Powered'}</Text>
          </View>
          <View style={styles.badge}>
            <Eye size={12} color="#ffffff" />
            <Text style={styles.badgeText}>{t('analyzing.expertReviewed') || 'Expert Reviewed'}</Text>
          </View>
        </View>

        {/* Processing indicators */}
        <View style={styles.processingIndicators}>
          {[...Array(3)].map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.processingDot,
                {
                  backgroundColor: currentStageData.color,
                  transform: [{
                    scale: pulseAnim.interpolate({
                      inputRange: [1, 1.2],
                      outputRange: [0.8, 1],
                    })
                  }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.2],
                    outputRange: [0.4, 0.8],
                  })
                }
              ]}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 1000, // Ensure visibility on Android
  },
  container: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: screenWidth * 0.9,
    maxWidth: 400,
    minHeight: 400, // Ensure minimum height
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 25, // Higher elevation for Android
    borderWidth: 2,
    borderColor: isDark ? '#374151' : '#e5e7eb',
    transform: [{ perspective: 1000 }], // Add depth
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
    backgroundColor: `${colors.primary}20`, 
    borderColor: `${colors.primary}40`, 
  },
  orbitingElement: {
    position: 'absolute',
    width: 10,
    height: 10,
  },
  orbitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary, 
  },
  pulseRing: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: colors.primary, 
  },
  pulseRingDelayed: {
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 70,
    borderColor: colors.primary, 
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ef4444', // Keep original color for live indicator
    borderRadius: 15,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  liveText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  stageDesc: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stageIndicators: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  stageIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    backgroundColor: colors.primary, 
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  processingIndicators: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  processingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default AnalyzingAnimation;
export { AnalyzingAnimation };
export type { AnalyzingAnimationProps };
