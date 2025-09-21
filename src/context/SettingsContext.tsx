import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { apiService } from '../services/api';

interface SecuritySettings {
  minPasswordLength: boolean;
  requireSpecialChars: boolean;
  passwordExpiration: boolean;
  autoLogout: boolean;
  rememberLogin: boolean;
}

interface NotificationSettings {
  lowStockAlerts: boolean;
  dailySalesReport: boolean;
  newUserRegistrations: boolean;
  browserNotifications: boolean;
  soundNotifications: boolean;
}

interface SettingsContextType {
  securitySettings: SecuritySettings;
  notificationSettings: NotificationSettings;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  saveSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

const defaultSecuritySettings: SecuritySettings = {
  minPasswordLength: true,
  requireSpecialChars: true,
  passwordExpiration: false,
  autoLogout: true,
  rememberLogin: true,
};

const defaultNotificationSettings: NotificationSettings = {
  lowStockAlerts: true,
  dailySalesReport: true,
  newUserRegistrations: false,
  browserNotifications: true,
  soundNotifications: false,
};

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(defaultSecuritySettings);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from backend on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (apiService.isAuthenticated()) {
          // Load from backend if authenticated
          const [securityData, notificationData] = await Promise.all([
            apiService.getSecuritySettings().catch(() => defaultSecuritySettings),
            apiService.getNotificationSettings().catch(() => defaultNotificationSettings)
          ]);
          
          setSecuritySettings(securityData);
          setNotificationSettings(notificationData);
        } else {
          // Fallback to localStorage if not authenticated
          const savedSecurity = localStorage.getItem('securitySettings');
          const savedNotifications = localStorage.getItem('notificationSettings');

          if (savedSecurity) {
            setSecuritySettings({ ...defaultSecuritySettings, ...JSON.parse(savedSecurity) });
          }

          if (savedNotifications) {
            setNotificationSettings({ ...defaultNotificationSettings, ...JSON.parse(savedNotifications) });
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        // Fallback to localStorage on error
        const savedSecurity = localStorage.getItem('securitySettings');
        const savedNotifications = localStorage.getItem('notificationSettings');

        if (savedSecurity) {
          setSecuritySettings({ ...defaultSecuritySettings, ...JSON.parse(savedSecurity) });
        }

        if (savedNotifications) {
          setNotificationSettings({ ...defaultNotificationSettings, ...JSON.parse(savedNotifications) });
        }
      }
    };

    loadSettings();
  }, []);

  const updateSecuritySettings = (settings: Partial<SecuritySettings>) => {
    const newSettings = { ...securitySettings, ...settings };
    setSecuritySettings(newSettings);
    localStorage.setItem('securitySettings', JSON.stringify(newSettings));
    
    // No immediate toast - only show when user clicks save
  };

  const updateNotificationSettings = (settings: Partial<NotificationSettings>) => {
    const newSettings = { ...notificationSettings, ...settings };
    setNotificationSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
    
    // No immediate toast - only show when user clicks save
  };

  const saveSettings = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Save to localStorage first
      localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
      localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
      
      // Save to backend if authenticated
      if (apiService.isAuthenticated()) {
        await Promise.all([
          apiService.updateSecuritySettings(securitySettings),
          apiService.updateNotificationSettings(notificationSettings)
        ]);
      }
      
      // Show success toast
      toast.success('Settings saved!', {
        duration: 2000,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      
      // Show error toast
      toast.error('Failed to save settings', {
        duration: 3000,
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        securitySettings,
        notificationSettings,
        updateSecuritySettings,
        updateNotificationSettings,
        saveSettings,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
