// app/components/ui/checkbox.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface CheckboxProps {
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Checkbox: React.FC<CheckboxProps> = ({ value, onValueChange, disabled, style }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);

  return (
    <TouchableOpacity
      style={[styles.container, value && styles.checkedContainer, disabled && styles.disabled, style]}
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {value && <Check color="#ffffff" size={16} strokeWidth={3} />}
    </TouchableOpacity>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: isDark ? '#6b7280' : '#9ca3af',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedContainer: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  disabled: {
    opacity: 0.5,
  },
});
export default Checkbox;
// This component provides a customizable checkbox with checked and unchecked states, suitable for forms or settings.