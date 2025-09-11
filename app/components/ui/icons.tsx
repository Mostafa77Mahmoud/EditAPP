
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  style?: any;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, color, style }) => {
  const { theme } = useTheme();
  const defaultColor = color || (theme === 'dark' ? '#f9fafb' : '#1f2937');
  
  return <Ionicons name={name} size={size} color={defaultColor} style={style} />;
};

export const PrimaryIcon: React.FC<IconProps> = ({ name, size = 24, style }) => (
  <Ionicons name={name} size={size} color="#10b981" style={style} />
);

export const SecondaryIcon: React.FC<IconProps> = ({ name, size = 24, style }) => {
  const { theme } = useTheme();
  const color = theme === 'dark' ? '#9ca3af' : '#6b7280';
  return <Ionicons name={name} size={size} color={color} style={style} />;
};

export const SuccessIcon: React.FC<IconProps> = ({ name, size = 24, style }) => (
  <Ionicons name={name} size={size} color="#22c55e" style={style} />
);

export const ErrorIcon: React.FC<IconProps> = ({ name, size = 24, style }) => (
  <Ionicons name={name} size={size} color="#ef4444" style={style} />
);

export const WarningIcon: React.FC<IconProps> = ({ name, size = 24, style }) => (
  <Ionicons name={name} size={size} color="#f59e0b" style={style} />
);

export default Icon;
