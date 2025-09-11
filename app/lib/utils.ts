
import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Color utilities for consistent theming
export const colors = {
  shariah: {
    green: '#10b981',
    lightGreen: '#d1fae5',
    orange: '#f59e0b',
    red: '#ef4444',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

// Responsive utilities
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

// RTL utilities
export const getFlexDirection = (dir: 'ltr' | 'rtl', reverse = false) => {
  const isRtl = dir === 'rtl';
  if (reverse) {
    return isRtl ? 'row' : 'row-reverse';
  }
  return isRtl ? 'row-reverse' : 'row';
};

export const getTextAlign = (dir: 'ltr' | 'rtl', center = false) => {
  if (center) return 'center';
  return dir === 'rtl' ? 'right' : 'left';
};

export const getMargin = (dir: 'ltr' | 'rtl', left: number, right: number) => {
  return dir === 'rtl' 
    ? { marginLeft: right, marginRight: left }
    : { marginLeft: left, marginRight: right };
};
export default {
  colors,
  spacing,
  getFlexDirection,
  getTextAlign,
  getMargin,
};