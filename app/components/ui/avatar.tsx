// app/components/ui/avatar.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle, TextStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface AvatarProps {
  style?: ViewStyle;
  children: React.ReactNode;
}
interface AvatarImageProps {
  src: string;
  style?: ImageStyle;
}
interface AvatarFallbackProps {
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Avatar: React.FC<AvatarProps> = ({ style, children }) => {
  return <View style={[styles.avatar, style]}>{children}</View>;
};

export const AvatarImage: React.FC<AvatarImageProps> = ({ src, style }) => {
  return <Image source={{ uri: src }} style={[styles.image, style]} />;
};

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({ children, style, textStyle }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  return (
    <View style={[styles.fallback, style]}>
      <Text style={[styles.fallbackText, textStyle]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  fallbackText: {
    color: '#6b7280',
    fontWeight: '600',
  },
});

const getStyles = (isDark: boolean) => StyleSheet.create({
  fallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? '#374151' : '#e5e7eb',
  },
  fallbackText: {
    color: isDark ? '#d1d5db' : '#6b7280',
    fontWeight: '600',
  },
});
export default Avatar;
// This component provides a customizable avatar with image and fallback text styles, suitable for user profiles or