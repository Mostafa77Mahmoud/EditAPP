import React from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface ProgressProps {
  value: number;
  style?: ViewStyle;
  indicatorStyle?: ViewStyle;
}

export const Progress: React.FC<ProgressProps> = ({ value, style, indicatorStyle }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value || 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const width = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.indicator, indicatorStyle, { width }]} />
    </View>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    height: 8,
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  indicator: {
    height: '100%',
    backgroundColor: '#10b981',
  },
});
export default Progress;  