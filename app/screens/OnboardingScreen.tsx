import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Camera, FileText, ShieldCheck, Users, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const isDark = theme === 'dark';

  const steps = [
    {
      icon: <FileText size={80} color="#1E8E3E" />,
      title: t('onboarding.step1.title'),
      description: t('onboarding.step1.desc'),
      color: '#1E8E3E',
      features: [
        t('onboarding.step1.feature1'),
        t('onboarding.step1.feature2'),
        t('onboarding.step1.feature3')
      ]
    },
    {
      icon: <Camera size={80} color="#22c55e" />,
      title: t('onboarding.step2.title'),
      description: t('onboarding.step2.desc'),
      color: '#22c55e',
      features: [
        t('onboarding.step2.feature1'),
        t('onboarding.step2.feature2'),
        t('onboarding.step2.feature3')
      ]
    },
    {
      icon: <ShieldCheck size={80} color="#16a34a" />,
      title: t('onboarding.step3.title'),
      description: t('onboarding.step3.desc'),
      color: '#16a34a',
      features: [
        t('onboarding.step3.feature1'),
        t('onboarding.step3.feature2'),
        t('onboarding.step3.feature3')
      ]
    },
    {
      icon: <Users size={80} color="#15803d" />,
      title: t('onboarding.step4.title'),
      description: t('onboarding.step4.desc'),
      color: '#15803d',
      features: [
        t('onboarding.step4.feature1'),
        t('onboarding.step4.feature2'),
        t('onboarding.step4.feature3')
      ]
    },
  ];

  useEffect(() => {
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
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 50, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setCurrentStep(currentStep + 1);
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
        scaleAnim.setValue(0.8);
      });
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -50, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setCurrentStep(currentStep - 1);
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
        scaleAnim.setValue(0.8);
      });
    }
  };

  const styles = getStyles(isDark, isRTL);
  const currentStepData = steps[currentStep];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onComplete} style={styles.skipButton}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}>
          <View style={[styles.iconContainer, { backgroundColor: `${currentStepData.color}15` }]}>
            {currentStepData.icon}
          </View>

          <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>
            {currentStepData.title}
          </Text>
          <Text style={[styles.description, { textAlign: isRTL ? 'right' : 'left' }]}>
            {currentStepData.description}
          </Text>

          <View style={styles.featuresContainer}>
            {currentStepData.features.map((feature, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.featureItem,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateX: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [isRTL ? 30 : -30, 0],
                      })
                    }]
                  }
                ]}
              >
                <CheckCircle size={20} color={currentStepData.color} />
                <Text style={styles.featureText}>{feature}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {steps.map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                currentStep === index && [styles.activeDot, { backgroundColor: currentStepData.color }],
                {
                  transform: [{
                    scale: currentStep === index ? 1.2 : 1
                  }]
                }
              ]}
            />
          ))}
        </View>

        <View style={[styles.navigationButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {currentStep > 0 && (
            <TouchableOpacity onPress={handlePrevious} style={[styles.navButton, styles.previousButton]}>
              {isRTL ? <ArrowRight size={20} color={isDark ? '#fff' : '#16a34a'} /> : <ArrowLeft size={20} color={isDark ? '#fff' : '#16a34a'} />}
              <Text style={styles.navButtonText}>{t('onboarding.previous')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleNext}
            style={[styles.navButton, styles.nextButton, { backgroundColor: currentStepData.color }]}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === steps.length - 1 ? t('onboarding.done') : t('onboarding.next')}
            </Text>
            {isRTL ? <ArrowLeft size={20} color="#fff" /> : <ArrowRight size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
    // SafeAreaView handles padding automatically
  },
  header: {
    alignItems: isRTL ? 'flex-start' : 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: isDark ? '#9ca3af' : '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  iconContainer: {
    padding: 30,
    borderRadius: 40,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  description: {
    fontSize: 16,
    color: isDark ? '#d1d5db' : '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  featuresContainer: {
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: isDark ? '#1f2937' : '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: isDark ? '#e5e7eb' : '#374151',
    fontWeight: '500',
    textAlign: isRTL ? 'right' : 'left',
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 20,
  },
  pagination: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: isDark ? '#374151' : '#d1d5db',
  },
  activeDot: {
    width: 24,
    height: 10,
    borderRadius: 5,
  },
  navigationButtons: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  navButton: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  previousButton: {
    backgroundColor: isDark ? '#374151' : '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  nextButton: {
    flex: 1,
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#f9fafb' : '#16a34a',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default OnboardingScreen;