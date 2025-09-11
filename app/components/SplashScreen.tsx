
import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions, Text, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

interface LoadingDotProps {
  delay: number;
}

const LoadingDot: React.FC<LoadingDotProps> = ({ delay }) => {
  const dotAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(dotAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      ).start();
    };

    const timer = setTimeout(startAnimation, delay);
    return () => clearTimeout(timer);
  }, [dotAnim, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          opacity: dotAnim,
          transform: [{ scale: dotAnim }],
        },
      ]}
    />
  );
};

export const CustomSplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.1)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Keep the native splash screen visible while we prepare the custom one
    SplashScreen.preventAutoHideAsync();

    // Start the animation sequence immediately with faster initial display
    const animationSequence = Animated.sequence([
      // First: Logo appears with scale animation only
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Then: Text slides up
      Animated.parallel([
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideUpAnim, {
          toValue: 0,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]);

    // Continuous pulse animation for logo
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
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

    // Continuous glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Start animations immediately
    animationSequence.start();
    
    // Start continuous animations after shorter delay
    setTimeout(() => {
      pulseAnimation.start();
      glowAnimation.start();
    }, 800);

    // Hide splash screen after optimized duration for immediate app opening
    const timer = setTimeout(async () => {
      await SplashScreen.hideAsync();
      onFinish();
    }, 1800); // Reduced from 2500ms to 1800ms for faster loading

    return () => {
      clearTimeout(timer);
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [fadeAnim, scaleAnim, textFadeAnim, glowAnim, pulseAnim, slideUpAnim, onFinish]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.8],
  });

  return (
    <View style={styles.container}>
      {/* Enhanced background with gradient simulation */}
      <View style={styles.backgroundGradient} />
      
      {/* Multiple glow layers for depth */}
      <Animated.View
        style={[
          styles.glowEffect,
          {
            opacity: glowOpacity,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
      
      <Animated.View
        style={[
          styles.glowEffect2,
          {
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.1, 0.4],
            }),
            transform: [{ scale: scaleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1.3],
            }) }],
          },
        ]}
      />
      
      {/* Main logo container with native-only styling */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
            ],
          },
        ]}
      >
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logo}
            tintColor="#0f766e"
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Enhanced app name with slide up animation */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textFadeAnim,
            transform: [{ translateY: slideUpAnim }],
          },
        ]}
      >
        <Text style={styles.appName}>Shar'AI</Text>
        <Text style={styles.tagline}>AI for Shariah</Text>
        <Text style={styles.subtitle}>Intelligent Islamic Finance Analysis</Text>
      </Animated.View>

      {/* Enhanced loading indicator dots */}
      <Animated.View
        style={[
          styles.loadingDots,
          {
            opacity: textFadeAnim,
            transform: [{ translateY: slideUpAnim }],
          },
        ]}
      >
        <LoadingDot delay={0} />
        <LoadingDot delay={300} />
        <LoadingDot delay={600} />
      </Animated.View>

      {/* Simple progress indicator */}
      <Animated.View
        style={[
          styles.progressContainer,
          {
            opacity: textFadeAnim,
          },
        ]}
      >
        <View style={styles.progressBar} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f0f0f',
  },
  glowEffect: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: '#10b981',
    opacity: 0.2,
  },
  glowEffect2: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: '#059669',
    opacity: 0.1,
  },
  
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  logoWrapper: {
    width: width * 0.6,
    height: width * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 25,
  },
  logo: {
    width: '75%',
    height: '75%',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(16, 185, 129, 0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  tagline: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10b981',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(16, 185, 129, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6ee7b7',
    letterSpacing: 1,
    textAlign: 'center',
    opacity: 0.9,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  progressContainer: {
    position: 'absolute',
    bottom: height * 0.12,
    left: width * 0.2,
    right: width * 0.2,
    height: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: '100%',
    backgroundColor: '#10b981',
    borderRadius: 1.5,
  },
});
