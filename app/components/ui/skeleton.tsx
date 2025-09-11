// app/components/ui/skeleton.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface SkeletonProps {
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({ style }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return <Animated.View style={[styles.skeleton, { opacity }, style]} />;
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  skeleton: {
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
    borderRadius: 8,
  },
});
export default Skeleton;
// This component provides a customizable skeleton loader with a pulsing animation, suitable for loading states in