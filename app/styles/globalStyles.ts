import { StyleSheet, Platform } from 'react-native';

export const createGlobalStyles = (isDark: boolean, isRTL: boolean) => {
  return StyleSheet.create({
    safeTopSpace: {
      height: Platform.OS === 'ios' ? 20 : 10,
      width: '100%',
    },
    safeAreaContainer: {
      flex: 1,
      paddingTop: Platform.OS === 'ios' ? 44 : 30,
    },
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
    },

    // RTL-aware text styles
    text: {
      color: isDark ? '#f9fafb' : '#111827',
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },

    arabicText: {
      direction: 'rtl',
      textAlign: 'right',
      writingDirection: 'rtl',
      fontFamily: Platform.select({
        ios: 'Arial',
        android: 'sans-serif',
        web: 'Arial, Tahoma, sans-serif',
      }),
    },

    englishText: {
      direction: 'ltr',
      textAlign: 'left',
      writingDirection: 'ltr',
    },

    // Card styles with proper shadows
    card: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderRadius: 12,
      padding: 16,
      marginVertical: 8,
      ...Platform.select({
        web: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        },
      }),
    },

    // Elevated card
    cardElevated: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderRadius: 12,
      padding: 20,
      margin: 16,
      ...Platform.select({
        web: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 8,
        },
      }),
    },

    // Button styles
    button: {
      backgroundColor: '#3b82f6',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        web: {
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        },
      }),
    },

    buttonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },

    // Input styles
    input: {
      backgroundColor: isDark ? '#374151' : '#f9fafb',
      borderColor: isDark ? '#4b5563' : '#d1d5db',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: isDark ? '#f9fafb' : '#111827',
      textAlign: isRTL ? 'right' : 'left',
      writingDirection: isRTL ? 'rtl' : 'ltr',
    },

    // Layout helpers
    flexRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
    },

    flexRowReverse: {
      flexDirection: isRTL ? 'row' : 'row-reverse',
    },

    // Spacing
    marginHorizontal: {
      marginHorizontal: 16,
    },

    marginVertical: {
      marginVertical: 16,
    },

    padding: {
      padding: 16,
    },

    // Status bar safe area
    safeArea: {
      flex: 1,
      backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
    },

    // Header styles
    header: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#374151' : '#e5e7eb',
      paddingVertical: 16,
      paddingHorizontal: 20,
    },

    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#f9fafb' : '#111827',
      textAlign: isRTL ? 'right' : 'left',
    },

    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    modalContent: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderRadius: 12,
      padding: 20,
      margin: 20,
      maxWidth: 400,
      width: '90%',
      ...Platform.select({
        web: {
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 20,
        },
      }),
    },

    // Loading styles
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
    },

    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
    },

    // Error styles
    errorContainer: {
      backgroundColor: isDark ? '#7f1d1d' : '#fef2f2',
      borderColor: '#ef4444',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      margin: 16,
    },

    errorText: {
      color: isDark ? '#fca5a5' : '#dc2626',
      fontSize: 14,
      textAlign: isRTL ? 'right' : 'left',
    },

    // Success styles
    successContainer: {
      backgroundColor: isDark ? '#064e3b' : '#f0fdf4',
      borderColor: '#10b981',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      margin: 16,
    },

    successText: {
      color: isDark ? '#6ee7b7' : '#059669',
      fontSize: 14,
      textAlign: isRTL ? 'right' : 'left',
    },

    // Utility classes
    center: {
      justifyContent: 'center',
      alignItems: 'center',
    },

    centerText: {
      textAlign: 'center',
    },

    bold: {
      fontWeight: 'bold',
    },

    semiBold: {
      fontWeight: '600',
    },

    italic: {
      fontStyle: 'italic',
    },

    uppercase: {
      textTransform: 'uppercase',
    },
  });
};

export const globalColors = {
  primary: '#3b82f6',
  secondary: '#6b7280',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#06b6d4',
};

export const globalSizes = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export default createGlobalStyles;