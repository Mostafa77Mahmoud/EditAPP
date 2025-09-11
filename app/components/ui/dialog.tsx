// app/components/ui/dialog.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { X } from 'lucide-react-native';

interface DialogProps {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  return <View style={styles.header}>{children}</View>;
};

export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  return <Text style={styles.title}>{children}</Text>;
};

export const DialogDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  return <Text style={styles.description}>{children}</Text>;
};

export const DialogContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <View>{children}</View>;
};

export const DialogFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);
  return <View style={styles.footer}>{children}</View>;
};

export const Dialog: React.FC<DialogProps> = ({ isVisible, onClose, children, style }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = getStyles(isDark);

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.container, style]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
          </TouchableOpacity>
          {children}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    borderRadius: 16,
    padding: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#f9fafb' : '#111827',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: isDark ? '#d1d5db' : '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
export default Dialog;
// This component provides a customizable dialog with header, title, description, content, and footer sections