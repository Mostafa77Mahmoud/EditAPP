import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useColorScheme, Platform } from 'react-native';
import { storage, storageKeys } from '../utils/storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        console.log('🎨 Loading stored theme preference...');
        
        // Use system theme as default value
        const defaultTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
        const storedTheme = await storage.getItemAsync(storageKeys.THEME) || defaultTheme;
        
        console.log('🎨 Retrieved theme data:', { 
          stored: storedTheme, 
          system: systemColorScheme,
          default: defaultTheme 
        });

        if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
          setThemeState(storedTheme as Theme);
          console.log('✅ Successfully loaded stored theme:', storedTheme);
        } else {
          console.log('🎨 Using default theme:', defaultTheme);
          setThemeState(defaultTheme);
        }
      } catch (error) {
        console.warn('❌ Failed to load theme from storage:', error);
        // Fallback to system theme or light
        const defaultTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
        setThemeState(defaultTheme);
        console.log('🔄 Using fallback theme due to error:', defaultTheme);
      }
    };

    loadTheme();
  }, [systemColorScheme]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      await storage.setItemAsync(storageKeys.THEME, newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    await setTheme(newTheme);
  }, [theme, setTheme]);

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeProvider;