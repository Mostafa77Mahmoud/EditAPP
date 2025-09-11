import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Modal } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { MessageSquare, Brain, Sparkles, Search, Zap } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface QuestionAnimationProps {
  isVisible: boolean;
}

const QuestionAnimation: React.FC<QuestionAnimationProps> = ({ isVisible }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const isDark = theme === 'dark';

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
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      const bounceAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      rotateAnimation.start();
      pulseAnimation.start();
      bounceAnimation.start();

      return () => {
        rotateAnimation.stop();
        pulseAnimation.stop();
        bounceAnimation.stop();
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
  }, [isVisible, fadeAnim, scaleAnim, slideAnim, rotateAnim, pulseAnim, bounceAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!isVisible) return null;

  const styles = getStyles(isDark);

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
    >
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
          {/* Main Brain Icon with Enhanced Animation */}
          <Animated.View 
            style={[
              styles.iconContainer,
              { 
                transform: [
                  { rotate: spin },
                  { scale: pulseAnim },
                  { translateY: bounceAnim }
                ]
              }
            ]}
          >
            <Brain size={36} color="#10b981" />

            {/* Orbiting thinking dots */}
            <Animated.View style={[styles.orbitingIcon, { transform: [{ rotate: spin }] }]}>
              <MessageSquare size={16} color="#8b5cf6" />
            </Animated.View>
            <Animated.View style={[styles.orbitingIcon2, { transform: [{ rotate: spin }] }]}>
              <Search size={14} color="#3b82f6" />
            </Animated.View>
            <Animated.View style={[styles.orbitingIcon3, { transform: [{ rotate: spin }] }]}>
              <Sparkles size={12} color="#f59e0b" />
            </Animated.View>
          </Animated.View>

          {/* Thinking dots animation */}
          <View style={styles.thinkingDots}>
            <Animated.View style={[styles.dot, { transform: [{ scale: pulseAnim }] }]} />
            <Animated.View 
              style={[
                styles.dot, 
                { 
                  transform: [{ 
                    scale: pulseAnim.interpolate({
                      inputRange: [1, 1.3],
                      outputRange: [1.2, 1],
                    })
                  }] 
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.dot, 
                { 
                  transform: [{ 
                    scale: pulseAnim.interpolate({
                      inputRange: [1, 1.3],
                      outputRange: [1.4, 1.1],
                    })
                  }] 
                }
              ]} 
            />
          </View>

          <Animated.Text 
            style={[
              styles.title,
              {
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {t('questionAnimation.thinking') || 'AI is thinking...'}
          </Animated.Text>

          <Text style={styles.subtitle}>
            {t('questionAnimation.processing') || 'Processing your request'}
          </Text>

          <Text style={styles.patience}>
            {t('questionAnimation.patience') || 'Please wait while we analyze your question'}
          </Text>

          {/* Processing stages indicator */}
          <View style={styles.stagesContainer}>
            <Animated.View style={[styles.stage, { transform: [{ scale: pulseAnim }] }]}>
              <Search size={16} color="#3b82f6" />
              <Text style={styles.stageText}>{t('questionAnimation.analyzing') || 'Analyzing'}</Text>
            </Animated.View>
            <Animated.View 
              style={[
                styles.stage, 
                { 
                  transform: [{ 
                    scale: pulseAnim.interpolate({
                      inputRange: [1, 1.3],
                      outputRange: [1.1, 1],
                    })
                  }] 
                }
              ]}
            >
              <Brain size={16} color="#10b981" />
              <Text style={styles.stageText}>{t('questionAnimation.formulating') || 'Formulating'}</Text>
            </Animated.View>
          </View>

          {/* Energy indicator */}
          <Animated.View 
            style={[
              styles.energyIndicator,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <Zap size={12} color="#ffffff" />
            <Text style={styles.energyText}>AI Active</Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 24,
    padding: 32,
    width: screenWidth * 0.9,
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
    borderWidth: 1,
    borderColor: isDark ? '#374151' : '#e5e7eb',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    position: 'relative',
  },
  orbitingIcon: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  orbitingIcon2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  orbitingIcon3: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  patience: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  stagesContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  stage: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  stageText: {
    fontSize: 10,
    color: isDark ? '#d1d5db' : '#6b7280',
    fontWeight: '500',
  },
  energyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  energyText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default QuestionAnimation;