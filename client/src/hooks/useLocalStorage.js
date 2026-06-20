import { useState } from 'react';

/**
 * Custom hook to manage states stored in local storage
 * @param {string} key Local storage entry key
 * @param {any} initialValue Fallback default if key is vacant
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading key "${key}" from localStorage:`, error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error saving key "${key}" to localStorage:`, error);
    }
  };

  return [storedValue, setValue];
}
