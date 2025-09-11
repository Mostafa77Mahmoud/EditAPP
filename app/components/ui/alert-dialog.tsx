// app/components/ui/alert-dialog.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface AlertDialogProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  description: string;
  actions: { text: string; onPress: () => void; style?: 'default' | 'destructive' }[];
}

export const AlertDialog: React.FC<AlertDialogProps> = ({ isVisible, onClose, title, description, actions }) => {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const isDark = theme === 'dark';

  const styles = getStyles(isDark, isRTL);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  action.style === 'destructive' ? styles.destructiveButton : styles.defaultButton,
                ]}
                onPress={() => {
                  action.onPress();
                  onClose();
                }}
              >
                <Text style={[
                  styles.buttonText,
                  action.style === 'destructive' ? styles.destructiveButtonText : styles.defaultButtonText,
                ]}>
                  {action.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (isDark: boolean, isRTL: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: isRTL ? 'flex-end' : 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#111827',
    marginBottom: 8,
    textAlign: isRTL ? 'right' : 'left',
  },
  description: {
    fontSize: 14,
    color: isDark ? '#d1d5db' : '#6b7280',
    marginBottom: 24,
    lineHeight: 20,
    textAlign: isRTL ? 'right' : 'left',
  },
  actionsContainer: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'flex-end',
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  defaultButton: {
    backgroundColor: isDark ? '#374151' : '#f3f4f6',
  },
  destructiveButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  defaultButtonText: {
    color: isDark ? '#f9fafb' : '#111827',
  },
  destructiveButtonText: {
    color: '#ffffff',
  },
});
export default AlertDialog;
// This component provides a customizable alert dialog with title, description, and multiple action buttons.