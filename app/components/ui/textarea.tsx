// app/components/ui/textarea.tsx
import React from 'react';
import {
  TextInput,
  StyleSheet,
  TextInputProps,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface TextareaProps extends TextInputProps {
  style?: StyleProp<TextStyle>;
}

export const Textarea: React.FC<TextareaProps> = ({ style, ...props }) => {
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const isDark = theme === 'dark';

  const styles = getStyles(isDark, isRTL);

  return (
    <TextInput
      style={[styles.textarea, style]}
      placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
      multiline
      textAlignVertical="top"
      {...props}
    />
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) =>
  StyleSheet.create({
    textarea: {
      minHeight: 100,
      borderWidth: 1,
      borderColor: isDark ? '#4b5563' : '#d1d5db',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      color: isDark ? '#f9fafb' : '#111827',
      textAlign: isRTL ? 'right' : 'left',
    },
  });

export default Textarea;
