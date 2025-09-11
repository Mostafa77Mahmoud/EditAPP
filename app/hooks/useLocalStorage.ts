
import { useState, useEffect } from 'react';
import { storage } from '../utils/storage';

export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T) => Promise<void>, boolean] => {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStoredValue = async () => {
      try {
        const item = await storage.getItemAsync(key);
        if (item !== null) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.error(`Error loading stored value for key "${key}":`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredValue();
  }, [key]);

  const setValue = async (value: T) => {
    try {
      setStoredValue(value);
      await storage.setItemAsync(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error storing value for key "${key}":`, error);
    }
  };

  return [storedValue, setValue, isLoading];
};
