
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Modal, Platform } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { FileText, Download, CheckCircle, Sparkles, Loader, Zap } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ContractGenerationModalProps {
  isVisible: boolean;
  type: 'modified' | 'marked';
  progress?: number;
  onClose?: () => void;
}

const ContractGenerationModal: React.FC<ContractGenerationModalProps> = ({ 
  isVisible, 
  type,
  progress = 0,
  onClose
}) => {
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [animationStep, setAnimationStep] = useState(1);

  const isDark = theme === 'dark';

  const steps = [
    {
      icon: FileText,
      color: '#3b82f6',
      title: isRTL ? 'استخراج البيانات' : 'Extracting Data',
      desc: isRTL ? 'استخراج المعلومات من العقد' : 'Extracting information from contract'
    },
    {
      icon: Sparkles,
      color: '#8b5cf6',
      title: isRTL ? 'معالجة الشروط' : 'Processing Terms',
      desc: isRTL ? 'معالجة الشروط والأحكام' : 'Processing terms and conditions'
    },
    {
      icon: CheckCircle,
      color: '#10b981',
      title: isRTL ? 'إنشاء الوثيقة' : 'Generating Document',
      desc: isRTL ? 'إنشاء الوثيقة النهائية' : 'Creating final document'
    },
    {
      icon: Download,
      color: '#059669',
      title: isRTL ? 'إعداد التحميل' : 'Preparing Download',
      desc: isRTL ? 'إعداد الملف للتحميل' : 'Preparing file for download'
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

      rotateAnimation.start();
      pulseAnimation.start();

      // Step progression
      let stepTimer: NodeJS.Timeout;
      const runSteps = () => {
        let currentStep = 1;
        stepTimer = setInterval(() => {
          setAnimationStep(currentStep);
          currentStep = currentStep >= steps.length ? 1 : currentStep + 1;
        }, 3000);
      };

      runSteps();

      return () => {
        rotateAnimation.stop();
        pulseAnimation.stop();
        if (stepTimer) clearInterval(stepTimer);
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

  const currentStep = steps[Math.min(animationStep - 1, steps.length - 1)];
  const StepIcon = currentStep.icon;

  if (!isVisible) return null;

  const styles = getStyles(isDark, isRTL);

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          {/* Main Icon */}
          <View style={styles.iconWrapper}>
            <Animated.View 
              style={[
                styles.iconContainer,
                { 
                  backgroundColor: `${currentStep.color}20`,
                  borderColor: `${currentStep.color}40`,
                  transform: [{ rotate: spin }]
                }
              ]}
            >
              <StepIcon size={40} color={currentStep.color} />
            </Animated.View>

            {/* Pulse rings */}
            <Animated.View style={[
              styles.pulseRing,
              {
                borderColor: currentStep.color,
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0.5, 0],
                  extrapolate: 'clamp',
                })
              }
            ]} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: currentStep.color }]}>
            {type === 'modified' 
              ? (isRTL ? 'إنشاء العقد المُعدَّل' : 'Generating Modified Contract')
              : (isRTL ? 'إنشاء العقد المُراجَع' : 'Generating Marked Contract')
            }
          </Text>

          {/* Current Step */}
          <Text style={[styles.stepTitle, { color: currentStep.color }]}>
            {currentStep.title}
          </Text>
          
          <Text style={styles.stepDesc}>
            {currentStep.desc}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.max(progress, (animationStep / steps.length) * 100)}%`,
                    backgroundColor: currentStep.color,
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: currentStep.color }]}>
              {Math.round(Math.max(progress, (animationStep / steps.length) * 100))}%
            </Text>
          </View>

          {/* Live Indicator */}
          <View style={styles.liveContainer}>
            <Animated.View style={[
              styles.liveDot, 
              { transform: [{ scale: pulseAnim }] }
            ]} />
            <Text style={styles.liveText}>
              {isRTL ? 'مباشر' : 'LIVE'}
            </Text>
            <Zap size={12} color="#ffffff" />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    padding: 20,
  },
  container: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    minHeight: 350,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 30,
    borderWidth: 2,
    borderColor: isDark ? '#374151' : '#e5e7eb',
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  pulseRing: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 60,
    borderWidth: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  stepDesc: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  liveContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ef4444',
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
});

export default ContractGenerationModal;
