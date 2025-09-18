import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
// import { apiService } from '../services/api';

interface Store {
  _id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  owner_id: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface StoreContextType {
  currentStore: Store | null;
  stores: Store[];
  isLoading: boolean;
  error: string | null;
  switchStore: (storeId: string) => void;
  refreshStores: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStores = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // In a real app, you would have a stores API endpoint
      // For now, we'll create a mock store based on the user's store_id
      if (user.store_id) {
        const mockStore: Store = {
          _id: user.store_id,
          name: 'Greep Market',
          address: '123 Market Street, Istanbul, Turkey',
          phone: '+90 555 123 4567',
          email: 'info@greepmarket.com',
          owner_id: user.id,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        };
        setStores([mockStore]);
        setCurrentStore(mockStore);
      }
    } catch (error) {
      console.error('Failed to load stores:', error);
      setError('Failed to load store information');
    } finally {
      setIsLoading(false);
    }
  };

  const switchStore = (storeId: string) => {
    const store = stores.find(s => s._id === storeId);
    if (store) {
      setCurrentStore(store);
      // In a real app, you would update the user's current store context
      localStorage.setItem('current_store_id', storeId);
    }
  };


  const refreshStores = async () => {
    await loadStores();
  };

  useEffect(() => {
    if (user) {
      loadStores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const value: StoreContextType = {
    currentStore,
    stores,
    isLoading,
    error,
    switchStore,
    refreshStores,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
