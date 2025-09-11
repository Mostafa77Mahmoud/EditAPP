import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { storage, storageKeys } from '../utils/storage';
import { authApi, LoginCredentials, SignupCredentials, User } from '../services/api';

// ✅ النوع بعد التعديل
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isGuestMode: boolean; // ✅ تمت الإضافة هنا
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        console.log('🔐 Loading stored authentication data...');
        
        // Use default values to prevent crashes
        const storedToken = await storage.getItemAsync(storageKeys.AUTH_TOKEN);
        const storedUser = await storage.getItemAsync(storageKeys.USER_DATA);

        console.log('🔐 Retrieved auth data:', { 
          hasToken: !!storedToken, 
          hasUser: !!storedUser 
        });

        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            console.log('✅ Successfully loaded stored auth for user:', parsedUser.email || parsedUser.id);
          } catch (parseError) {
            console.error('❌ Failed to parse stored user data:', parseError);
            // Clear corrupted data
            await storage.deleteItemAsync(storageKeys.AUTH_TOKEN);
            await storage.deleteItemAsync(storageKeys.USER_DATA);
          }
        } else {
          console.log('🔐 No stored authentication found');
        }
      } catch (error) {
        console.error('❌ Failed to load stored auth:', error);
        // Don't crash the app, just continue without stored auth
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const response = await authApi.login(credentials);

      await storage.setItemAsync(storageKeys.AUTH_TOKEN, response.token);
      await storage.setItemAsync(storageKeys.USER_DATA, JSON.stringify(response.user));

      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert('Login Failed', 'Please check your credentials and try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    try {
      setIsLoading(true);
      const response = await authApi.signup(credentials);

      await storage.setItemAsync(storageKeys.AUTH_TOKEN, response.token);
      await storage.setItemAsync(storageKeys.USER_DATA, JSON.stringify(response.user));

      setUser(response.user);
    } catch (error) {
      console.error('Signup failed:', error);
      Alert.alert('Signup Failed', 'Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await storage.deleteItemAsync(storageKeys.AUTH_TOKEN);
      await storage.deleteItemAsync(storageKeys.USER_DATA);
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const storedToken = await storage.getItemAsync(storageKeys.AUTH_TOKEN);
      if (storedToken) {
        const response = await authApi.getProfile();
        await storage.setItemAsync(storageKeys.USER_DATA, JSON.stringify(response));
        setUser(response);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      await logout();
    }
  };

  // ✅ متغير isGuestMode الجديد
  const isGuestMode = user === null;

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      signup,
      logout,
      refreshUser,
      isGuestMode // ✅ تم تمريره هنا
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
