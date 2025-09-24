import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Package, 
  AlertTriangle, 
  DollarSign,
  ShoppingCart,
  BarChart3,
  Eye,
  ArrowRight,
  Calendar,
  TrendingDown,
  Activity,
  Filter,
  RefreshCw,
  X
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { app } from '../config/environment';
import { usePageRefresh } from '../hooks/usePageRefresh';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const Dashboard: React.FC = () => {
  const { inventoryAlerts, loading, dashboardMetrics, refreshDashboard, sales } = useApp();
  const { user } = useAuth();
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [filteredSales, setFilteredSales] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'this_month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // For initial load with 'today' filter, completely ignore dashboardMetrics to prevent flashing
  const shouldIgnoreDashboardMetrics = isInitialLoad && dateRange === 'today';
  
  // Enable automatic refresh for dashboard with smart intervals based on filter
  const refreshInterval = useMemo(() => {
    // More frequent refresh for "Today" filter since sales happen in real-time
    if (dateRange === 'today') {
      return 15000; // 15 seconds for today's data
    }
    // Less frequent for monthly/custom data
    return 60000; // 60 seconds for other filters
  }, [dateRange]);



  // Load expenses data
  const loadExpenses = useCallback(async () => {
      if (user?.store_id) {
        try {
          
          // Calculate date range for expenses based on current filter
          const now = new Date();
          let startDate: string;
          let endDate: string;
          
          switch (dateRange) {
            case 'today':
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
              startDate = today.toISOString().split('T')[0];
              endDate = todayEnd.toISOString().split('T')[0];
              break;
            case 'this_month':
              const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
              const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              startDate = monthStart.toISOString().split('T')[0];
              endDate = monthEnd.toISOString().split('T')[0];
              break;
            case 'custom':
              if (customStartDate && customEndDate) {
                startDate = customStartDate;
                endDate = customEndDate;
              } else {
                // Load all expenses if no custom dates
                startDate = '';
                endDate = '';
              }
              break;
            default:
              // Load all expenses
              startDate = '';
              endDate = '';
          }
          
          
          // Try to get filtered expenses first
          let expensesResponse;
          if (startDate && endDate) {
            expensesResponse = await apiService.getExpenses({
              store_id: user.store_id,
              start_date: startDate,
              end_date: endDate,
              limit: 1000
            });
          } else {
            expensesResponse = await apiService.getExpenses({
              store_id: user.store_id,
              limit: 1000
            });
          }
          
          
          // Calculate total from filtered expenses
          const totalAmount = expensesResponse.expenses?.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0) || 0;
          
          setTotalExpenses(totalAmount);
        } catch (error) {
          console.error('Failed to load expense stats:', error);
        // Try to get expenses from the expenses API directly
        try {
          const expenses = await apiService.getExpenses({
            store_id: user.store_id,
            limit: 1000 // Get all expenses
          });
          
          if (expenses && expenses.expenses && Array.isArray(expenses.expenses)) {
            const total = expenses.expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
            setTotalExpenses(total);
          }
        } catch (directError) {
          console.error('Failed to load expenses directly:', directError);
        }
      }
    }
  }, [user?.store_id, dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price);
  };

  // Load filtered sales data from server
  const loadFilteredSales = useCallback(async () => {
    if (!user?.store_id) return;
    
    try {
      const now = new Date();
      let startDate: string;
      let endDate: string;
      
      // Calculate date range based on selection
      switch (dateRange) {
        case 'today':
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          startDate = today.toISOString().split('T')[0];
          endDate = todayEnd.toISOString().split('T')[0];
          break;
        case 'this_month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          startDate = monthStart.toISOString().split('T')[0];
          endDate = monthEnd.toISOString().split('T')[0];
          break;
        case 'custom':
          if (!customStartDate || !customEndDate) {
            // Load all transactions if no custom dates
            const response = await apiService.getTransactions({
              store_id: user.store_id,
              limit: 1000 // Load more transactions for dashboard
            });
            setFilteredSales(response.transactions);
            return;
          }
          startDate = customStartDate;
          endDate = customEndDate;
          break;
        default:
          // Load all transactions
          const response = await apiService.getTransactions({
            store_id: user.store_id,
            limit: 1000
          });
          setFilteredSales(response.transactions);
          return;
      }
      
      // Load filtered transactions from server
      const response = await apiService.getTransactions({
        store_id: user.store_id,
        start_date: startDate,
        end_date: endDate,
        limit: 1000 // Load more transactions for dashboard
      });
      
      setFilteredSales(response.transactions);
    } catch (error) {
      console.error('Failed to load filtered sales:', error);
      setFilteredSales([]);
    }
  }, [user?.store_id, dateRange, customStartDate, customEndDate]);

  // Create a refresh function that uses current filter state
  const refreshWithCurrentFilters = useCallback(async () => {
    setIsRefreshing(true);
    
    try {
      const now = new Date();
      let filterParams: any = {};
      
      switch (dateRange) {
        case 'today':
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          filterParams = {
            dateRange: 'today',
            startDate: today.toISOString().split('T')[0],
            endDate: todayEnd.toISOString().split('T')[0]
          };
          break;
        case 'this_month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          filterParams = {
            dateRange: '30d',
            startDate: monthStart.toISOString().split('T')[0],
            endDate: monthEnd.toISOString().split('T')[0]
          };
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            filterParams = {
              dateRange: 'custom',
              startDate: customStartDate,
              endDate: customEndDate
            };
          }
          break;
        default:
          filterParams = { dateRange: '30d' };
      }

      await Promise.all([
        loadExpenses(),
        refreshDashboard(filterParams),
        loadFilteredSales()
      ]);
      
      // Mark initial load as complete
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [dateRange, customStartDate, customEndDate, loadExpenses, loadFilteredSales, isInitialLoad]); // Removed refreshDashboard from dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Enable automatic refresh for dashboard with smart intervals based on filter
  usePageRefresh({
    refreshOnMount: true,
    refreshOnFocus: true, // Enable refresh on focus for real-time updates
    refreshInterval: refreshInterval,
    refreshOnVisibilityChange: true, // Enable refresh when tab becomes visible
    refreshFunction: refreshWithCurrentFilters, // Use our custom refresh function
    silent: true
  });

  // Manual refresh function with loading state
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Calculate filter parameters based on current date range
      const now = new Date();
      let filterParams: any = {};
      
      switch (dateRange) {
        case 'today':
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          filterParams = {
            dateRange: 'today',
            startDate: today.toISOString().split('T')[0],
            endDate: todayEnd.toISOString().split('T')[0]
          };
          break;
        case 'this_month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          filterParams = {
            dateRange: '30d',
            startDate: monthStart.toISOString().split('T')[0],
            endDate: monthEnd.toISOString().split('T')[0]
          };
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            filterParams = {
              dateRange: 'custom',
              startDate: customStartDate,
              endDate: customEndDate
            };
          }
          break;
        default:
          filterParams = { dateRange: '30d' };
      }

      await Promise.all([
        loadExpenses(),
        refreshDashboard(filterParams),
        loadFilteredSales()
      ]);
      
      // Mark initial load as complete
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadExpenses, loadFilteredSales, dateRange, customStartDate, customEndDate, isInitialLoad]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Load filtered sales when filters change
  useEffect(() => {
    loadFilteredSales();
  }, [loadFilteredSales]);

  // Refresh dashboard metrics when filters change
  useEffect(() => {
    const refreshData = async () => {
      setIsRefreshing(true);
      
      try {
        const now = new Date();
        let filterParams: any = {};
        
        switch (dateRange) {
          case 'today':
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            filterParams = {
              dateRange: 'today',
              startDate: today.toISOString().split('T')[0],
              endDate: today.toISOString().split('T')[0]
            };
            break;
          case 'this_month':
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            filterParams = {
              dateRange: '30d',
              startDate: monthStart.toISOString().split('T')[0],
              endDate: monthEnd.toISOString().split('T')[0]
            };
            break;
          case 'custom':
            if (customStartDate && customEndDate) {
              filterParams = {
                dateRange: 'custom',
                startDate: customStartDate,
                endDate: customEndDate
              };
            }
            break;
          default:
            filterParams = { dateRange: '30d' };
        }

        await refreshDashboard(filterParams);
      } catch (error) {
        console.error('Failed to refresh dashboard:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    refreshData();
  }, [dateRange, customStartDate, customEndDate]); // Removed refreshDashboard from dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Use filtered sales data for charts when filters are applied, otherwise use API data
  const salesData = useMemo(() => {
    // If filters are applied (not default 'this_month'), use filtered sales
    if (dateRange !== 'this_month' || customStartDate || customEndDate) {
      if (!filteredSales || filteredSales.length === 0) {
        // If filtered sales is empty, try to use dashboardMetrics data as fallback
        if (dashboardMetrics?.salesByMonth && dashboardMetrics.salesByMonth.length > 0) {
          return dashboardMetrics.salesByMonth.map(item => ({
            month: item.month,
            sales: item.sales
          }));
        }
        return [];
      }
      
      // Group filtered sales by month
      const monthlySales = filteredSales.reduce((acc, sale) => {
        const saleDate = new Date(sale.created_at);
        const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!acc[monthKey]) {
          acc[monthKey] = { month: monthKey, sales: 0 };
        }
        acc[monthKey].sales += sale.total_amount;
        
        return acc;
      }, {} as Record<string, { month: string; sales: number }>);
      
      return Object.values(monthlySales).sort((a: any, b: any) => a.month.localeCompare(b.month));
    }
    
    // Use API data when no filters are applied
    if (!shouldIgnoreDashboardMetrics && dashboardMetrics?.salesByMonth && dashboardMetrics.salesByMonth.length > 0) {
      return dashboardMetrics.salesByMonth.map(item => ({
    month: item.month,
    sales: item.sales
      }));
    }
    
    return [];
  }, [dashboardMetrics?.salesByMonth, filteredSales, dateRange, customStartDate, customEndDate, isInitialLoad, shouldIgnoreDashboardMetrics]);

  // Use filtered sales data for top products when filters are applied, otherwise use API data
  const topProductsData = useMemo(() => {
    // If filters are applied (not default 'this_month'), use filtered sales
    if (dateRange !== 'this_month' || customStartDate || customEndDate) {
      if (!filteredSales || filteredSales.length === 0) {
        // If filtered sales is empty, try to use dashboardMetrics data as fallback
        if (dashboardMetrics?.topProducts && dashboardMetrics.topProducts.length > 0) {
          return dashboardMetrics.topProducts.map(product => ({
            name: product.productName?.length > 12 
              ? product.productName.substring(0, 12) + '...' 
              : product.productName,
            fullName: product.productName,
            revenue: product.revenue,
            quantity: product.quantitySold,
          }));
        }
        return [];
      }
      
      // Aggregate product sales from filtered transactions
      const productSales = filteredSales.reduce((acc, sale) => {
        sale.items?.forEach((item: any) => {
          const productId = item.product_id;
          if (!acc[productId]) {
            acc[productId] = {
              productId,
              productName: item.product_name,
              revenue: 0,
              quantitySold: 0
            };
          }
          acc[productId].revenue += item.total_price;
          acc[productId].quantitySold += item.quantity;
        });
        return acc;
      }, {} as Record<string, { productId: string; productName: string; revenue: number; quantitySold: number }>);
      
      // Convert to array and sort by revenue
      return Object.values(productSales)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10) // Top 10 products
        .map((product: any) => ({
          name: product.productName?.length > 12 
            ? product.productName.substring(0, 12) + '...' 
      : product.productName || 'Unknown Product',
          fullName: product.productName || 'Unknown Product',
          revenue: product.revenue,
          quantity: product.quantitySold,
        }));
    }
    
    // Use API data when no filters are applied (but not on initial load with today filter)
    if (!shouldIgnoreDashboardMetrics && dashboardMetrics?.topProducts && dashboardMetrics.topProducts.length > 0) {
      return dashboardMetrics.topProducts.map(product => ({
        name: product.productName?.length > 12 
          ? product.productName.substring(0, 12) + '...' 
      : product.productName,
        fullName: product.productName,
    revenue: product.revenue,
    quantity: product.quantitySold,
      }));
    }
    
    return [];
  }, [dashboardMetrics?.topProducts, filteredSales, dateRange, customStartDate, customEndDate, isInitialLoad, shouldIgnoreDashboardMetrics]);

  // Smart filtering system that affects all dashboard content
  const getSmartFilteringData = () => {
    const now = new Date();
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;
    let comparisonLabel: string;
    let periodLabel: string;
    
    // Determine current period based on filter
    switch (dateRange) {
      case 'today':
        // Today vs Yesterday
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        previousPeriodStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        previousPeriodEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        comparisonLabel = 'vs yesterday';
        periodLabel = 'Today';
        break;
        
      case 'this_month':
        // This month vs Last month
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousPeriodStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        previousPeriodEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);
        comparisonLabel = 'vs last month';
        periodLabel = 'This Month';
        break;
        
      case 'custom':
        // Custom range vs same length period before
        if (!customStartDate || !customEndDate) {
          return null;
        }
        currentPeriodStart = new Date(customStartDate);
        currentPeriodEnd = new Date(customEndDate);
        const periodLength = currentPeriodEnd.getTime() - currentPeriodStart.getTime();
        previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1);
        previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength);
        comparisonLabel = 'vs previous period';
        periodLabel = `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`;
        break;
        
      default:
        return null;
    }
    
      return {
      currentPeriodStart,
      currentPeriodEnd,
      previousPeriodStart,
      previousPeriodEnd,
      comparisonLabel,
      periodLabel
    };
  };

  // Calculate comprehensive metrics from filtered sales data
  const calculateSmartMetrics = () => {
    const filterData = getSmartFilteringData();
    if (!filterData) {
      return {
        totalSales: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        growthRate: 0,
        comparisonLabel: 'vs last month',
        periodLabel: 'This Month'
      };
    }

    const { previousPeriodStart, previousPeriodEnd, comparisonLabel, periodLabel } = filterData;
    
    // Get current period data (from filtered sales)
    const currentPeriodSales = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const currentPeriodTransactions = filteredSales.length;
    const currentPeriodAvgTransaction = currentPeriodTransactions > 0 ? currentPeriodSales / currentPeriodTransactions : 0;
    
    // Get previous period data (from all sales)
    const previousPeriodSales = sales?.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= previousPeriodStart && saleDate <= previousPeriodEnd;
    }).reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
    
    const previousPeriodTransactions = sales?.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= previousPeriodStart && saleDate <= previousPeriodEnd;
    }).length || 0;
    
    const previousPeriodAvgTransaction = previousPeriodTransactions > 0 ? previousPeriodSales / previousPeriodTransactions : 0;
    
    // Calculate growth rates
    const salesGrowthRate = previousPeriodSales > 0 ? ((currentPeriodSales - previousPeriodSales) / previousPeriodSales) * 100 : 0;
    const transactionGrowthRate = previousPeriodTransactions > 0 ? ((currentPeriodTransactions - previousPeriodTransactions) / previousPeriodTransactions) * 100 : 0;
    const avgTransactionGrowthRate = previousPeriodAvgTransaction > 0 ? ((currentPeriodAvgTransaction - previousPeriodAvgTransaction) / previousPeriodAvgTransaction) * 100 : 0;
    
    return {
      totalSales: currentPeriodSales,
      totalTransactions: currentPeriodTransactions,
      averageTransactionValue: currentPeriodAvgTransaction,
      growthRate: salesGrowthRate,
      transactionGrowthRate,
      avgTransactionGrowthRate,
      comparisonLabel,
      periodLabel,
      previousPeriodSales,
      previousPeriodTransactions,
      previousPeriodAvgTransaction
    };
  };

  const smartMetrics = calculateSmartMetrics();
  
  // Always prioritize dashboardMetrics when available (it contains the correct filtered data from backend)
  // Only use smartMetrics as fallback when dashboardMetrics is not available
  // Don't use dashboardMetrics on initial load with 'today' filter to prevent showing stale data
  const useFilteredMetrics = (dateRange !== 'this_month' || customStartDate || customEndDate) && (!dashboardMetrics || (isInitialLoad && dateRange === 'today'));
  
  const totalSales = (useFilteredMetrics || shouldIgnoreDashboardMetrics) ? (smartMetrics.totalSales || 0) : (dashboardMetrics?.totalSales ?? 0);
  const totalTransactions = (useFilteredMetrics || shouldIgnoreDashboardMetrics) ? (smartMetrics.totalTransactions || 0) : (dashboardMetrics?.totalTransactions ?? 0);
  const averageTransactionValue = (useFilteredMetrics || shouldIgnoreDashboardMetrics) ? (smartMetrics.averageTransactionValue || 0) : (dashboardMetrics?.averageTransactionValue ?? 0);
  const growthRate = (useFilteredMetrics || shouldIgnoreDashboardMetrics) ? (smartMetrics.growthRate || 0) : (dashboardMetrics?.growthRate ?? 0);
  const transactionGrowthRate = useFilteredMetrics ? (smartMetrics.transactionGrowthRate || 0) : 0;
  const avgTransactionGrowthRate = useFilteredMetrics ? (smartMetrics.avgTransactionGrowthRate || 0) : 0;
  // Get comparison label and period label based on current filter
  let comparisonLabel = 'vs last month';
  let periodLabel = 'This Month';
  
  if (useFilteredMetrics && smartMetrics) {
    comparisonLabel = smartMetrics.comparisonLabel || 'vs last month';
    periodLabel = smartMetrics.periodLabel || 'This Month';
  } else if (shouldIgnoreDashboardMetrics) {
    // Use correct labels for initial load with today filter
    comparisonLabel = 'vs yesterday';
    periodLabel = 'Today';
  } else if (dashboardMetrics) {
    // Use correct labels based on current filter when using dashboardMetrics
    switch (dateRange) {
      case 'today':
        comparisonLabel = 'vs yesterday';
        periodLabel = 'Today';
        break;
      case 'custom':
        comparisonLabel = 'vs previous period';
        periodLabel = customStartDate && customEndDate 
          ? `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`
          : 'Custom Range';
        break;
      default:
        comparisonLabel = 'vs last month';
        periodLabel = 'This Month';
    }
  }
  
  // Use expense data from dashboard metrics if available, otherwise use local state
  // Don't use dashboardMetrics on initial load with 'today' filter to prevent showing stale data
  const totalExpensesFromMetrics = shouldIgnoreDashboardMetrics ? 0 : (dashboardMetrics?.totalExpenses || 0);
  const monthlyExpensesFromMetrics = shouldIgnoreDashboardMetrics ? 0 : (dashboardMetrics?.monthlyExpenses || 0);
  const netProfitFromMetrics = shouldIgnoreDashboardMetrics ? 0 : (dashboardMetrics?.netProfit || 0);
  
  // Calculate net profit (use metrics if available, otherwise calculate locally)
  const netProfit = netProfitFromMetrics || (totalSales - totalExpenses);
  
  // Debug logging
  useEffect(() => {
  }, [dashboardMetrics, totalSales, totalTransactions, averageTransactionValue, growthRate, transactionGrowthRate, avgTransactionGrowthRate, totalExpenses, netProfit, totalExpensesFromMetrics, monthlyExpensesFromMetrics, netProfitFromMetrics, smartMetrics, useFilteredMetrics, comparisonLabel, periodLabel, dateRange, customStartDate, customEndDate]);

  const metricCards = [
    {
      title: 'Total Sales',
      value: formatPrice(totalSales),
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-gradient-to-br from-emerald-100 to-teal-100',
      iconColor: 'text-emerald-600',
      change: `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}% ${comparisonLabel}`,
      changeColor: growthRate >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
    {
      title: 'Total Expenses',
      value: formatPrice(totalExpensesFromMetrics || totalExpenses),
      icon: TrendingDown,
      gradient: 'from-red-500 to-pink-600',
      iconBg: 'bg-gradient-to-br from-red-100 to-pink-100',
      iconColor: 'text-red-600',
      change: `+8.2% ${comparisonLabel}`, // TODO: Calculate expense growth rate
      changeColor: 'text-red-600',
    },
    {
      title: 'Net Profit',
      value: formatPrice(netProfit),
      icon: Activity,
      gradient: netProfit >= 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600',
      iconBg: netProfit >= 0 ? 'bg-gradient-to-br from-green-100 to-emerald-100' : 'bg-gradient-to-br from-red-100 to-rose-100',
      iconColor: netProfit >= 0 ? 'text-green-600' : 'text-red-600',
      change: `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}% ${comparisonLabel}`, // TODO: Calculate net profit growth rate
      changeColor: netProfit >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      title: 'Transactions',
      value: totalTransactions.toString(),
      icon: ShoppingCart,
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-gradient-to-br from-blue-100 to-indigo-100',
      iconColor: 'text-blue-600',
      change: `${transactionGrowthRate > 0 ? '+' : ''}${transactionGrowthRate.toFixed(1)}% ${comparisonLabel}`,
      changeColor: transactionGrowthRate >= 0 ? 'text-blue-600' : 'text-red-600',
    },
  ];

  if (loading || isInitialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-24 transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-300">
            <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-1">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Welcome to {app.name} Management System</p>
            </div>
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" className="mr-3" />
              <span className="text-gray-500 dark:text-gray-400">Loading dashboard data...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 pb-24">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-white via-white to-blue-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 transition-all duration-300 hover:shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 dark:from-blue-400/5 dark:to-purple-400/5"></div>
          <div className="relative text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
              Dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Welcome to {app.name} Management System
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dashboard Filters</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Filter your dashboard data</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
              </Button>
              <Button
                variant={dateRange === 'today' ? 'primary' : 'outline'}
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className={`flex items-center space-x-2 ${
                  dateRange === 'today' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
                    : ''
                } ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>
                  {isRefreshing 
                    ? 'Refreshing...' 
                    : dateRange === 'today' 
                      ? 'Refresh Now' 
                      : 'Refresh Data'
                  }
                </span>
              </Button>
              {dateRange === 'today' && (
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Auto-refresh: 15s
                </div>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="space-y-4">
              {/* Quick Date Range Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Quick Select
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDateRange('today')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      dateRange === 'today'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setDateRange('this_month')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      dateRange === 'this_month'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => setDateRange('custom')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      dateRange === 'custom'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Custom Range
                  </button>
                </div>
              </div>

              {/* Custom Date Range */}
              {dateRange === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label="Select start date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      aria-label="Select end date"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Filters Summary */}
          <div className="mt-4 flex flex-wrap items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active filter:</span>
              {dateRange !== 'this_month' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {dateRange === 'today' ? 'Today' : 
                   dateRange === 'custom' ? 
                     (customStartDate && customEndDate ? 
                       `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}` : 
                       'Custom Range') : 
                   'This Month'}
                  <button
                    onClick={() => setDateRange('this_month')}
                    className="ml-1 hover:text-blue-600"
                    title="Reset to This Month"
                    aria-label="Reset to This Month"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {(useFilteredMetrics || shouldIgnoreDashboardMetrics) ? (
                  `Showing ${filteredSales.length} ${dateRange === 'today' ? 'today\'s' : 'filtered'} transactions`
                ) : dashboardMetrics ? (
                  `Showing ${dashboardMetrics.totalTransactions || 0} ${dateRange === 'today' ? 'today\'s' : dateRange === 'this_month' ? 'this month\'s' : 'filtered'} transactions`
                ) : (
                  `Showing 0 total transactions`
                )}
              </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {metricCards.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={index}
                className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-gray-800"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-gray-700/50"></div>
                <div className="relative">
                  <div className={`w-14 h-14 ${metric.iconBg} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-7 w-7 ${metric.iconColor}`} />
                  </div>
                  <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    {metric.title}
                  </h3>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {metric.value}
                  </p>
                  <div className="flex items-center space-x-1">
                    <span className={`text-xs font-medium ${metric.changeColor}`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>


        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sales Overview Chart */}
          <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 transition-all duration-300 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5 dark:from-emerald-400/5 dark:to-teal-400/5"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sales Overview</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Monthly sales performance</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
            </div>
              <div className="h-80">
              {salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                      <XAxis 
                        dataKey="month" 
                        stroke="#6b7280" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`}
                      />
                    <Tooltip 
                      formatter={(value: number) => [formatPrice(value), 'Sales']}
                      labelFormatter={(label) => `Month: ${label}`}
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: 'none', 
                          borderRadius: '12px',
                          color: '#f9fafb',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                        stroke="url(#salesGradient)" 
                        strokeWidth={4}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 3, fill: '#ffffff' }}
                      />
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#14b8a6" />
                        </linearGradient>
                      </defs>
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <BarChart3 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">No sales data available</p>
                      <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Sales data will appear here once transactions are recorded</p>
                      <button
                        onClick={() => window.location.href = '/pos'}
                        className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-medium rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      >
                        Start Selling
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => window.location.href = '/reports'}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-medium rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  View Details
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
                </div>
            </div>
          </div>

          {/* Top Products Chart */}
          <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 transition-all duration-300 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 dark:from-blue-400/5 dark:to-indigo-400/5"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Top Products</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Best performing products</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
            </div>
              <div className="h-96">
              {topProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6b7280" 
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`}
                      />
                    <Tooltip 
                        formatter={(value: number, name: string, props: any) => [
                          formatPrice(value), 
                          'Revenue'
                        ]}
                        labelFormatter={(label: string, payload: any) => {
                          const data = payload?.[0]?.payload;
                          return data?.fullName || label;
                        }}
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: 'none', 
                          borderRadius: '12px',
                          color: '#f9fafb',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill="url(#barGradient)" 
                        radius={[8, 8, 0, 0]}
                      />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                      </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">No product data available</p>
                      <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Product performance data will appear here</p>
                      <button
                        onClick={() => window.location.href = '/products'}
                        className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-medium rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
                      >
                        Manage Products
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => window.location.href = '/products'}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-medium rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
                </div>
            </div>
          </div>
        </div>

        {/* Recent Activity & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Sales */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">Recent Sales</h3>
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                {sales && sales.length > 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/reports'}
                    className="text-xs px-2 py-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View All
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
                {(filteredSales && filteredSales.length > 0) || (!shouldIgnoreDashboardMetrics && dashboardMetrics?.recentTransactions && dashboardMetrics.recentTransactions.length > 0) ? (
                  (filteredSales && filteredSales.length > 0 ? filteredSales : (!shouldIgnoreDashboardMetrics ? dashboardMetrics?.recentTransactions : []) || [])?.slice(0, 4).map((sale: any) => {
                  // Always prefer filteredSales data as it contains complete transaction details with product names
                  const isApiData = !filteredSales || filteredSales.length === 0;
                  
                  // Extract product names from both API data and filtered sales
                  let productNames = 'No items';
                  let hasMoreItems = false;
                  
                  if (isApiData) {
                    // For API data (when filteredSales is not available), we need to get product names from the transaction items
                    // The API should include items with product names
                    if (sale.items && sale.items.length > 0) {
                      productNames = sale.items.slice(0, 2).map((item: any) => item.product_name || item.productName || 'Unknown Product').join(', ');
                      hasMoreItems = sale.items.length > 2;
                    } else {
                      // Fallback: if no items in API data, show transaction ID or generic name
                      productNames = `Transaction #${sale.id?.slice(-6) || 'Unknown'}`;
                    }
                  } else {
                    // For filtered sales data (preferred - contains complete transaction details)
                    if (sale.items && sale.items.length > 0) {
                      productNames = sale.items.slice(0, 2).map((item: any) => item.product_name || item.productName || 'Unknown Product').join(', ');
                      hasMoreItems = sale.items.length > 2;
                    } else {
                      // Fallback: if no items in filtered sales, show transaction ID
                      productNames = `Transaction #${sale._id?.slice(-6) || sale.id?.slice(-6) || 'Unknown'}`;
                    }
                  }
                  const saleDate = isApiData ? sale.createdAt : sale.created_at;
                  const paymentMethod = isApiData ? sale.paymentMethod : sale.payment_method;
                  const totalAmount = isApiData ? sale.totalAmount : sale.total_amount;
                  const itemCount = isApiData ? 1 : (sale.items?.length || 0);
                  
                  return (
                    <div key={isApiData ? sale.id : sale._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-white text-sm truncate">
                          {productNames}
                          {hasMoreItems && ` +${(sale.items?.length || 0) - 2} more`}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(saleDate).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span className="capitalize">
                            {paymentMethod || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm">{formatPrice(totalAmount || 0)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{itemCount} items</p>
                    </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No recent sales</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Sales transactions will appear here</p>
                </div>
              )}
            </div>
          </Card>

          {/* Inventory Alerts */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">Inventory Alerts</h3>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                {inventoryAlerts && inventoryAlerts.length > 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/inventory'}
                    className="text-xs px-2 py-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View All
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {!inventoryAlerts || inventoryAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No inventory alerts</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">All products are well stocked</p>
                </div>
              ) : (
                inventoryAlerts.slice(0, 3).map((alert) => (
                  <div key={alert._id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white text-sm truncate">{alert.product_name}</p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {alert.alert_type === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'} • 
                        {alert.current_quantity} remaining
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.alert_type === 'out_of_stock' 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {alert.alert_type === 'out_of_stock' ? 'Critical' : 'Warning'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

        </div>

        {/* Quick Actions - Compact Version */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Quick Actions</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.location.href = '/pos'}
                className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-lg text-white text-xs font-medium transition-all duration-300 hover:scale-105"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>New Sale</span>
              </button>
              <button
                onClick={() => window.location.href = '/products'}
                className="flex items-center space-x-2 px-3 py-2 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-xs font-medium transition-all duration-300 hover:scale-105"
              >
                <Package className="h-4 w-4" />
                <span>Add Product</span>
              </button>
              <button
                onClick={() => window.location.href = '/inventory'}
                className="flex items-center space-x-2 px-3 py-2 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-xs font-medium transition-all duration-300 hover:scale-105"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Inventory</span>
              </button>
              <button
                onClick={() => window.location.href = '/reports'}
                className="flex items-center space-x-2 px-3 py-2 bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-xs font-medium transition-all duration-300 hover:scale-105"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Reports</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
