import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, 
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
  Zap,
  Filter,
  X,
  RefreshCw
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
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'this_month' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Enable automatic refresh for dashboard (conservative settings)
  usePageRefresh({
    refreshOnMount: true,
    refreshOnFocus: false, // Disabled to prevent excessive refreshing
    refreshInterval: 60000, // Refresh every 60 seconds (increased from 30)
    refreshOnVisibilityChange: false, // Disabled to prevent excessive refreshing
    silent: true
  });

  // Load expenses data
  const loadExpenses = useCallback(async () => {
    if (user?.store_id) {
      try {
        console.log('=== DASHBOARD EXPENSES DEBUG ===');
        console.log('Loading expense stats for store_id:', user.store_id);
        
        const stats = await apiService.getExpenseStats({
          store_id: user.store_id
        });
        
        console.log('Expense Stats API Response:', stats);
        console.log('Total Amount from stats:', stats.totalAmount);
        
        setTotalExpenses(stats.totalAmount || 0);
        console.log('================================');
      } catch (error) {
        console.error('Failed to load expense stats:', error);
        // Try to get expenses from the expenses API directly
        try {
          console.log('Trying to load expenses directly...');
          const expenses = await apiService.getExpenses({
            store_id: user.store_id,
            limit: 1000 // Get all expenses
          });
          console.log('Direct expenses response:', expenses);
          
          if (expenses && expenses.expenses && Array.isArray(expenses.expenses)) {
            const total = expenses.expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
            console.log('Calculated total from expenses array:', total);
            setTotalExpenses(total);
          }
        } catch (directError) {
          console.error('Failed to load expenses directly:', directError);
        }
      }
    }
  }, [user?.store_id]);

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
          startDate = today.toISOString().split('T')[0];
          endDate = today.toISOString().split('T')[0];
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

  // Load filtered sales when filters change
  useEffect(() => {
    loadFilteredSales();
  }, [loadFilteredSales]);

  // Use API sales data for charts, fallback to filtered sales
  const salesData = useMemo(() => {
    // Use API data if available
    if (dashboardMetrics?.salesByMonth && dashboardMetrics.salesByMonth.length > 0) {
      return dashboardMetrics.salesByMonth.map(item => ({
        month: item.month,
        sales: item.sales
      }));
    }
    
    // Fallback to filtered sales calculation
    if (!filteredSales || filteredSales.length === 0) return [];
    
    // Group sales by month
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
  }, [dashboardMetrics?.salesByMonth, filteredSales]);

  // Use API top products data, fallback to filtered sales calculation
  const topProductsData = useMemo(() => {
    // Use API data if available
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
    
    // Fallback to filtered sales calculation
    if (!filteredSales || filteredSales.length === 0) return [];
    
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
  }, [dashboardMetrics?.topProducts, filteredSales]);

  // Calculate metrics from filtered sales data
  const calculateMetricsFromSales = () => {
    if (!filteredSales || filteredSales.length === 0) {
      return {
        totalSales: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
        growthRate: 0
      };
    }

    const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const totalTransactions = filteredSales.length;
    const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    
    // Calculate growth rate (period-over-period based on date range)
    const now = new Date();
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;
    
    switch (dateRange) {
      case 'today':
        // Compare with yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        previousPeriodStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        previousPeriodEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        break;
      case 'this_month':
        // Compare with last month
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousPeriodStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        previousPeriodEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'custom':
        // For custom range, compare with same length period before
        if (!customStartDate || !customEndDate) {
          return { totalSales, totalTransactions, averageTransactionValue, growthRate: 0 };
        }
        const customStart = new Date(customStartDate);
        const customEnd = new Date(customEndDate);
        const periodLength = customEnd.getTime() - customStart.getTime();
        previousPeriodEnd = new Date(customStart.getTime() - 1);
        previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength);
        break;
      default:
        return { totalSales, totalTransactions, averageTransactionValue, growthRate: 0 };
    }
    
    const currentPeriodSales = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const previousPeriodSales = sales?.filter(sale => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= previousPeriodStart && saleDate <= previousPeriodEnd;
    }).reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
    
    const growthRate = previousPeriodSales > 0 ? ((currentPeriodSales - previousPeriodSales) / previousPeriodSales) * 100 : 0;
    
    return {
      totalSales,
      totalTransactions,
      averageTransactionValue,
      growthRate
    };
  };

  const calculatedMetrics = calculateMetricsFromSales();
  // Use dashboard metrics if available, otherwise use calculated metrics
  const totalSales = dashboardMetrics?.totalSales || calculatedMetrics.totalSales;
  const totalTransactions = dashboardMetrics?.totalTransactions || calculatedMetrics.totalTransactions;
  const averageTransactionValue = dashboardMetrics?.averageTransactionValue || calculatedMetrics.averageTransactionValue;
  const growthRate = dashboardMetrics?.growthRate || calculatedMetrics.growthRate;
  
  // Use expense data from dashboard metrics if available, otherwise use local state
  const totalExpensesFromMetrics = dashboardMetrics?.totalExpenses || 0;
  const monthlyExpensesFromMetrics = dashboardMetrics?.monthlyExpenses || 0;
  const netProfitFromMetrics = dashboardMetrics?.netProfit || 0;
  
  // Calculate net profit (use metrics if available, otherwise calculate locally)
  const netProfit = netProfitFromMetrics || (totalSales - totalExpenses);
  
  // Debug logging
  useEffect(() => {
    console.log('=== DASHBOARD METRICS DEBUG ===');
    console.log('Dashboard Metrics:', dashboardMetrics);
    console.log('Total Sales (from metrics):', dashboardMetrics?.totalSales);
    console.log('Total Sales (calculated):', calculatedMetrics.totalSales);
    console.log('Total Sales (final):', totalSales);
    console.log('Total Transactions (from metrics):', dashboardMetrics?.totalTransactions);
    console.log('Total Transactions (calculated):', calculatedMetrics.totalTransactions);
    console.log('Total Transactions (final):', totalTransactions);
    console.log('Average Transaction (from metrics):', dashboardMetrics?.averageTransactionValue);
    console.log('Average Transaction (calculated):', calculatedMetrics.averageTransactionValue);
    console.log('Average Transaction (final):', averageTransactionValue);
    console.log('Growth Rate (from metrics):', dashboardMetrics?.growthRate);
    console.log('Growth Rate (calculated):', calculatedMetrics.growthRate);
    console.log('Growth Rate (final):', growthRate);
    console.log('Total Expenses (from metrics):', totalExpensesFromMetrics);
    console.log('Total Expenses (local):', totalExpenses);
    console.log('Monthly Expenses (from metrics):', monthlyExpensesFromMetrics);
    console.log('Net Profit (from metrics):', netProfitFromMetrics);
    console.log('Net Profit (calculated):', netProfit);
    console.log('================================');
  }, [dashboardMetrics, totalSales, totalTransactions, averageTransactionValue, growthRate, totalExpenses, netProfit, totalExpensesFromMetrics, monthlyExpensesFromMetrics, netProfitFromMetrics, calculatedMetrics]);

  const metricCards = [
    {
      title: 'Total Sales',
      value: formatPrice(totalSales),
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-gradient-to-br from-emerald-100 to-teal-100',
      iconColor: 'text-emerald-600',
      change: '+12.5%',
      changeColor: 'text-emerald-600',
    },
    {
      title: 'Total Expenses',
      value: formatPrice(totalExpensesFromMetrics || totalExpenses),
      icon: TrendingDown,
      gradient: 'from-red-500 to-pink-600',
      iconBg: 'bg-gradient-to-br from-red-100 to-pink-100',
      iconColor: 'text-red-600',
      change: '+8.2%',
      changeColor: 'text-red-600',
    },
    {
      title: 'Net Profit',
      value: formatPrice(netProfit),
      icon: Activity,
      gradient: netProfit >= 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600',
      iconBg: netProfit >= 0 ? 'bg-gradient-to-br from-green-100 to-emerald-100' : 'bg-gradient-to-br from-red-100 to-rose-100',
      iconColor: netProfit >= 0 ? 'text-green-600' : 'text-red-600',
      change: netProfit >= 0 ? '+15.3%' : '-5.2%',
      changeColor: netProfit >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      title: 'Transactions',
      value: totalTransactions.toString(),
      icon: ShoppingCart,
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-gradient-to-br from-blue-100 to-indigo-100',
      iconColor: 'text-blue-600',
      change: '+24.1%',
      changeColor: 'text-blue-600',
    },
    {
      title: 'Avg. Transaction',
      value: formatPrice(averageTransactionValue),
      icon: TrendingUp,
      gradient: 'from-purple-500 to-violet-600',
      iconBg: 'bg-gradient-to-br from-purple-100 to-violet-100',
      iconColor: 'text-purple-600',
      change: '+3.7%',
      changeColor: 'text-purple-600',
    },
    {
      title: 'Growth Rate',
      value: `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
      icon: Zap,
      gradient: 'from-orange-500 to-amber-600',
      iconBg: 'bg-gradient-to-br from-orange-100 to-amber-100',
      iconColor: 'text-orange-600',
      change: '+18.9%',
      changeColor: 'text-orange-600',
    },
  ];

  if (loading) {
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
                variant="outline"
                size="sm"
                onClick={() => {
                  loadExpenses();
                  refreshDashboard();
                  loadFilteredSales();
                }}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh Data</span>
              </Button>
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
              Showing {filteredSales.length} of {sales?.length || 0} transactions
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
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
                    <span className="text-xs text-gray-500 dark:text-gray-400">vs last month</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 transition-all duration-300 hover:shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-purple-600/5 dark:from-indigo-400/5 dark:to-purple-400/5"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Quick Actions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Access your most used features</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => window.location.href = '/pos'}
                className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-2xl p-6 text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold">New Sale</span>
                </div>
              </button>
              <button
                onClick={() => window.location.href = '/products'}
                className="group relative overflow-hidden bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded-2xl p-6 border border-gray-200 dark:border-gray-600 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Add Product</span>
                </div>
              </button>
              <button
                onClick={() => window.location.href = '/inventory'}
                className="group relative overflow-hidden bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded-2xl p-6 border border-gray-200 dark:border-gray-600 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/50 dark:to-red-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Check Inventory</span>
                </div>
              </button>
              <button
                onClick={() => window.location.href = '/reports'}
                className="group relative overflow-hidden bg-white/80 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-700 rounded-2xl p-6 border border-gray-200 dark:border-gray-600 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/50 dark:to-violet-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">View Reports</span>
                </div>
              </button>
            </div>
          </div>
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
              {(dashboardMetrics?.recentTransactions && dashboardMetrics.recentTransactions.length > 0) || (filteredSales && filteredSales.length > 0) ? (
                (dashboardMetrics?.recentTransactions || filteredSales)?.slice(0, 4).map((sale: any) => {
                  // Handle API data format vs filtered sales format
                  const isApiData = dashboardMetrics?.recentTransactions?.includes(sale);
                  const productNames = isApiData ? 'Transaction' : (sale.items?.slice(0, 2).map((item: any) => item.product_name || 'Unknown Product').join(', ') || 'No items');
                  const hasMoreItems = isApiData ? false : (sale.items?.length || 0) > 2;
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
      </div>
    </div>
  );
};
