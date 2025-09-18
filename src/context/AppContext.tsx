import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import { AppState, Product, Transaction, InventoryAlert, DashboardMetrics } from '../types';
import { apiService } from '../services/api';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

interface AppContextType extends AppState {
  addProduct: (product: Omit<Product, '_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addTransaction: (transaction: any) => Promise<void>;
  updateInventory: (productId: string, quantity: number) => Promise<void>;
  refreshDashboard: () => Promise<void>;
  loadProducts: () => Promise<void>;
  loadTransactions: () => Promise<void>;
  loadInventoryAlerts: () => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: { id: string; updates: Partial<Product> } }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'SET_INVENTORY_ALERTS'; payload: InventoryAlert[] }
  | { type: 'SET_DASHBOARD_METRICS'; payload: DashboardMetrics };

const initialState: AppState = {
  products: [],
  sales: [],
  inventoryAlerts: [],
  dashboardMetrics: {
    totalSales: 0,
    totalProducts: 0,
    lowStockItems: 0,
    todaySales: 0,
    monthlySales: 0,
    topProducts: [],
    salesByMonth: [],
  },
  isLoading: false,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          p._id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => p._id !== action.payload),
      };
    case 'SET_TRANSACTIONS':
      return { ...state, sales: action.payload };
    case 'ADD_TRANSACTION':
      return { ...state, sales: [...state.sales, action.payload] };
    case 'SET_INVENTORY_ALERTS':
      return { ...state, inventoryAlerts: action.payload };
    case 'SET_DASHBOARD_METRICS':
      return { ...state, dashboardMetrics: action.payload };
    default:
      return state;
  }
}


export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const [isLoadingData, setIsLoadingData] = useState(false);

  const loadInitialData = async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingData) {
      console.log('Data is already loading, skipping duplicate call');
      return;
    }

    try {
      setIsLoadingData(true);
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Load data sequentially to avoid overwhelming the server
      await loadProducts();
      await loadTransactions();
      await loadInventoryAlerts();
      await refreshDashboard();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      setIsLoadingData(false);
    }
  };

  // Load data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const loadProducts = async () => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, skipping products load');
      return;
    }
    try {
      const response = await apiService.getProducts({ 
        store_id: user?.store_id,
        limit: 100 
      });
      dispatch({ type: 'SET_PRODUCTS', payload: response.products });
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadTransactions = async () => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, skipping transactions load');
      return;
    }
    try {
      const response = await apiService.getTransactions({ 
        store_id: user?.store_id,
        limit: 50 
      });
      dispatch({ type: 'SET_TRANSACTIONS', payload: response.transactions });
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load transactions');
    }
  };

  const loadInventoryAlerts = async () => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, skipping inventory alerts load');
      return;
    }
    try {
      const alerts = await apiService.getLowStockItems(user?.store_id);
      dispatch({ type: 'SET_INVENTORY_ALERTS', payload: alerts });
    } catch (error) {
      console.error('Failed to load inventory alerts:', error);
      toast.error('Failed to load inventory alerts');
    }
  };

  const addProduct = async (productData: Omit<Product, '_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newProduct = await apiService.createProduct({
        ...productData,
        store_id: user?.store_id || '',
        created_by: user?.id || '',
      });
      dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
      toast.success('Product added successfully');
    } catch (error) {
      console.error('Failed to add product:', error);
      toast.error('Failed to add product');
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const updatedProduct = await apiService.updateProduct(id, updates);
      dispatch({ type: 'UPDATE_PRODUCT', payload: { id, updates: updatedProduct } });
      toast.success('Product updated successfully');
    } catch (error) {
      console.error('Failed to update product:', error);
      toast.error('Failed to update product');
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await apiService.deleteProduct(id);
      dispatch({ type: 'DELETE_PRODUCT', payload: id });
      // Don't show success toast here as it will be shown in the component
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      
      // Re-throw with more specific error message
      const errorMessage = error?.message || 'Failed to delete product';
      throw new Error(errorMessage);
    }
  };

  const addTransaction = async (transactionData: any) => {
    try {
      const newTransaction = await apiService.createTransaction({
        ...transactionData,
        store_id: user?.store_id || '',
        cashier_id: user?.id || '',
      });
      dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
      toast.success('Transaction completed successfully');
    } catch (error) {
      console.error('Failed to create transaction:', error);
      toast.error('Failed to create transaction');
      throw error;
    }
  };

  const updateInventory = async (productId: string, quantity: number) => {
    try {
      await apiService.adjustInventory(productId, {
        store_id: user?.store_id || '',
        movement_type: 'in',
        quantity,
        reason: 'Manual adjustment',
      });
      await loadProducts(); // Reload products to get updated quantities
      toast.success('Inventory updated successfully');
    } catch (error) {
      console.error('Failed to update inventory:', error);
      toast.error('Failed to update inventory');
      throw error;
    }
  };

  const refreshDashboard = async () => {
    if (!isAuthenticated || !user) {
      console.log('User not authenticated, skipping dashboard refresh');
      return;
    }
    
    try {
      const metrics = await apiService.getDashboardAnalytics(user?.store_id);
      dispatch({ type: 'SET_DASHBOARD_METRICS', payload: metrics });
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
      toast.error('Failed to refresh dashboard');
    }
  };

  const value: AppContextType = {
    ...state,
    addProduct,
    updateProduct,
    deleteProduct,
    addTransaction,
    updateInventory,
    refreshDashboard,
    loadProducts,
    loadTransactions,
    loadInventoryAlerts,
    loading: state.isLoading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}


