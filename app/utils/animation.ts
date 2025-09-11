import { Platform } from 'react-native';

export const getAnimationConfig = (useNativeDriver: boolean = true) => ({
  useNativeDriver: Platform.OS !== 'web' ? useNativeDriver : false,
  duration: 300,
});

export const fadeInConfig = {
  useNativeDriver: Platform.OS !== 'web',
  duration: 300,
};

export const slideConfig = {
  useNativeDriver: Platform.OS !== 'web',
  duration: 250,
};

export const scaleConfig = {
  useNativeDriver: Platform.OS !== 'web',
  duration: 200,
};

// Safe animation wrapper for all Animated components
export const safeAnimationConfig = (config: any) => ({
  ...config,
  useNativeDriver: Platform.OS !== 'web' && config.useNativeDriver !== false,
});

// Pre-configured safe configs
export const SAFE_FADE_CONFIG = safeAnimationConfig(fadeInConfig);
export const SAFE_SLIDE_CONFIG = safeAnimationConfig(slideConfig);
export const SAFE_SCALE_CONFIG = safeAnimationConfig(scaleConfig);