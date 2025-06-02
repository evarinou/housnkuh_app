import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface StoreSettings {
  enabled: boolean;
  openingDate: Date | null;
  isStoreOpen: boolean;
}

interface StoreSettingsContextType {
  settings: StoreSettings | null;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

export const useStoreSettings = () => {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
};

interface StoreSettingsProviderProps {
  children: ReactNode;
}

export const StoreSettingsProvider: React.FC<StoreSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const response = await axios.get(`${apiUrl}/public/store-opening`);
      
      if (response.data.success) {
        const data = response.data.storeOpening;
        setSettings({
          enabled: data.enabled,
          openingDate: data.openingDate ? new Date(data.openingDate) : null,
          isStoreOpen: data.isStoreOpen
        });
      }
    } catch (err) {
      console.error('Error fetching store settings:', err);
      setError('Failed to load store settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const value = {
    settings,
    loading,
    error,
    refreshSettings: fetchSettings
  };

  return (
    <StoreSettingsContext.Provider value={value}>
      {children}
    </StoreSettingsContext.Provider>
  );
};