import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  X,
  Trophy,
  TrendingUp,
  Target
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useGoals } from '../context/GoalContext';
import { useTheme } from '../context/ThemeContext';
import { NotificationPermissionBanner } from '../components/ui/NotificationPermissionBanner';
import { NotificationStatus } from '../components/ui/NotificationStatus';
import { GoalSettingModal } from '../components/ui/GoalSettingModal';
import { apiService } from '../services/api';
import { app } from '../config/environment';
import { 
  getTodayRange, 
  getThisMonthRange, 
  getCurrentDateTime, 
  debugTimezoneInfo,
  normalizeDateToYYYYMMDD,
  formatDateForChart,
  parseAndNormalizeDate,
  isSameDate
} from '../utils/timezoneUtils';
// import { usePageRefresh } from '../hooks/usePageRefresh'; // Temporarily disabled
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

// Custom hook for animated numbers
const useAnimatedNumber = (targetValue: number, duration: number = 1000) => {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (targetValue === currentValue) return;

    setIsAnimating(true);
    const startValue = currentValue;
    const difference = targetValue - startValue;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const newValue = startValue + (difference * easeOutCubic);
      
      setCurrentValue(newValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentValue(targetValue);
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [targetValue, duration]);

  return { currentValue, isAnimating };
};

export const Dashboard: React.FC = () => {
  const { inventoryAlerts, loading, dashboardMetrics, refreshDashboard } = useApp();
  const { user } = useAuth();
  const { dailyProgress, monthlyProgress, updateGoalProgress } = useGoals();
  const { isDark } = useTheme();
  // Suppress verbose debug logs from this component to keep console clean
  // BUT allow expense-related logs for debugging
  useEffect(() => {
    const originalLog = console.log;
    const suppressedPrefixes = ['🔍', '⚠️', '🔄'];
    // Wrap console.log to filter noisy dashboard logs
    console.log = (...args: any[]) => {
      if (typeof args[0] === 'string' && suppressedPrefixes.some((p) => args[0].startsWith(p))) {
        // Allow expense-related logs to pass through for debugging
        const logMessage = args[0];
        if (logMessage.includes('Expense') || logMessage.includes('EXPENSE') || logMessage.includes('expense')) {
          originalLog.apply(console, args as any);
          return;
        }
        return; // drop verbose dashboard debug lines
      }
      originalLog.apply(console, args as any);
    };
    return () => {
      console.log = originalLog;
    };
  }, []);
  
  // Tooltip styles based on theme
  const getTooltipStyles = () => ({
    contentStyle: {
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      border: isDark ? 'none' : '1px solid #e5e7eb',
      borderRadius: '12px',
      color: isDark ? '#f9fafb' : '#374151',
      fontSize: '14px',
      fontWeight: '500',
      padding: '12px 16px',
      boxShadow: isDark 
        ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
        : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    },
    labelStyle: {
      color: isDark ? '#f9fafb' : '#374151',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '4px'
    },
    itemStyle: {
      color: isDark ? '#f9fafb' : '#374151'
    }
  });

  // totalExpenses now comes from dashboard metrics - no separate state needed
  const [filteredSales, setFilteredSales] = useState<any[]>([]);
  const [fullTransactions, setFullTransactions] = useState<any[]>([]); // Full transaction data for payment methods
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [localDashboardMetrics, setLocalDashboardMetrics] = useState<any>(null);
  const [isGoalSettingModalOpen, setIsGoalSettingModalOpen] = useState(false);
  const isRefreshingRef = useRef(false);
  const lastRefreshRef = useRef<number>(0);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'this_month' | 'custom'>('today'); // Default to today as requested
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Chart period is now automatically determined by dateRange filter - no separate state needed
  
  // Auto-refresh states
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-refresh functionality
  const startAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Refresh interval based on current filter
    const refreshInterval = dateRange === 'today' ? 30000 : 60000; // 30s for today, 1min for others
    
    refreshIntervalRef.current = setInterval(() => {
      if (autoRefreshEnabled) {
        console.log('🔄 Auto-refreshing dashboard data...');
        unifiedRefresh();
        setLastRefreshTime(new Date());
      }
    }, refreshInterval);
  }, [autoRefreshEnabled, dateRange]);

  // Stop auto-refresh
  const stopAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // Start auto-refresh when component mounts or settings change
  useEffect(() => {
    if (autoRefreshEnabled) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => stopAutoRefresh();
  }, [autoRefreshEnabled, startAutoRefresh, stopAutoRefresh]);

  // Refresh dashboard data when component mounts to get latest payment method data
  useEffect(() => {
    if (user?.store_id && !dashboardMetrics) {
      console.log('🔄 Dashboard - Refreshing dashboard data on mount (no existing metrics)');
      refreshDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.store_id]); // Remove refreshDashboard from dependencies to prevent infinite loop

  // Cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      // Cleanup any pending operations when component unmounts
      isRefreshingRef.current = false;
    };
  }, []);

  // For initial load with 'today' filter, completely ignore dashboardMetrics to prevent flashing
  // Temporarily disable this to fix the empty KPI issue
  // const shouldIgnoreDashboardMetrics = false; // isInitialLoad && dateRange === 'today';

  // Enable automatic refresh for dashboard with smart intervals based on filter (currently disabled)
  // const refreshInterval = useMemo(() => {
  //   // More frequent refresh for "Today" filter since sales happen in real-time
  //   if (dateRange === 'today') {
  //     return 120000; // 2 minutes for today's data (increased to prevent excessive calls)
  //   }
  //   // Less frequent for monthly/custom data
  //   return 300000; // 5 minutes for other filters (increased to prevent excessive calls)
  // }, [dateRange]);



  // Fetch full transaction data for payment methods chart and sales chart
  // Fetches historical data for context based on the filter
  const fetchFullTransactionsForPaymentMethods = useCallback(async (filterParams: any, dateRangeFilter?: string): Promise<any[]> => {
    try {
      console.log('🔍 Fetching full transactions for chart context...', {
        store_id: user?.store_id,
        filterParams,
        dateRangeFilter
      });
      
      if (!user?.store_id) {
        console.error('❌ No store_id available for fetching transactions');
        return [];
      }
      
      // Fetch ALL historical transactions for complete chart context
      // This ensures all sales data across all dates is available for the chart
      let historicalStartDate: string | undefined;
      let historicalEndDate: string | undefined;
      const now = new Date();
      
      // For chart context, fetch ALL available transactions (no date limits)
      // This allows the chart to show complete historical trends
      console.log('🔍 Fetching ALL transactions for complete chart context (no date limits)');
      
      // Optionally, you can set a very wide range if the backend requires dates
      // But ideally, we fetch without date filters to get everything
      // For now, set to a very wide range (2 years back) to ensure we get all data
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), 1);
      historicalStartDate = normalizeDateToYYYYMMDD(twoYearsAgo);
      historicalEndDate = normalizeDateToYYYYMMDD(now);
      
      console.log('🔍 Using wide date range to fetch all transactions:', {
        historicalStartDate,
        historicalEndDate,
        note: 'This ensures all historical sales data is available for the chart'
      });
      
      console.warn('💰 SALES API CALL - Requesting ALL transactions:', {
        store_id: user?.store_id,
        page: 1,
        limit: 10000, // Increased limit to get all transactions
        status: 'all',
        start_date: historicalStartDate,
        end_date: historicalEndDate,
        dateRangeFilter,
        note: 'Fetching ALL historical transactions for complete chart context'
      });
      
      const response = await apiService.getTransactions({
        store_id: user?.store_id,
        page: 1,
        limit: 10000, // Increased limit to ensure we get all transactions
        status: 'all',
        start_date: historicalStartDate,
        end_date: historicalEndDate,
      });
      
      console.warn('💰 SALES API CALL - Response received:', {
        transactionCount: response.transactions?.length || 0,
        total: response.total,
        hasTransactions: !!response.transactions,
        isArray: Array.isArray(response.transactions),
        note: 'Checking if API returned transactions'
      });
      
      // Check if transactions exist and is an array
      if (!response.transactions || !Array.isArray(response.transactions)) {
        console.error('❌ SALES API ERROR - Invalid response:', {
          hasTransactions: !!response.transactions,
          isArray: Array.isArray(response.transactions),
          responseType: typeof response.transactions,
          responseKeys: response ? Object.keys(response) : [],
          fullResponse: response
        });
        return [];
      }
      
      // WORKAROUND: If date-filtered request returns 0 or very few transactions, try fetching without date filters
      // This ensures we get ALL transactions regardless of date range
      if (response.transactions.length === 0 || (response.transactions.length < 10 && response.total > response.transactions.length)) {
        console.warn('⚠️ SALES API - Date-filtered request returned limited transactions. Trying without date filters to get ALL data...', {
          transactionCount: response.transactions.length,
          total: response.total,
          historicalStartDate,
          historicalEndDate,
          dateRangeFilter,
          note: 'Fetching ALL transactions without date limits'
        });
        
        try {
          const fallbackResponse = await apiService.getTransactions({
            store_id: user?.store_id,
            page: 1,
            limit: 10000, // Increased limit to get all transactions
            status: 'all',
            // No date filters - get everything
          });
          
          console.warn('💰 SALES API - Fallback (no date filters) response:', {
            transactionCount: fallbackResponse.transactions?.length || 0,
            total: fallbackResponse.total,
            sampleDates: fallbackResponse.transactions?.slice(0, 5).map((tx: any) => ({
              id: tx._id,
              created_at: tx.created_at,
              month: tx.created_at ? `${new Date(tx.created_at).getFullYear()}-${String(new Date(tx.created_at).getMonth() + 1).padStart(2, '0')}` : 'unknown'
            }))
          });
          
          // If fallback has transactions, use ALL of them (no filtering)
          // This ensures the chart shows all historical data across all dates
          if (fallbackResponse.transactions && fallbackResponse.transactions.length > 0) {
            console.warn('💰 SALES API - Using ALL transactions (no date filtering):', {
              transactionCount: fallbackResponse.transactions.length,
              total: fallbackResponse.total,
              transactionsByMonth: Object.keys(fallbackResponse.transactions.reduce((acc: any, tx: any) => {
                const month = `${new Date(tx.created_at).getFullYear()}-${String(new Date(tx.created_at).getMonth() + 1).padStart(2, '0')}`;
                acc[month] = true;
                return acc;
              }, {})).join(', '),
              note: 'Using ALL transactions for complete chart context'
            });
            
            // Use ALL transactions without filtering - this ensures all historical data is shown
            response.transactions = fallbackResponse.transactions;
            response.total = fallbackResponse.total;
          }
        } catch (fallbackError) {
          console.error('❌ SALES API - Fallback request also failed:', fallbackError);
        }
      }
      
      // Group transactions by month for verification
      const transactionsByMonthFromAPI = response.transactions.reduce((acc: any, tx: any) => {
        const txDate = new Date(tx.created_at);
        const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push({
          id: tx._id,
          created_at: tx.created_at,
          total_amount: tx.total_amount
        });
        return acc;
      }, {});
      
      console.log('🔍 Full Transactions API Response:', {
        success: true,
        transactionCount: response.transactions.length,
        total: response.total,
        dateRangeFilter,
        historicalStartDate,
        historicalEndDate,
        sampleTransaction: response.transactions[0],
        transactionDates: response.transactions.slice(0, 5).map((tx: any) => ({
          id: tx._id,
          created_at: tx.created_at,
          total_amount: tx.total_amount
        })),
        allTransactionDates: response.transactions.map((tx: any) => ({
          id: tx._id,
          created_at: tx.created_at,
          total_amount: tx.total_amount,
          month: `${new Date(tx.created_at).getFullYear()}-${String(new Date(tx.created_at).getMonth() + 1).padStart(2, '0')}`
        })),
        transactionsByMonth: Object.keys(transactionsByMonthFromAPI).map(month => ({
          month,
          count: transactionsByMonthFromAPI[month].length,
          total: transactionsByMonthFromAPI[month].reduce((sum: number, tx: any) => sum + (tx.total_amount || 0), 0)
        }))
      });
      
      // Also log to console.warn so it's visible
      console.warn('💰 SALES API - Transactions by Month from API:', 
        Object.keys(transactionsByMonthFromAPI).map(month => {
          const total = transactionsByMonthFromAPI[month].reduce((sum: number, tx: any) => sum + (tx.total_amount || 0), 0);
          return `${month}: ₺${total.toLocaleString()} (${transactionsByMonthFromAPI[month].length} transactions)`;
        }).join(', ')
      );
      
      setFullTransactions(response.transactions);
      console.log('🔍 Full Transactions for Payment Methods:', {
        count: response.transactions.length,
        sampleTransaction: response.transactions[0],
        hasPaymentMethods: response.transactions[0]?.payment_methods,
        hasPaymentMethod: response.transactions[0]?.payment_method
      });
      
      return response.transactions || [];
    } catch (error) {
      console.error('❌ Failed to fetch full transactions for payment methods:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return [];
    }
  }, [user?.store_id, dateRange]);

  // Initial load will be handled after unifiedRefresh is defined

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price);
  };

  // Use standardized date formatting utility
  // formatChartDate is now replaced by formatDateForChart from timezoneUtils

  // Helper function to aggregate data by time period
  const aggregateDataByPeriod = (data: any[], period: 'daily' | 'weekly' | 'monthly') => {
    if (data.length === 0) return [];

    const aggregated = new Map<string, number>();

    data.forEach(item => {
      // Use the originalDate if available (already normalized), otherwise normalize the date
      const itemDate = item.originalDate || item.day || item.created_at;
      let originalDateKey: string;
      
      // Normalize the date to YYYY-MM-DD format using timezone-aware function
      const normalizedDate = normalizeDateToYYYYMMDD(itemDate);
      const date = new Date(normalizedDate + 'T00:00:00'); // Create date at midnight in local timezone
      
      switch (period) {
        case 'weekly':
          // Group by week (Monday as start of week) - use timezone-aware calculation
          const weekStart = new Date(date);
          const dayOfWeek = weekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days to subtract to get Monday
          weekStart.setDate(weekStart.getDate() - daysToMonday);
          weekStart.setHours(0, 0, 0, 0);
          originalDateKey = normalizeDateToYYYYMMDD(weekStart);
          break;
        case 'monthly':
          // Group by month (YYYY-MM format) - use timezone-aware extraction
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          originalDateKey = `${year}-${month}`;
          break;
        default:
          // Daily grouping (YYYY-MM-DD format) - already normalized
          originalDateKey = normalizedDate;
      }

      const existingValue = aggregated.get(originalDateKey) || 0;
      aggregated.set(originalDateKey, existingValue + (item.sales || 0));
    });

    return Array.from(aggregated.entries())
      .map(([originalDateKey, sales]) => ({
        day: formatDateForChart(originalDateKey, period), // Display format (e.g., "Nov 13", "Oct 2025")
        sales,
        originalDate: originalDateKey // Keep normalized format for matching (YYYY-MM-DD or YYYY-MM)
      }))
      .sort((a, b) => {
        // Sort by originalDate (normalized format)
        return a.originalDate.localeCompare(b.originalDate);
      });
  };

  // Filter sales data locally from AppContext instead of making separate API calls
  // Sales data now comes from unified dashboard analytics API - no separate filtering needed

  // Unified refresh function that loads all dashboard data at once
  const unifiedRefresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      console.log('🔄 Unified refresh skipped - already refreshing');
      return;
    }

    // Throttle API calls to prevent spam (minimum 2 seconds between calls)
    const now = Date.now();
    if (now - lastRefreshRef.current < 2000) {
      console.log('🔄 Unified refresh throttled - too frequent');
      return;
    }

    isRefreshingRef.current = true;
    lastRefreshRef.current = now;
    console.log('🔄 Unified refresh triggered');

    try {
      // Calculate filter parameters based on current date range
      const now = new Date();
      let filterParams: any = {};
      // Expense dates no longer needed - handled by dashboard metrics API
      
      console.log('🔍 Calculating filter parameters for dateRange:', dateRange);
      
      switch (dateRange) {
        case 'today':
          // Use system timezone to ensure correct "today" calculation
          const todayRange = getTodayRange();
          filterParams = {
            dateRange: 'today',
            startDate: todayRange.start.toISOString(), // Full ISO timestamp for start of day
            endDate: todayRange.end.toISOString() // Full ISO timestamp for end of day
          };
          console.log('🔍 Today filter params:', filterParams);
          break;
        case 'this_month':
          // Use simple date strings for the current month
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth() + 1; // getMonth() returns 0-11, so add 1
          
          filterParams = {
            dateRange: 'this_month',
            startDate: `${year}-${month.toString().padStart(2, '0')}-01`, // YYYY-MM-01 format
            endDate: `${year}-${month.toString().padStart(2, '0')}-31` // YYYY-MM-31 format
          };
          console.log('🔍 This month filter params (simple format):', filterParams);
          break;
        case 'custom':
          if (customStartDate && customEndDate) {
            // Ensure proper date formatting for custom range
            const startDate = new Date(customStartDate);
            const endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999); // End of day
            
            filterParams = {
              dateRange: 'custom',
              startDate: startDate.toISOString(), // Full ISO timestamp for start of custom range
              endDate: endDate.toISOString() // Full ISO timestamp for end of custom range
            };
          } else {
            return; // Don't refresh if custom dates are not set
          }
          break;
        default:
          filterParams = { dateRange: '30d' };
      }

      // Convert dates to standardized YYYY-MM-DD format for backend compatibility
      const startDate = filterParams.startDate ? normalizeDateToYYYYMMDD(filterParams.startDate) : undefined;
      const endDate = filterParams.endDate ? normalizeDateToYYYYMMDD(filterParams.endDate) : undefined;

      // Single API call to get all dashboard data
      try {
        console.log('🔍 Dashboard API Call Debug:', {
          dateRange,
          filterParams,
          customStartDate,
          customEndDate,
          todayDate: new Date().toISOString().split('T')[0],
          startDate,
          endDate,
          apiUrl: `/analytics/dashboard?store_id=${user?.store_id}&dateRange=${filterParams.dateRange}&startDate=${startDate}&endDate=${endDate}`,
          monthRange: dateRange === 'this_month' ? getThisMonthRange() : null
        });

        const metrics = await apiService.getDashboardAnalytics({
          store_id: user?.store_id,
          status: 'all', // Explicitly request all transaction statuses
          dateRange: filterParams.dateRange,
          startDate: startDate,
          endDate: endDate,
        });

        console.log('🔍 API Response Debug:', {
          dateRange,
          startDate,
          endDate,
          totalSales: metrics?.totalSales,
          totalExpenses: metrics?.totalExpenses,
          totalTransactions: metrics?.totalTransactions,
          monthlySales: metrics?.monthlySales,
          monthlyExpenses: metrics?.monthlyExpenses,
          hasSalesByMonth: !!metrics?.salesByMonth,
          salesByMonthLength: metrics?.salesByMonth?.length,
          hasTopProducts: !!metrics?.topProducts,
          topProductsLength: metrics?.topProducts?.length,
          hasExpensesByPeriod: !!metrics?.expensesByPeriod,
          expensesByPeriodLength: metrics?.expensesByPeriod?.length || 0,
          expensesByPeriod: metrics?.expensesByPeriod?.slice(0, 10), // Show first 10
          todayDate: normalizeDateToYYYYMMDD(new Date()),
          expensesByPeriodIncludesToday: metrics?.expensesByPeriod?.some((item: any) => {
            const periodDate = item.period && /^\d{4}-\d{2}-\d{2}$/.test(item.period) 
              ? item.period 
              : normalizeDateToYYYYMMDD(item.period);
            return periodDate === normalizeDateToYYYYMMDD(new Date());
          }),
          todayExpenseFromSeries: metrics?.expensesByPeriod?.find((item: any) => {
            const periodDate = item.period && /^\d{4}-\d{2}-\d{2}$/.test(item.period) 
              ? item.period 
              : normalizeDateToYYYYMMDD(item.period);
            return periodDate === normalizeDateToYYYYMMDD(new Date());
          })
        });

        // Check if expenses are missing and fetch them separately if needed
        let finalMetrics = { ...metrics };
        if (metrics && (metrics.totalExpenses === undefined || metrics.totalExpenses === null)) {
          console.log('🔍 Expenses missing from dashboard metrics, fetching separately...', {
            dateRange,
            startDate,
            endDate,
            filterParams,
            todayDate: new Date().toISOString().split('T')[0]
          });
          try {
            const expensesResponse = await apiService.getExpenses({
              store_id: user?.store_id,
              start_date: startDate,
              end_date: endDate,
              limit: 1000 // Get all expenses for the period
            });
            
            const totalExpenses = expensesResponse.expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
            finalMetrics = {
              ...metrics,
              totalExpenses: totalExpenses,
              monthlyExpenses: totalExpenses
            };
            
            console.log('🔍 Expenses fetched separately:', {
              expenseCount: expensesResponse.expenses.length,
              totalExpenses,
              sampleExpenses: expensesResponse.expenses.slice(0, 3),
              expenseDates: expensesResponse.expenses.map((expense: any) => ({
                date: expense.date,
                amount: expense.amount,
                description: expense.description || expense.product_name
              }))
            });
          } catch (expenseError) {
            console.error('❌ Failed to fetch expenses separately:', expenseError);
          }
        }

        // Additional check: If dateRange is 'today', ensure we only show today's actual expenses
        if (dateRange === 'today') {
          console.log('🔍 Today filter active, checking if expenses are actually from today...', {
            totalExpenses: finalMetrics.totalExpenses,
            expensesVsYesterday: finalMetrics.expensesVsYesterday,
            isShowingYesterdayData: finalMetrics.expensesVsYesterday === -100
          });
          
          // If the comparison shows -100% vs yesterday, it means today's expenses are 0
          // but we might be showing yesterday's data as totalExpenses
          if (finalMetrics.expensesVsYesterday === -100 && finalMetrics.totalExpenses > 0) {
            console.log('🔍 Detected yesterday data being shown as today total, correcting to 0');
            finalMetrics = {
              ...finalMetrics,
              totalExpenses: 0
            };
          }
        }

        setLocalDashboardMetrics(finalMetrics);
        console.log('🔍 Dashboard Metrics Debug (Unified):', {
          totalExpenses: finalMetrics?.totalExpenses,
          monthlyExpenses: finalMetrics?.monthlyExpenses,
          netProfit: finalMetrics?.netProfit,
          totalSales: finalMetrics?.totalSales,
          totalTransactions: finalMetrics?.totalTransactions,
          todaySales: finalMetrics?.todaySales,
          monthlySales: finalMetrics?.monthlySales,
          dateRange,
          filterParams,
          recentTransactions: metrics?.recentTransactions?.length || 0,
          recentTransactionsData: metrics?.recentTransactions?.slice(0, 2), // Log first 2 transactions
          salesByMonth: metrics?.salesByMonth?.length || 0,
          topProducts: metrics?.topProducts?.length || 0,
          apiUrl: `/analytics/dashboard?store_id=${user?.store_id}&startDate=${startDate}&endDate=${endDate}`,
          // Additional debugging for payment method data
          fullMetricsStructure: {
            hasRecentTransactions: !!metrics?.recentTransactions,
            recentTransactionsType: typeof metrics?.recentTransactions,
            recentTransactionsIsArray: Array.isArray(metrics?.recentTransactions),
            firstTransactionStructure: metrics?.recentTransactions?.[0] ? Object.keys(metrics.recentTransactions[0]) : 'No transactions'
          },
          // Specific debugging for expenses
          expenseDebug: {
            totalExpenses: metrics?.totalExpenses,
            monthlyExpenses: metrics?.monthlyExpenses,
            expensesVsYesterday: metrics?.expensesVsYesterday,
            hasExpenseData: metrics?.totalExpenses !== undefined && metrics?.totalExpenses !== null,
            expenseType: typeof metrics?.totalExpenses,
            customStartDate,
            customEndDate,
            // Additional debugging for the fallback issue
            isUsingFallback: finalMetrics !== metrics,
            originalTotalExpenses: metrics?.totalExpenses,
            finalTotalExpenses: finalMetrics?.totalExpenses,
            dateRangeFilter: dateRange,
            startDateFilter: startDate,
            endDateFilter: endDate
          }
        });

        // Update goal progress with the loaded metrics
        if (finalMetrics) {
          updateGoalProgress(finalMetrics, finalMetrics);
        }

        // Fetch full transaction data for payment methods chart and sales chart
        // Include historical context based on the filter
        console.log('🔍 About to fetch full transactions with params:', filterParams);
        const fetchedTransactions = await fetchFullTransactionsForPaymentMethods(filterParams, dateRange);

        // Log what was fetched
        console.warn('💰 SALES FETCH - Transactions fetched from API:', {
          count: fetchedTransactions?.length || 0,
          dateRange,
          transactionsByMonth: fetchedTransactions ? fetchedTransactions.reduce((acc: any, tx: any) => {
            const txDate = new Date(tx.created_at);
            const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push({
              id: tx._id,
              created_at: tx.created_at,
              total_amount: tx.total_amount
            });
            return acc;
          }, {}) : {},
          sampleTransactions: fetchedTransactions?.slice(0, 5).map((tx: any) => ({
            id: tx._id,
            created_at: tx.created_at,
            total_amount: tx.total_amount,
            month: `${new Date(tx.created_at).getFullYear()}-${String(new Date(tx.created_at).getMonth() + 1).padStart(2, '0')}`
          }))
        });

        // Populate filteredSales from API data for chart display
        // Use fetchedTransactions first, then recentTransactions from API, then fullTransactions state
        let transactionsForChart: any[] = [];
        
        if (fetchedTransactions && fetchedTransactions.length > 0) {
          // Use freshly fetched transactions (most complete data)
          transactionsForChart = fetchedTransactions;
          console.warn('✅ Using fetchedTransactions for chart:', {
            count: fetchedTransactions.length,
            dateRange,
            months: Object.keys(fetchedTransactions.reduce((acc: any, tx: any) => {
              const month = `${new Date(tx.created_at).getFullYear()}-${String(new Date(tx.created_at).getMonth() + 1).padStart(2, '0')}`;
              acc[month] = true;
              return acc;
            }, {})).join(', ')
          });
        } else if (finalMetrics?.recentTransactions && finalMetrics.recentTransactions.length > 0) {
          // Convert recentTransactions to the format expected by chart
          transactionsForChart = finalMetrics.recentTransactions.map((tx: any) => ({
            _id: tx.id,
            total_amount: tx.totalAmount || tx.total_amount,
            created_at: tx.createdAt || tx.created_at,
            payment_method: tx.paymentMethod || tx.payment_method,
            payment_methods: tx.paymentMethods || tx.payment_methods,
            order_source: tx.orderSource || tx.order_source,
            status: tx.status || 'completed'
          }));
          console.warn('⚠️ Using recentTransactions for chart (fetchedTransactions empty):', {
            count: transactionsForChart.length,
            dateRange,
            note: 'recentTransactions might only contain current month data'
          });
        } else if (fullTransactions && fullTransactions.length > 0) {
          // Fallback to state (might be from previous fetch)
          transactionsForChart = fullTransactions;
          console.warn('⚠️ Using fullTransactions state for chart (fetchedTransactions and recentTransactions empty):', {
            count: fullTransactions.length,
            dateRange
          });
        }
        
        // Set filteredSales for chart rendering
        console.warn('💰 Setting filteredSales:', {
          count: transactionsForChart.length,
          dateRange,
          months: Object.keys(transactionsForChart.reduce((acc: any, tx: any) => {
            const month = `${new Date(tx.created_at).getFullYear()}-${String(new Date(tx.created_at).getMonth() + 1).padStart(2, '0')}`;
            acc[month] = true;
            return acc;
          }, {})).join(', ')
        });
        setFilteredSales(transactionsForChart);

        // Dashboard metrics are now managed locally - no need to update AppContext

      } catch (error) {
        console.error('❌ Failed to load dashboard metrics:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          dateRange,
          filterParams,
          customStartDate,
          customEndDate
        });
      }

      // Mark initial load as complete
      if (isInitialLoad) {
        console.log('🔍 Setting isInitialLoad to false');
        setIsInitialLoad(false);
      }

    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [dateRange, customStartDate, customEndDate, user?.store_id, isInitialLoad, updateGoalProgress, fetchFullTransactionsForPaymentMethods]);

  // Initial load is handled by usePageRefresh with refreshOnMount: true

  // Use unified refresh for all refresh operations
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Temporarily disable auto-refresh to debug the issue
  // TODO: Re-enable after confirming manual refresh works correctly
  // usePageRefresh({
  //   refreshOnMount: false, // Disabled since we have manual initial load
  //   refreshOnFocus: false, // Disabled to prevent excessive calls on focus
  //   refreshInterval: refreshInterval, // 2 minutes for today, 5 minutes for others
  //   refreshOnVisibilityChange: false, // Disabled to prevent excessive calls on visibility change
  //   refreshFunction: unifiedRefresh, // Use our unified refresh function
  //   silent: true
  // });

  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Filter changes are now handled by unified refresh

  // Initial load on mount
  useEffect(() => {
    unifiedRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Filter changes trigger unified refresh with debounce
  // Remove unifiedRefresh from dependencies to prevent infinite loop
  useEffect(() => {
    console.log('🔍 Filter useEffect triggered:', {
      dateRange,
      customStartDate,
      customEndDate,
      isInitialLoad
    });
    
    // Skip initial load to prevent duplicate calls
    if (isInitialLoad) {
      console.log('🔍 Skipping filter change - still in initial load');
      return;
    }
    
    console.log('🔍 Filter change detected, scheduling refresh:', {
      dateRange,
      customStartDate,
      customEndDate,
      isInitialLoad
    });
    
    const timeoutId = setTimeout(() => {
      console.log('🔍 Triggering unified refresh due to filter change');
      unifiedRefresh();
    }, 500); // 500ms debounce to prevent API spam

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, customStartDate, customEndDate]); // Removed unifiedRefresh from dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Use local dashboard metrics when available, otherwise use smart metrics
  const currentDashboardMetrics = localDashboardMetrics || dashboardMetrics;
  
  // Debug: Log metrics only when the signature actually changes to avoid spam
  const lastMetricsSignatureRef = useRef<string>('');
  useEffect(() => {
    const signature = JSON.stringify({
      hasLocal: !!localDashboardMetrics,
      hasRemote: !!dashboardMetrics,
      totalSales: currentDashboardMetrics?.totalSales ?? null,
      totalExpenses: currentDashboardMetrics?.totalExpenses ?? null,
      keys: currentDashboardMetrics ? Object.keys(currentDashboardMetrics) : []
    });

    if (signature !== lastMetricsSignatureRef.current) {
      lastMetricsSignatureRef.current = signature;
      console.log('🔍 Dashboard - Current Metrics:', {
        hasLocalMetrics: !!localDashboardMetrics,
        hasDashboardMetrics: !!dashboardMetrics,
        paymentMethods: currentDashboardMetrics?.paymentMethods,
        totalSales: currentDashboardMetrics?.totalSales,
        metricsKeys: currentDashboardMetrics ? Object.keys(currentDashboardMetrics) : []
      });
    }
  }, [localDashboardMetrics, dashboardMetrics, currentDashboardMetrics?.totalSales, currentDashboardMetrics?.totalExpenses]);

  // Debug timezone information
  useEffect(() => {
    debugTimezoneInfo();
  }, []);

  // State for expense data
  const [expenseData, setExpenseData] = useState<any[]>([]);
  // Ref to store series expense data for merging (avoids React closure issues)
  const seriesExpenseDataRef = useRef<any[]>([]);

  // Fetch expense data when filters change
  useEffect(() => {
    // Determine chart period to know how to group expenses
    const chartPeriod = dateRange === 'today' ? 'daily' 
      : dateRange === 'this_month' ? 'monthly' 
      : (dateRange === 'custom' && customStartDate && customEndDate) 
        ? (() => {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate);
            const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 30) return 'daily';
            if (daysDiff <= 90) return 'weekly';
            return 'monthly';
          })()
        : 'daily';
    
    // Prefer backend-provided series if available
    // Backend now returns expensesByPeriod with timezone-aware dates in YYYY-MM-DD format (daily) or YYYY-MM (monthly)
    const seriesFromMetrics = (currentDashboardMetrics as any)?.expensesByPeriod;
    
    console.log('🔍 Checking expensesByPeriod from backend:', {
      hasSeries: !!seriesFromMetrics,
      isArray: Array.isArray(seriesFromMetrics),
      length: seriesFromMetrics?.length || 0,
      sample: seriesFromMetrics?.slice(0, 5),
      chartPeriod,
      dateRange,
      note: 'Checking if backend provides expense series data'
    });
    
    if (Array.isArray(seriesFromMetrics) && seriesFromMetrics.length > 0) {
      console.log('🔍 Using backend expensesByPeriod (timezone-aware):', {
        count: seriesFromMetrics.length,
        sample: seriesFromMetrics.slice(0, 5),
        allPeriods: seriesFromMetrics.map((item: any) => item.period),
        chartPeriod,
        note: 'Backend returns dates in YYYY-MM-DD format (daily) or YYYY-MM (monthly) in local timezone (Europe/Nicosia)'
      });
      
      const mapped = seriesFromMetrics.map((item: any) => {
        // Backend provides dates in YYYY-MM-DD format (daily) or YYYY-MM (monthly) in local timezone
        let normalizedDate: string;
        
        if (chartPeriod === 'monthly') {
          // For monthly, backend should provide YYYY-MM format
          // But handle both YYYY-MM and YYYY-MM-DD formats
          if (/^\d{4}-\d{2}$/.test(item.period)) {
            normalizedDate = item.period; // Already in YYYY-MM format
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(item.period)) {
            // If backend provides YYYY-MM-DD, extract YYYY-MM
            normalizedDate = item.period.substring(0, 7);
          } else {
            // Parse and extract month
            const date = new Date(item.period);
            normalizedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          }
        } else {
          // For daily, backend should provide YYYY-MM-DD format
          normalizedDate = item.period && /^\d{4}-\d{2}-\d{2}$/.test(item.period) 
            ? item.period  // Already in correct format from backend
            : normalizeDateToYYYYMMDD(item.period); // Fallback normalization if needed
        }
        
        return {
          day: normalizedDate, // YYYY-MM-DD (daily) or YYYY-MM (monthly) format from backend
          originalDate: normalizedDate, // Same as day - ensure consistent format
          expenses: item.amount || 0
        };
      });
      
      console.log('🔍 Mapped expense data from backend:', {
        mapped: mapped.slice(0, 5),
        chartPeriod,
        note: 'Mapped expenses with period-specific format'
      });
      
      // Store series data for merging later (don't set state yet)
      seriesExpenseDataRef.current = mapped;
      
      // IMPORTANT: Even if we have expensesByPeriod, we still need to fetch individual expenses
      // because expensesByPeriod might only cover the filtered period, but the chart needs
      // historical data (e.g., last 30 days for "today" filter, last 12 months for "this_month")
      // We'll merge both sources, with individual expenses supplementing the series
      // NOTE: For accuracy, we prioritize individual expenses over backend series data
      console.log('🔍 expensesByPeriod found, but also fetching individual expenses for full historical context...');
      console.log('⚠️ IMPORTANT: Individual expenses will take precedence over backend series data to ensure accuracy');
    } else {
      console.log('🔍 No expensesByPeriod from backend, fetching individual expenses...');
      seriesExpenseDataRef.current = [];
    }

    const fetchExpenseData = async () => {
      if (!user?.store_id) return;

        try {
          // Calculate date range for expenses - fetch historical data for chart context
          const now = new Date();
          let startDate: string;
          let endDate: string;

          // Fetch historical data for context based on filter
          if (dateRange === 'today') {
          // For "today" filter, fetch last 30 days for daily trend context
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          startDate = normalizeDateToYYYYMMDD(thirtyDaysAgo);
          endDate = normalizeDateToYYYYMMDD(now);
          } else if (dateRange === 'this_month') {
          // For "this_month" filter, fetch last 12 months for monthly trend context
          const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
          startDate = normalizeDateToYYYYMMDD(twelveMonthsAgo);
          endDate = normalizeDateToYYYYMMDD(now);
          } else if (dateRange === 'custom' && customStartDate && customEndDate) {
            // For custom range, extend by 30% for context
            const startDateObj = new Date(customStartDate);
            const endDateObj = new Date(customEndDate);
            const daysDiff = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
            const contextDays = Math.max(7, Math.floor(daysDiff * 0.3));
            
            const contextStart = new Date(startDateObj);
            contextStart.setDate(contextStart.getDate() - contextDays);
            startDate = normalizeDateToYYYYMMDD(contextStart);
            endDate = normalizeDateToYYYYMMDD(endDateObj);
          } else {
            // Fallback to last 30 days
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            startDate = normalizeDateToYYYYMMDD(thirtyDaysAgo);
            endDate = normalizeDateToYYYYMMDD(now);
          }

        console.log('🔍 Fetching expense data for chart (fallback, no series in metrics):', {
          store_id: user.store_id,
          startDate,
          endDate,
          dateRange,
          note: 'Fetching expenses with date filtering to match current date range'
        });

        // Fetch expenses with date filtering to match the current date range
        const expensesResponse = await apiService.getExpenses({
          store_id: user.store_id,
          start_date: startDate,
          end_date: endDate,
          limit: 1000
        });

        console.log('🔍 Expense API Response - DETAILED:', {
          totalExpenses: expensesResponse.expenses.length,
          dateRange: {
            startDate,
            endDate,
            chartPeriod
          },
          allExpenses: expensesResponse.expenses.map((e: any) => ({
            id: e._id,
            date: e.date,
            amount: e.amount,
            product_name: e.product_name,
            category: e.category,
            normalizedDate: normalizeDateToYYYYMMDD(e.date),
            monthKey: chartPeriod === 'monthly' ? `${new Date(e.date).getFullYear()}-${String(new Date(e.date).getMonth() + 1).padStart(2, '0')}` : normalizeDateToYYYYMMDD(e.date)
          })),
          totalAmount: expensesResponse.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0),
          expenseDatesDebug: expensesResponse.expenses.slice(0, 10).map((e: any) => ({
            original: e.date,
            type: typeof e.date,
            parsed: new Date(e.date),
            normalized: normalizeDateToYYYYMMDD(e.date),
            localYear: new Date(e.date).getFullYear(),
            localMonth: new Date(e.date).getMonth() + 1,
            localDay: new Date(e.date).getDate(),
            utcYear: new Date(e.date).getUTCFullYear(),
            utcMonth: new Date(e.date).getUTCMonth() + 1,
            utcDay: new Date(e.date).getUTCDate(),
            amount: e.amount
          }))
        });

        // Group expenses by day
        console.log('🔍 Processing expenses for chart:', {
          totalExpenses: expensesResponse.expenses.length,
          expenseDates: expensesResponse.expenses.map(e => e.date).slice(0, 5), // Show first 5 dates
          expenseAmounts: expensesResponse.expenses.map(e => e.amount).slice(0, 5) // Show first 5 amounts
        });

        // Group expenses by period (day or month) based on chartPeriod
        // Backend now uses timezone-aware date operations, so expense.date should be in YYYY-MM-DD format
        // or we need to parse it correctly if it's still an ISO timestamp
        const groupedExpenses = expensesResponse.expenses.reduce((acc: any, expense: any) => {
          let periodKey: string;
          
          // Parse expense date
          let expenseDate: Date;
          if (typeof expense.date === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(expense.date)) {
              expenseDate = new Date(expense.date + 'T00:00:00'); // Add time to avoid UTC conversion issues
            } else if (expense.date.includes('T')) {
              expenseDate = new Date(expense.date);
            } else {
              expenseDate = new Date(expense.date);
            }
          } else {
            expenseDate = new Date(expense.date);
          }
          
          // Group by period based on chartPeriod
          if (chartPeriod === 'monthly') {
            // Group by month (YYYY-MM format)
            const year = expenseDate.getFullYear();
            const month = String(expenseDate.getMonth() + 1).padStart(2, '0');
            periodKey = `${year}-${month}`;
          } else {
            // Group by day (YYYY-MM-DD format)
            const year = expenseDate.getFullYear();
            const month = String(expenseDate.getMonth() + 1).padStart(2, '0');
            const day = String(expenseDate.getDate()).padStart(2, '0');
            periodKey = `${year}-${month}-${day}`;
          }
          
          if (!acc[periodKey]) {
            acc[periodKey] = { day: periodKey, expenses: 0 };
          }
          acc[periodKey].expenses += expense.amount || 0;
          
          return acc;
        }, {} as Record<string, { day: string; expenses: number }>);

        // Convert expense data - use standardized format for matching
        const fetchedExpenseData = (Object.values(groupedExpenses) as { day: string; expenses: number }[]).map(expenseItem => ({
          day: expenseItem.day, // YYYY-MM-DD (daily) or YYYY-MM (monthly) format for matching
          originalDate: expenseItem.day, // Same as day (normalized format)
          expenses: expenseItem.expenses
        }));
        
        console.log('🔍 Fetched individual expense data:', {
          groupedExpenses,
          fetchedExpenseData,
          totalPeriods: fetchedExpenseData.length,
          chartPeriod,
          sampleExpenses: fetchedExpenseData.slice(0, 5),
          note: chartPeriod === 'monthly' ? 'Grouped by month (YYYY-MM)' : 'Grouped by day (YYYY-MM-DD)'
        });

        // Merge with expensesByPeriod if it was set earlier
        // Individual expenses are more accurate and include full historical range
        const seriesExpenseData = seriesExpenseDataRef.current || [];
        const mergedExpenseMap = new Map<string, { day: string; originalDate: string; expenses: number }>();
        
        console.log('🔍 EXPENSE MERGING DEBUG:', {
          fromBackendSeries: seriesExpenseData.length,
          fromIndividualFetch: fetchedExpenseData.length,
          backendSeriesData: seriesExpenseData.map((item: any) => ({
            period: item.originalDate || item.day,
            amount: item.expenses
          })),
          individualExpenseData: fetchedExpenseData.map((item: any) => ({
            period: item.originalDate || item.day,
            amount: item.expenses
          })),
          note: 'Checking for potential double-counting or incorrect aggregation'
        });
        
        // CRITICAL: For accuracy, we ONLY use individual expenses when they're available
        // Backend series data may contain incorrect aggregations or timezone issues
        // Individual expenses are the source of truth
        if (fetchedExpenseData.length > 0) {
          console.log('✅ Using ONLY individual expenses (source of truth) - ignoring backend series data');
          // Use only individual expenses
          fetchedExpenseData.forEach(item => {
            const key = item.originalDate || item.day;
            mergedExpenseMap.set(key, {
              day: item.day,
              originalDate: item.originalDate,
              expenses: item.expenses
            });
          });
        } else {
          // Fallback to backend series data only if no individual expenses available
          console.log('⚠️ No individual expenses found, falling back to backend series data');
          seriesExpenseData.forEach(item => {
            const key = item.originalDate || item.day;
            mergedExpenseMap.set(key, item);
          });
        }
        
        const finalExpenseData = Array.from(mergedExpenseMap.values()).sort((a, b) => {
          const dateA = new Date(a.originalDate || a.day);
          const dateB = new Date(b.originalDate || b.day);
          return dateA.getTime() - dateB.getTime();
        });
        
        // CRITICAL: Log expense breakdown for verification
        console.log('🔍 Final merged expense data for chart:', {
          fromSeries: seriesExpenseData.length,
          fromIndividual: fetchedExpenseData.length,
          merged: finalExpenseData.length,
          allExpensesByPeriod: finalExpenseData.map((item: any) => ({
            period: item.originalDate || item.day,
            amount: item.expenses,
            display: item.day
          })),
          totalExpenseAmount: finalExpenseData.reduce((sum: number, item: any) => sum + (item.expenses || 0), 0),
          sampleExpenses: finalExpenseData.slice(0, 5),
          todayDate: normalizeDateToYYYYMMDD(new Date()),
          hasToday: finalExpenseData.some(e => (e.originalDate || e.day) === normalizeDateToYYYYMMDD(new Date())),
          todayExpense: finalExpenseData.find(e => (e.originalDate || e.day) === normalizeDateToYYYYMMDD(new Date())),
          note: 'This is the final expense data that will be displayed in the chart'
        });
        
        // Also log to console.warn so it's not suppressed
        console.warn('💰 EXPENSE VERIFICATION - Monthly Totals:', 
          finalExpenseData.map((item: any) => `${item.day || item.originalDate}: ₺${item.expenses.toLocaleString()}`).join(', ')
        );
        
        // Log individual expenses that contributed to each month
        if (expensesResponse?.expenses) {
          const expensesByMonth = expensesResponse.expenses.reduce((acc: any, expense: any) => {
            const expenseDate = new Date(expense.date);
            const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push({
              id: expense._id,
              date: expense.date,
              amount: expense.amount,
              product_name: expense.product_name,
              category: expense.category
            });
            return acc;
          }, {});
          
          // Calculate monthly totals
          const monthlyTotals = Object.keys(expensesByMonth).map(month => {
            const expenses = expensesByMonth[month];
            const total = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
            return {
              month,
              total,
              count: expenses.length,
              expenses: expenses
            };
          });
          
          console.warn('💰 EXPENSE VERIFICATION - Individual Expenses by Month:', expensesByMonth);
          console.warn('💰 EXPENSE VERIFICATION - Monthly Totals Breakdown:', monthlyTotals);
          console.warn('💰 EXPENSE VERIFICATION - Summary:', {
            totalExpenses: expensesResponse.expenses.length,
            totalAmount: expensesResponse.expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0),
            monthlyBreakdown: monthlyTotals.map(m => `${m.month}: ₺${m.total.toLocaleString()} (${m.count} expenses)`)
          });
        }

        setExpenseData(finalExpenseData);
      } catch (error) {
        console.error('Failed to fetch expense data for chart:', error);
        setExpenseData([]);
      }
    };

    fetchExpenseData();
  }, [user?.store_id, dateRange, customStartDate, customEndDate, (currentDashboardMetrics as any)?.expensesByPeriod]);

  // Auto-determine chart period based on dateRange filter
  const getChartPeriod = useMemo(() => {
    if (dateRange === 'today') {
      return 'daily'; // Show daily data for today filter
    } else if (dateRange === 'this_month') {
      return 'monthly'; // Show monthly data for this_month filter
    } else if (dateRange === 'custom' && customStartDate && customEndDate) {
      // Determine based on date range span
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 30) {
        return 'daily'; // Show daily for short custom ranges
      } else if (daysDiff <= 90) {
        return 'weekly'; // Show weekly for medium ranges
      } else {
        return 'monthly'; // Show monthly for long ranges
      }
    }
    return 'daily'; // Default
  }, [dateRange, customStartDate, customEndDate]);

  // Use filtered sales data for charts - automatically shows historical context based on filter
  const salesData = useMemo(() => {
    let rawData: any[] = [];
    let transactionsToUse: any[] = [];

    // Debug: Check if salesByMonth or salesByPeriod is available
    console.warn('💰 SALES DATA SOURCE CHECK:', {
      chartPeriod: getChartPeriod,
      hasSalesByMonth: !!currentDashboardMetrics?.salesByMonth,
      salesByMonthLength: currentDashboardMetrics?.salesByMonth?.length || 0,
      hasSalesByPeriod: !!currentDashboardMetrics?.salesByPeriod,
      salesByPeriodLength: currentDashboardMetrics?.salesByPeriod?.length || 0,
      salesByMonth: currentDashboardMetrics?.salesByMonth,
      salesByPeriod: currentDashboardMetrics?.salesByPeriod,
      hasFilteredSales: !!filteredSales,
      filteredSalesLength: filteredSales?.length || 0,
      hasRecentTransactions: !!currentDashboardMetrics?.recentTransactions,
      recentTransactionsLength: currentDashboardMetrics?.recentTransactions?.length || 0,
      recentTransactionsSample: currentDashboardMetrics?.recentTransactions?.slice(0, 2)
    });

    // For daily/weekly charts, prefer salesByPeriod from API if available (has historical data)
    // BUT only if it has valid non-zero amounts, otherwise fall back to transactions
    const hasValidSalesByPeriod = currentDashboardMetrics?.salesByPeriod && 
      currentDashboardMetrics.salesByPeriod.length > 0 &&
      currentDashboardMetrics.salesByPeriod.some((item: any) => item && item.period && (item.amount || 0) > 0);
    
    if ((getChartPeriod === 'daily' || getChartPeriod === 'weekly') && hasValidSalesByPeriod) {
      console.warn('💰 Using salesByPeriod from API for daily/weekly chart (preferred over transactions):', {
        salesByPeriod: currentDashboardMetrics.salesByPeriod,
        count: currentDashboardMetrics.salesByPeriod.length,
        periods: currentDashboardMetrics.salesByPeriod
          .filter((item: any) => item && item.period)
          .map((item: any) => item.period)
          .slice(0, 5)
          .join(', ')
      });
      
      // Convert salesByPeriod to the format expected by the chart
      // Filter out any null/undefined items and ensure all required fields exist
      rawData = currentDashboardMetrics.salesByPeriod
        .filter((item: any) => item && item.period) // Filter out null/undefined items
        .map((item: any) => ({
          day: item.period, // Should be in YYYY-MM-DD format for daily
          sales: item.amount || 0, // Default to 0 if amount is undefined
          created_at: item.period,
          originalDate: item.period
        }));
      
      console.warn('💰 SALES VERIFICATION - Using salesByPeriod from API:', 
        currentDashboardMetrics.salesByPeriod
          .filter((item: any) => item && item.period) // Filter out null/undefined items
          .map((item: any) => `${item.period}: ₺${(item.amount || 0).toLocaleString()}`)
          .slice(0, 5)
          .join(', ') + 
        (currentDashboardMetrics.salesByPeriod.length > 5 ? ` ... (${currentDashboardMetrics.salesByPeriod.length} total)` : '')
      );
    } else if ((getChartPeriod === 'daily' || getChartPeriod === 'weekly') && currentDashboardMetrics?.salesByPeriod && currentDashboardMetrics.salesByPeriod.length > 0) {
      // salesByPeriod exists but all amounts are zero - fall back to transactions
      console.warn('⚠️ salesByPeriod from API has all zero amounts, falling back to transaction data:', {
        salesByPeriod: currentDashboardMetrics.salesByPeriod,
        periods: currentDashboardMetrics.salesByPeriod.map((item: any) => `${item.period}: ₺${(item.amount || 0).toLocaleString()}`).join(', '),
        willUseTransactions: true
      });
      // Populate transactionsToUse here so it can be processed
      if (filteredSales && filteredSales.length > 0) {
        transactionsToUse = filteredSales;
        console.log('🔍 Using filteredSales for chart (salesByPeriod had zeros):', {
          count: filteredSales.length,
          dateRange,
          chartPeriod: getChartPeriod
        });
      } else if (fullTransactions && fullTransactions.length > 0) {
        transactionsToUse = fullTransactions;
        console.log('🔍 Using fullTransactions for chart (salesByPeriod had zeros, filteredSales empty):', {
          count: fullTransactions.length,
          dateRange,
          chartPeriod: getChartPeriod
        });
      } else if (currentDashboardMetrics?.recentTransactions && Array.isArray(currentDashboardMetrics.recentTransactions) && currentDashboardMetrics.recentTransactions.length > 0) {
        // Convert recentTransactions format to match expected structure
        transactionsToUse = currentDashboardMetrics.recentTransactions.map((tx: any) => ({
          _id: tx.id || tx._id,
          total_amount: tx.totalAmount || tx.total_amount || 0,
          created_at: tx.createdAt || tx.created_at || tx.createdAt,
          payment_method: tx.paymentMethod || tx.payment_method,
          payment_methods: tx.paymentMethods || tx.payment_methods,
          order_source: tx.orderSource || tx.order_source,
          status: tx.status || 'completed',
          items: tx.items || []
        }));
        console.log('🔍 Using recentTransactions for chart (salesByPeriod had zeros, filteredSales and fullTransactions empty):', {
          count: transactionsToUse.length,
          dateRange,
          chartPeriod: getChartPeriod
        });
      }
    } else if (getChartPeriod === 'monthly' && currentDashboardMetrics?.salesByMonth && currentDashboardMetrics.salesByMonth.length > 0) {
      // For monthly charts, prefer salesByMonth from API if available (has historical data)
      console.warn('💰 Using salesByMonth from API for monthly chart (preferred over transactions):', {
        salesByMonth: currentDashboardMetrics.salesByMonth,
        count: currentDashboardMetrics.salesByMonth.length,
        months: currentDashboardMetrics.salesByMonth.map((item: any) => item.month).join(', ')
      });
      
      // Convert salesByMonth to the format expected by the chart
      rawData = currentDashboardMetrics.salesByMonth.map((item: any) => ({
        day: item.month, // Should be in YYYY-MM format
        sales: item.sales,
        created_at: item.month,
        originalDate: item.month
      }));
      
      console.warn('💰 SALES VERIFICATION - Using salesByMonth from API:', 
        currentDashboardMetrics.salesByMonth.map((item: any) => `${item.month}: ₺${item.sales.toLocaleString()} (${item.transactions} transactions)`).join(', ')
      );
    } else {
      // Get transactions data - prefer filteredSales, fallback to fullTransactions or recentTransactions
      if (filteredSales && filteredSales.length > 0) {
        transactionsToUse = filteredSales;
        console.log('🔍 Using filteredSales for chart:', {
          count: filteredSales.length,
          dateRange,
          chartPeriod: getChartPeriod
        });
      } else if (fullTransactions && fullTransactions.length > 0) {
        transactionsToUse = fullTransactions;
        console.log('🔍 Using fullTransactions for chart (filteredSales empty):', {
          count: fullTransactions.length,
          dateRange,
          chartPeriod: getChartPeriod
        });
      } else if (currentDashboardMetrics?.recentTransactions && Array.isArray(currentDashboardMetrics.recentTransactions) && currentDashboardMetrics.recentTransactions.length > 0) {
        // Convert recentTransactions format to match expected structure
        transactionsToUse = currentDashboardMetrics.recentTransactions.map((tx: any) => ({
          _id: tx.id || tx._id,
          total_amount: tx.totalAmount || tx.total_amount || 0,
          created_at: tx.createdAt || tx.created_at || tx.createdAt,
          payment_method: tx.paymentMethod || tx.payment_method,
          payment_methods: tx.paymentMethods || tx.payment_methods,
          order_source: tx.orderSource || tx.order_source,
          status: tx.status || 'completed',
          items: tx.items || [] // Include items for product aggregation
        }));
        console.log('🔍 Using recentTransactions for chart (filteredSales and fullTransactions empty):', {
          count: transactionsToUse.length,
          dateRange,
          chartPeriod: getChartPeriod,
          sampleTransaction: transactionsToUse[0] ? {
            id: transactionsToUse[0]._id,
            total_amount: transactionsToUse[0].total_amount,
            created_at: transactionsToUse[0].created_at
          } : null
        });
      } else {
        console.warn('⚠️ No transactions available for chart:', {
          hasFilteredSales: !!filteredSales,
          filteredSalesLength: filteredSales?.length || 0,
          hasFullTransactions: !!fullTransactions,
          fullTransactionsLength: fullTransactions?.length || 0,
          hasRecentTransactions: !!currentDashboardMetrics?.recentTransactions,
          recentTransactionsLength: currentDashboardMetrics?.recentTransactions?.length || 0,
          hasSalesByMonth: !!currentDashboardMetrics?.salesByMonth,
          salesByMonthLength: currentDashboardMetrics?.salesByMonth?.length || 0,
          dateRange,
          chartPeriod: getChartPeriod
        });
      }
    }

    // Determine chart period and data structure based on dateRange
    const chartPeriod = getChartPeriod;

    // Debug: Log the state before processing
    console.warn('💰 SALES DATA PROCESSING - Before aggregation:', {
      rawDataLength: rawData.length,
      transactionsToUseLength: transactionsToUse.length,
      chartPeriod,
      hasRawData: rawData.length > 0,
      hasTransactions: transactionsToUse.length > 0
    });

    // If rawData was already set from salesByMonth or salesByPeriod, skip transaction processing
    if (rawData.length > 0) {
      // rawData already populated from salesByMonth or valid salesByPeriod, proceed to aggregation
      console.log('💰 Using pre-aggregated data (salesByMonth or salesByPeriod), skipping transaction processing');
    } else if (transactionsToUse.length > 0) {
      // Always use transaction data for aggregation to ensure we have full historical context
      console.log('🔍 Processing transactions for chart:', {
        chartPeriod,
        transactionCount: transactionsToUse.length,
        sampleTransactions: transactionsToUse.slice(0, 3).map((tx: any) => ({
          id: tx._id,
          total_amount: tx.total_amount,
          created_at: tx.created_at,
          created_at_type: typeof tx.created_at
        }))
      });
      
      if (chartPeriod === 'monthly') {
        // For monthly view (this_month filter), group transactions by month
        const monthlySales = transactionsToUse.reduce((acc, sale) => {
          // Parse date correctly - handle both ISO strings and Date objects
          let saleDate: Date;
          if (typeof sale.created_at === 'string') {
            saleDate = new Date(sale.created_at);
          } else {
            saleDate = sale.created_at;
          }
          
          // Use local timezone components to avoid UTC conversion issues
          const year = saleDate.getFullYear();
          const month = String(saleDate.getMonth() + 1).padStart(2, '0');
          const monthKey = `${year}-${month}`; // YYYY-MM format

          if (!acc[monthKey]) {
            acc[monthKey] = { day: monthKey, sales: 0 };
          }
          acc[monthKey].sales += sale.total_amount || 0;

          return acc;
        }, {} as Record<string, { day: string; sales: number }>);

        // Group transactions by month for verification
        const transactionsByMonth = transactionsToUse.reduce((acc: any, tx: any) => {
          const txDate = new Date(tx.created_at);
          const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
          if (!acc[monthKey]) acc[monthKey] = [];
          acc[monthKey].push({
            id: tx._id,
            created_at: tx.created_at,
            total_amount: tx.total_amount
          });
          return acc;
        }, {});
        
        console.log('🔍 Monthly sales aggregation:', {
          monthlySalesKeys: Object.keys(monthlySales),
          monthlySalesValues: Object.values(monthlySales).map((item: any) => ({
            month: item.day,
            sales: item.sales
          })),
          totalMonths: Object.keys(monthlySales).length,
          transactionsByMonth: Object.keys(transactionsByMonth).map(month => ({
            month,
            transactionCount: transactionsByMonth[month].length,
            totalSales: transactionsByMonth[month].reduce((sum: number, tx: any) => sum + (tx.total_amount || 0), 0),
            transactions: transactionsByMonth[month]
          }))
        });
        
        // Also log to console.warn so it's visible
        console.warn('💰 SALES VERIFICATION - Monthly Totals:', 
          Object.keys(transactionsByMonth).map(month => {
            const total = transactionsByMonth[month].reduce((sum: number, tx: any) => sum + (tx.total_amount || 0), 0);
            return `${month}: ₺${total.toLocaleString()} (${transactionsByMonth[month].length} transactions)`;
          }).join(', ')
        );
        
        console.warn('💰 SALES VERIFICATION - Transactions by Month:', transactionsByMonth);

        rawData = (Object.values(monthlySales) as { day: string; sales: number }[]).map((item) => ({
          day: item.day, // YYYY-MM format for monthly
          sales: item.sales,
          created_at: item.day
        }));
      } else {
        // For daily/weekly view (today or custom filters), group transactions by day
        console.warn('💰 DAILY SALES AGGREGATION - Processing transactions:', {
          transactionCount: transactionsToUse.length,
          chartPeriod,
          dateRange,
          sampleTransactions: transactionsToUse.slice(0, 5).map((tx: any) => ({
            id: tx._id,
            created_at: tx.created_at,
            total_amount: tx.total_amount,
            normalizedDate: normalizeDateToYYYYMMDD(tx.created_at)
          }))
        });
        
        const dailySales = transactionsToUse.reduce((acc, sale) => {
          const dayKey = normalizeDateToYYYYMMDD(sale.created_at);
          
          // Debug: Log date conversion for first few transactions
          if (Object.keys(acc).length < 3) {
            console.warn('💰 DATE NORMALIZATION DEBUG:', {
              originalDate: sale.created_at,
              normalizedDate: dayKey,
              totalAmount: sale.total_amount,
              transactionId: sale._id
            });
          }

          if (!acc[dayKey]) {
            acc[dayKey] = { day: dayKey, sales: 0, transactionCount: 0 };
          }
          acc[dayKey].sales += sale.total_amount || 0;
          acc[dayKey].transactionCount += 1;

          return acc;
        }, {} as Record<string, { day: string; sales: number; transactionCount: number }>);

        console.warn('💰 DAILY SALES AGGREGATION - Grouped by day:', {
          dailySalesKeys: Object.keys(dailySales),
          dailySalesValues: Object.values(dailySales).map((item: any) => ({
            day: item.day,
            sales: item.sales,
            transactionCount: item.transactionCount
          })),
          totalDays: Object.keys(dailySales).length
        });

        rawData = (Object.values(dailySales) as { day: string; sales: number; transactionCount: number }[]).map((item) => ({
          day: item.day, // YYYY-MM-DD format for daily
          sales: item.sales,
          created_at: item.day,
          originalDate: item.day // Store normalized date for matching with expenses
        }));
      }
    } else if (rawData.length === 0) {
      // No transactions available and no salesByMonth fallback - return empty (will show "no data" message)
      console.warn('⚠️ No sales data available - returning empty chart data');
      return [];
    }

    if (rawData.length === 0) return [];

    // Sort raw data by date
    rawData.sort((a, b) => {
      const dateAStr = a.day || a.originalDate;
      const dateBStr = b.day || b.originalDate;
      
      // For monthly (YYYY-MM format), use string comparison
      // For daily/weekly (YYYY-MM-DD format), use Date comparison
      if (chartPeriod === 'monthly') {
        return dateAStr.localeCompare(dateBStr);
      } else {
        const dateA = new Date(dateAStr);
        const dateB = new Date(dateBStr);
        return dateA.getTime() - dateB.getTime();
      }
    });

    // Apply aggregation based on determined period
    // Note: For monthly, rawData is already grouped by month (YYYY-MM), so we just need to format for display
    let aggregatedData: any[];
    if (chartPeriod === 'monthly') {
      // Already grouped by month, just format for display
      aggregatedData = rawData.map(item => ({
        day: formatDateForChart(item.day, 'monthly'), // Display format: "Oct 2025"
        sales: item.sales,
        originalDate: item.day // Keep YYYY-MM format for matching
      }));
      
      console.log('🔍 Monthly aggregated sales data:', {
        count: aggregatedData.length,
        data: aggregatedData.map((item: any) => ({
          display: item.day,
          originalDate: item.originalDate,
          sales: item.sales
        }))
      });
    } else {
      // For daily/weekly, use aggregateDataByPeriod
      aggregatedData = aggregateDataByPeriod(rawData, chartPeriod);
    }

    // Merge with expense data
    console.log('🔍 Merging sales and expense data:', {
      chartPeriod,
      aggregatedData: aggregatedData.slice(0, 3), // Show first 3 items
      expenseData: expenseData.slice(0, 3), // Show first 3 items
      salesDataLength: aggregatedData.length,
      expenseDataLength: expenseData.length
    });

    const mergedData = aggregatedData.map(salesItem => {
      // Find matching expense data using period-appropriate comparison
      const salesOriginalDate = (salesItem as any).originalDate || salesItem.day;
      const matchingExpense = expenseData.find(expenseItem => {
        const expenseOriginalDate = expenseItem.originalDate || expenseItem.day;
        // For monthly, compare YYYY-MM format directly
        // Handle both YYYY-MM and YYYY-MM-DD formats for expenses
        if (chartPeriod === 'monthly') {
          // Sales should be in YYYY-MM format
          // Expenses might be in YYYY-MM or YYYY-MM-DD format
          const expenseMonth = expenseOriginalDate.length === 7 
            ? expenseOriginalDate  // Already YYYY-MM
            : expenseOriginalDate.substring(0, 7); // Extract YYYY-MM from YYYY-MM-DD
          return salesOriginalDate === expenseMonth;
        } else {
          // Both should be in YYYY-MM-DD format
          return normalizeDateToYYYYMMDD(salesOriginalDate) === normalizeDateToYYYYMMDD(expenseOriginalDate);
        }
      });
      
      // Always use 0 if no matching expense found - never carry over previous day's data
      // Only use matchingExpense.expenses if an exact match is found for this period
      const result = {
        ...salesItem,
        expenses: matchingExpense ? (matchingExpense.expenses || 0) : 0
      };
      
      if (matchingExpense) {
        console.log('🔍 Found matching expense for', salesItem.day, ':', {
          salesOriginalDate,
          expenseOriginalDate: normalizeDateToYYYYMMDD(matchingExpense.originalDate || matchingExpense.day),
          expenseAmount: matchingExpense.expenses
        });
      } else {
        console.log('🔍 No matching expense for', salesItem.day, '- using 0 (not carrying over previous day data)');
      }
      
      return result;
    });

    console.log('🔍 Merged data sample:', mergedData.slice(0, 5));

    // If we have expense data for periods not in sales data, add them
    expenseData.forEach(expenseItem => {
      const expenseOriginalDate = expenseItem.originalDate || expenseItem.day;
      const hasMatchingSales = mergedData.some(salesItem => {
        const salesOriginalDate = (salesItem as any).originalDate || salesItem.day;
        // For monthly, compare YYYY-MM format directly
        // Handle both YYYY-MM and YYYY-MM-DD formats for expenses
        if (chartPeriod === 'monthly') {
          // Sales should be in YYYY-MM format
          // Expenses might be in YYYY-MM or YYYY-MM-DD format
          const expenseMonth = expenseOriginalDate.length === 7 
            ? expenseOriginalDate  // Already YYYY-MM
            : expenseOriginalDate.substring(0, 7); // Extract YYYY-MM from YYYY-MM-DD
          return salesOriginalDate === expenseMonth;
        } else {
          return normalizeDateToYYYYMMDD(salesOriginalDate) === normalizeDateToYYYYMMDD(expenseOriginalDate);
        }
      });
      
      if (!hasMatchingSales) {
        // For monthly, normalize expense date to YYYY-MM format
        const normalizedExpenseDate = chartPeriod === 'monthly' 
          ? (expenseOriginalDate.length === 7 
              ? expenseOriginalDate 
              : expenseOriginalDate.substring(0, 7))
          : expenseOriginalDate;
        
        mergedData.push({
          day: formatDateForChart(expenseItem.day, chartPeriod), // Format for display
          sales: 0,
          expenses: expenseItem.expenses,
          originalDate: normalizedExpenseDate // YYYY-MM (monthly) or YYYY-MM-DD (daily) format
        });
      }
    });

    // Sort the merged data by date (use originalDate for accurate sorting)
    mergedData.sort((a, b) => {
      const dateAStr = (a as any).originalDate || a.day;
      const dateBStr = (b as any).originalDate || b.day;
      
      // For monthly (YYYY-MM format), use string comparison
      // For daily/weekly (YYYY-MM-DD format), use Date comparison
      if (chartPeriod === 'monthly') {
        return dateAStr.localeCompare(dateBStr);
      } else {
        const dateA = new Date(dateAStr);
        const dateB = new Date(dateBStr);
        return dateA.getTime() - dateB.getTime();
      }
    });

    // Limit final data points for optimal chart display and better visibility
    // Reduced limits for cleaner, more readable charts
    const maxPoints = chartPeriod === 'monthly' ? 12 : chartPeriod === 'weekly' ? 12 : 20;
    if (mergedData.length > maxPoints) {
      console.log(`📉 Limiting ${mergedData.length} data points to ${maxPoints} for optimal display`);
      // For large datasets, use smart sampling to preserve important data points
      // Always include first and last points, then sample evenly
      const step = Math.floor(mergedData.length / (maxPoints - 2));
      const limitedData = [mergedData[0]]; // Always include first point
      for (let i = step; i < mergedData.length - 1; i += step) {
        limitedData.push(mergedData[i]);
      }
      limitedData.push(mergedData[mergedData.length - 1]); // Always include last point
      return limitedData;
    }

    return mergedData;
  }, [currentDashboardMetrics?.salesByMonth, currentDashboardMetrics?.salesByPeriod, currentDashboardMetrics?.recentTransactions, currentDashboardMetrics?.recentTransactions?.length, filteredSales, filteredSales?.length, fullTransactions, fullTransactions?.length, dateRange, customStartDate, customEndDate, getChartPeriod, expenseData]);

  // Use filtered sales data for top products when filters are applied, otherwise use API data
  const topProductsData = useMemo(() => {
    // Always prefer API topProducts data when available (most accurate and complete)
    if (currentDashboardMetrics?.topProducts && currentDashboardMetrics.topProducts.length > 0) {
      return currentDashboardMetrics.topProducts.map((product: any) => ({
        name: product.productName?.length > 8
          ? product.productName.substring(0, 8) + '...'
          : product.productName,
        fullName: product.productName,
        revenue: product.revenue,
        quantity: product.quantitySold,
      }));
    }
    
    // If filters are applied (not default 'this_month'), try to aggregate from transactions
    if (dateRange !== 'this_month' || customStartDate || customEndDate) {
      // Get transactions to use - prefer filteredSales, fallback to fullTransactions
      const transactionsToUse = filteredSales && filteredSales.length > 0 
        ? filteredSales 
        : (fullTransactions && fullTransactions.length > 0 ? fullTransactions : []);
      
      if (transactionsToUse.length > 0) {
        // Aggregate product sales from transactions (only if transactions have items array)
        const productSales = transactionsToUse.reduce((acc, sale) => {
          if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach((item: any) => {
              const productId = item.product_id;
              if (!acc[productId]) {
                acc[productId] = {
                  productId,
                  productName: item.product_name,
                  revenue: 0,
                  quantitySold: 0
                };
              }
              acc[productId].revenue += item.total_price || 0;
              acc[productId].quantitySold += item.quantity || 0;
            });
          }
          return acc;
        }, {} as Record<string, { productId: string; productName: string; revenue: number; quantitySold: number }>);
        
        // Convert to array and sort by revenue
        const aggregated = Object.values(productSales)
          .sort((a: any, b: any) => b.revenue - a.revenue)
          .slice(0, 10) // Top 10 products
          .map((product: any) => ({
            name: product.productName?.length > 8
              ? product.productName.substring(0, 8) + '...'
              : product.productName || 'Unknown Product',
            fullName: product.productName || 'Unknown Product',
            revenue: product.revenue,
            quantity: product.quantitySold,
          }));
        
        // Only return aggregated data if we have products
        if (aggregated.length > 0) {
          return aggregated;
        }
      }
      
      // No data available
      return [];
    }
    
    // Default: return empty array if no data available
    return [];
  }, [currentDashboardMetrics?.topProducts, filteredSales, fullTransactions, dateRange, customStartDate, customEndDate]);

  const getPaymentMethodColor = (method: string) => {
    const colors: { [key: string]: string } = {
      'cash': '#22c55e',      // Green
      'pos': '#3b82f6',       // Blue (for pos_isbank_transfer and card)
      'transfer': '#8b5cf6',  // Purple (for naira_transfer)
      'crypto': '#f59e0b',    // Orange (for crypto_payment)
      // Legacy support
      'pos_isbank_transfer': '#3b82f6',      // Blue  
      'naira_transfer': '#8b5cf6',  // Purple
      'crypto_payment': '#f59e0b',       // Orange
      'card': '#3b82f6',      // Blue (legacy)
      'unknown': '#6b7280'    // Gray
    };
    return colors[method] || '#6b7280';
  };

  // Generate payment method data from actual transactions first; merge with API metrics if present (using AMOUNTS, not counts)
  const paymentMethodData = useMemo(() => {
    // Prefer real transactions to ensure we capture ALL methods actually used
    const sales = (fullTransactions.length > 0)
      ? fullTransactions
      : ((currentDashboardMetrics?.recentTransactions && currentDashboardMetrics.recentTransactions.length > 0)
          ? currentDashboardMetrics.recentTransactions
          : filteredSales);

    console.log('🔍 Payment Method Data Debug:', {
      hasDashboardMetrics: !!currentDashboardMetrics,
      hasPaymentMethods: !!currentDashboardMetrics?.paymentMethods,
      paymentMethodsKeys: currentDashboardMetrics?.paymentMethods ? Object.keys(currentDashboardMetrics.paymentMethods) : [],
      fullTransactionsLength: fullTransactions.length,
      filteredSalesLength: filteredSales.length,
      recentTransactionsLength: currentDashboardMetrics?.recentTransactions?.length || 0,
      salesLength: sales.length,
      dataSource: currentDashboardMetrics?.recentTransactions?.length > 0 ? 'recentTransactions' : (fullTransactions.length > 0 ? 'fullTransactions' : 'filteredSales'),
      sampleTransactions: sales.slice(0, 3).map((s: any) => ({
        id: s.id || s._id,
        totalAmount: s.totalAmount,
        total_amount: s.total_amount,
        payment_methods: s.payment_methods,
        payment_method: s.paymentMethod || s.payment_method,
        createdAt: s.createdAt || s.created_at
      })),
      salesData: sales.slice(0, 2), // Log first 2 transactions for debugging
      transactionStatuses: sales.map((s: any) => s.status || s.payment_status).filter(Boolean), // Log transaction statuses
      uniqueStatuses: Array.from(new Set(sales.map((s: any) => s.status || s.payment_status).filter(Boolean))),
      // Additional debugging for payment method structure
      paymentMethodFields: sales.map((s: any) => ({
        hasPaymentMethods: !!(s.payment_methods && s.payment_methods.length > 0),
        hasPaymentMethod: !!(s.paymentMethod || s.payment_method),
        paymentMethods: s.payment_methods,
        paymentMethod: s.paymentMethod || s.payment_method,
        totalAmount: s.totalAmount,
        total_amount: s.total_amount
      })).slice(0, 2)
    });
    
    // We'll compute from sales if available; otherwise fallback entirely to API metrics
    if (!sales || sales.length === 0) {
      if (currentDashboardMetrics?.paymentMethods && Object.keys(currentDashboardMetrics.paymentMethods).length > 0) {
        // Normalize backend keys into unified buckets (pos, transfer, cash, crypto)
        const raw = currentDashboardMetrics.paymentMethods as Record<string, number>;
        const normalized: Record<string, number> = {};
        for (const [apiKey, amt] of Object.entries(raw)) {
          let key = apiKey.toLowerCase();
          if (key === 'pos_isbank_transfer' || key === 'card') key = 'pos';
          if (key === 'naira_transfer' || key === 'transfer') key = 'transfer';
          if (key === 'crypto_payment') key = 'crypto';
          if (key === 'cash_on_delivery') key = 'cash';
          normalized[key] = (normalized[key] || 0) + (amt || 0);
        }
        const totalAmount = Object.values(normalized).reduce((s, a) => s + (a || 0), 0);
        return Object.entries(normalized).map(([method, amount]) => ({
          name: method.charAt(0).toUpperCase() + method.slice(1),
          value: amount || 0,
          percentage: totalAmount > 0 ? (((amount || 0) / totalAmount) * 100).toFixed(1) : '0.0',
          color: getPaymentMethodColor(method)
        }));
      }
      console.log('⚠️ No sales or metric payment data available, returning empty data');
      return [];
    }
    
    // Check if we have payment method data in the transactions
    const hasPaymentData = sales.some((sale: any) => 
      (sale.payment_methods && sale.payment_methods.length > 0) || sale.payment_method
    );
    
    if (!hasPaymentData) {
      console.log('⚠️ No payment method data found in transactions - returning empty data');
      // Return empty data instead of estimating - we want real payment method data
      return [];
    }
    
    const paymentMethods: { [key: string]: number } = {};
    let totalAmount = 0;
    
    sales.forEach((sale: any) => {
      console.log('Processing sale for payment methods:', {
        saleId: sale.id || sale._id,
        totalAmount: sale.totalAmount || sale.total_amount,
        hasPaymentMethods: !!(sale.payment_methods && sale.payment_methods.length > 0),
        hasPaymentMethod: !!(sale.paymentMethod || sale.payment_method),
        paymentMethods: sale.payment_methods,
        paymentMethod: sale.paymentMethod || sale.payment_method
      });
      
      // Handle both new (payment_methods array) and legacy (single payment_method) formats
      if (sale.payment_methods && sale.payment_methods.length > 0) {
        // New format: payment_methods array
        sale.payment_methods.forEach((method: any) => {
          console.log('Processing payment method:', method);
          let methodKey: string;
          switch (method.type) {
            case 'pos_isbank_transfer':
            case 'card': // Legacy support for card payments
              methodKey = 'pos';
              break;
            case 'naira_transfer':
              methodKey = 'transfer';
              break;
            case 'crypto_payment':
              methodKey = 'crypto';
              break;
            default:
              methodKey = method.type;
          }
          console.log(`Adding ${method.amount} to ${methodKey}`);
          paymentMethods[methodKey] = (paymentMethods[methodKey] || 0) + method.amount;
          totalAmount += method.amount;
        });
      } else if (sale.paymentMethod || sale.payment_method) {
        // Legacy format: single payment_method field (handle both camelCase and snake_case)
        const method = (sale.paymentMethod || sale.payment_method || '').toLowerCase();
        let methodKey: string;
        switch (method) {
          case 'pos_isbank_transfer':
          case 'card': // Legacy support for card payments
            methodKey = 'pos';
            break;
          case 'naira_transfer':
            methodKey = 'transfer';
            break;
          case 'crypto_payment':
            methodKey = 'crypto';
            break;
          case 'cash':
            methodKey = 'cash';
            break;
          default:
            methodKey = method;
        }
        // Use totalAmount for dashboard metrics format, total_amount for full transaction format
        const amount = sale.totalAmount || sale.total_amount || 0;
        console.log(`Adding ${amount} to ${methodKey} from single payment method`);
        paymentMethods[methodKey] = (paymentMethods[methodKey] || 0) + amount;
        totalAmount += amount;
      }
    });
    
    // Merge in additional categories from API metrics if they exist but were not present in sales (e.g., filtered out by date)
    const apiPM = (currentDashboardMetrics?.paymentMethods as Record<string, number>) || {};
    for (const [apiKey, apiAmount] of Object.entries(apiPM)) {
      // Normalize API keys to our buckets for consistency
      let key = apiKey;
      if (apiKey === 'pos_isbank_transfer' || apiKey === 'card') key = 'pos';
      if (apiKey === 'naira_transfer') key = 'transfer';
      if (apiKey === 'crypto_payment') key = 'crypto';
      paymentMethods[key] = (paymentMethods[key] || 0) + (apiAmount || 0);
      totalAmount += apiAmount || 0;
    }

    // Ensure stable order: cash, pos, transfer, crypto, then any others
    const preferredOrder = ['cash', 'pos', 'transfer', 'crypto'];
    const entries = Object.entries(paymentMethods).sort((a, b) => {
      const ai = preferredOrder.indexOf(a[0]);
      const bi = preferredOrder.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });

    const result = entries.map(([method, amount]) => ({
      name: method.charAt(0).toUpperCase() + method.slice(1),
      value: amount,
      percentage: totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0.0',
      color: getPaymentMethodColor(method)
    }));
    
    console.log('🔍 Final Payment Method Calculation:', {
      paymentMethods,
      totalAmount,
      result,
      salesProcessed: sales.length
    });
    
    return result;
  }, [currentDashboardMetrics?.paymentMethods, fullTransactions, filteredSales, currentDashboardMetrics?.recentTransactions]);

  // Generate order source data from dashboard analytics or transactions
  const orderSourceData = useMemo(() => {
    // First try to get order source data from analytics API
    if (currentDashboardMetrics?.orderSources) {
      const orderSources = currentDashboardMetrics.orderSources;
      const totalAmount = Object.values(orderSources).reduce((sum: number, amount: any) => sum + (amount || 0), 0);
      
      console.log('🔍 Dashboard: Order source data from API:', {
        orderSources,
        totalAmount,
        entries: Object.entries(orderSources)
      });
      
      return Object.entries(orderSources).map(([source, amount]: [string, any]) => ({
        name: (source === 'online') ? 'Online' : 'In-Store',
        value: amount || 0,
        percentage: totalAmount > 0 ? (((amount || 0) / totalAmount) * 100).toFixed(1) : '0.0',
        color: source === 'online' ? '#3b82f6' : '#22c55e' // Blue for online, Green for in-store
      }));
    }
    
    // Fallback to processing transactions data if analytics data is not available
    const sales = (fullTransactions.length > 0)
      ? fullTransactions
      : ((filteredSales && filteredSales.length > 0) ? filteredSales : []);
    
    if (!sales || sales.length === 0) {
      console.log('🔍 Dashboard: No sales data for order source calculation');
      return [];
    }
    
    const orderSources: { [key: string]: number } = {
      'online': 0,
      'in_store': 0
    };
    let totalAmount = 0;
    
    console.log('🔍 Dashboard: Processing sales for order source (fallback):', {
      salesCount: sales.length,
      sampleSales: sales.slice(0, 3).map(s => ({
        id: s._id,
        total_amount: s.total_amount,
        order_source: s.order_source
      }))
    });
    
    sales.forEach(sale => {
      const src = sale.order_source;
      // Normalize both 'in-store' and 'in_store' to 'in_store' for frontend consistency
      const normalized = (src === 'in-store' || src === 'in_store') ? 'in_store' : (src || 'in_store');
      orderSources[normalized] = (orderSources[normalized] || 0) + (sale.total_amount || 0);
      totalAmount += (sale.total_amount || 0);
    });
    
    console.log('🔍 Dashboard: Order source calculation (fallback):', {
      orderSources,
      totalAmount,
      salesProcessed: sales.length
    });
    
    return Object.entries(orderSources).map(([source, amount]) => ({
      name: source === 'online' ? 'Online' : 'In-Store',
      value: amount,
      percentage: totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : '0.0',
      color: source === 'online' ? '#3b82f6' : '#22c55e' // Blue for online, Green for in-store
    }));
  }, [currentDashboardMetrics?.orderSources, fullTransactions, filteredSales]);

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
    
    // Get previous period data (simplified - use current metrics for now)
    // TODO: Implement proper previous period calculation when needed
    const previousPeriodSales = 0; // Simplified for now
    const previousPeriodTransactions = 0; // Simplified for now
    
    const previousPeriodAvgTransaction = previousPeriodTransactions > 0 ? previousPeriodSales / previousPeriodTransactions : 0;
    
    // Calculate growth rates
    const salesGrowthRate = previousPeriodSales > 0 ? ((currentPeriodSales - previousPeriodSales) / previousPeriodSales) * 100 : (currentPeriodSales > 0 ? 100 : 0);
    const transactionGrowthRate = previousPeriodTransactions > 0 ? ((currentPeriodTransactions - previousPeriodTransactions) / previousPeriodTransactions) * 100 : (currentPeriodTransactions > 0 ? 100 : 0);
    const avgTransactionGrowthRate = previousPeriodAvgTransaction > 0 ? ((currentPeriodAvgTransaction - previousPeriodAvgTransaction) / previousPeriodAvgTransaction) * 100 : (currentPeriodAvgTransaction > 0 ? 100 : 0);
    
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

  // Use unified API data directly - no need for smart metrics calculation
  const totalSales = currentDashboardMetrics?.totalSales ?? 0;
  const totalTransactions = currentDashboardMetrics?.totalTransactions ?? 0;
  const averageTransactionValue = currentDashboardMetrics?.averageTransactionValue ?? 0;
  const growthRate = currentDashboardMetrics?.growthRate ?? 0;

  // Animated numbers for key metrics
  const animatedTotalSales = useAnimatedNumber(totalSales);
  const animatedTotalTransactions = useAnimatedNumber(totalTransactions);
  const animatedTotalExpenses = useAnimatedNumber(currentDashboardMetrics?.totalExpenses ?? 0);
  const animatedNetProfit = useAnimatedNumber(currentDashboardMetrics?.netProfit ?? 0);
  
  // New individual vs yesterday metrics
  const salesVsYesterday = currentDashboardMetrics?.salesVsYesterday ?? 0;
  const expensesVsYesterday = currentDashboardMetrics?.expensesVsYesterday ?? 0;
  const rawProfitVsYesterday = currentDashboardMetrics?.profitVsYesterday ?? 0;
  const transactionsVsYesterday = currentDashboardMetrics?.transactionsVsYesterday ?? 0;
  
  // Fix profit percentage calculation for negative base values
  const profitVsYesterday = useMemo(() => {
    const currentProfit = currentDashboardMetrics?.netProfit ?? 0;
    
    // If current profit is positive and raw percentage is very negative (< -100),
    // this means we went from negative to positive profit - which is always good!
    if (currentProfit > 0 && rawProfitVsYesterday < -100) {
      // Show this as a positive improvement instead of negative
      // Use a more intuitive calculation: show the absolute improvement
      return Math.abs(rawProfitVsYesterday);
    }
    
    return rawProfitVsYesterday;
  }, [rawProfitVsYesterday, currentDashboardMetrics?.netProfit]);
  // Get comparison label and period label based on current filter
  let comparisonLabel = 'vs last month';
  let periodLabel = 'This Month';
  
  // Set labels based on current date range
    switch (dateRange) {
      case 'today':
        comparisonLabel = 'vs yesterday';
        periodLabel = 'Today';
        break;
    case 'this_month':
      comparisonLabel = 'vs last month';
      periodLabel = 'This Month';
      break;
      case 'custom':
        comparisonLabel = 'vs previous period';
      periodLabel = 'Custom Period';
        break;
      default:
        comparisonLabel = 'vs last month';
        periodLabel = 'This Month';
  }

  // Use expense data from dashboard metrics (single source of truth)
  const totalExpensesFromMetrics = currentDashboardMetrics?.totalExpenses || 0;
  const monthlyExpensesFromMetrics = currentDashboardMetrics?.monthlyExpenses || 0;
  const netProfitFromMetrics = currentDashboardMetrics?.netProfit || 0;

  // Use net profit from metrics (calculated by backend)
  const netProfit = netProfitFromMetrics;
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 Dashboard Data Sources Debug:', {
      dateRange,
      currentDashboardMetrics: {
        totalSales: currentDashboardMetrics?.totalSales,
        totalTransactions: currentDashboardMetrics?.totalTransactions,
        averageTransactionValue: currentDashboardMetrics?.averageTransactionValue,
        totalExpenses: currentDashboardMetrics?.totalExpenses,
        netProfit: currentDashboardMetrics?.netProfit
      },
      finalValues: {
        totalSales,
        totalTransactions,
        averageTransactionValue,
        totalExpenses: totalExpensesFromMetrics,
        netProfit: netProfitFromMetrics
      }
    });
  }, [dashboardMetrics, totalSales, totalTransactions, averageTransactionValue, growthRate, salesVsYesterday, expensesVsYesterday, profitVsYesterday, transactionsVsYesterday, netProfit, totalExpensesFromMetrics, monthlyExpensesFromMetrics, netProfitFromMetrics, comparisonLabel, periodLabel, dateRange, customStartDate, customEndDate, currentDashboardMetrics]);

  const metricCards = [
    {
      title: 'Total Sales',
      value: formatPrice(animatedTotalSales.currentValue),
      animatedValue: animatedTotalSales.currentValue,
      isAnimating: animatedTotalSales.isAnimating,
      icon: DollarSign,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-gradient-to-br from-emerald-100 to-teal-100',
      iconColor: 'text-emerald-600',
      change: `${salesVsYesterday > 0 ? '+' : ''}${salesVsYesterday.toFixed(1)}% ${comparisonLabel}`,
      changeColor: salesVsYesterday >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
    {
      title: 'Total Expenses',
      value: formatPrice(animatedTotalExpenses.currentValue),
      animatedValue: animatedTotalExpenses.currentValue,
      isAnimating: animatedTotalExpenses.isAnimating,
      icon: TrendingDown,
      gradient: 'from-red-500 to-pink-600',
      iconBg: 'bg-gradient-to-br from-red-100 to-pink-100',
      iconColor: 'text-red-600',
      change: `${expensesVsYesterday > 0 ? '+' : ''}${expensesVsYesterday.toFixed(1)}% ${comparisonLabel}`,
      changeColor: expensesVsYesterday <= 0 ? 'text-emerald-600' : 'text-red-600', // Lower expenses = good (green)
    },
    {
      title: 'Net Profit',
      value: formatPrice(animatedNetProfit.currentValue),
      animatedValue: animatedNetProfit.currentValue,
      isAnimating: animatedNetProfit.isAnimating,
      icon: Activity,
      gradient: animatedNetProfit.currentValue >= 0 ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600',
      iconBg: animatedNetProfit.currentValue >= 0 ? 'bg-gradient-to-br from-green-100 to-emerald-100' : 'bg-gradient-to-br from-red-100 to-rose-100',
      iconColor: animatedNetProfit.currentValue >= 0 ? 'text-green-600' : 'text-red-600',
      change: `${profitVsYesterday > 0 ? '+' : ''}${profitVsYesterday.toFixed(1)}% ${comparisonLabel}`,
      changeColor: profitVsYesterday >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      title: 'Transactions',
      value: Math.round(animatedTotalTransactions.currentValue).toString(),
      animatedValue: animatedTotalTransactions.currentValue,
      isAnimating: animatedTotalTransactions.isAnimating,
      icon: ShoppingCart,
      gradient: 'from-green-500 to-green-700',
      iconBg: 'bg-gradient-to-br from-green-100 to-green-200',
      iconColor: 'text-green-600',
      change: `${transactionsVsYesterday > 0 ? '+' : ''}${transactionsVsYesterday.toFixed(1)}% ${comparisonLabel}`,
      changeColor: transactionsVsYesterday >= 0 ? 'text-green-600' : 'text-red-600',
    },
  ];

  if (loading || isInitialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 pb-24">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-r from-white via-white to-green-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-green-700/5 dark:from-green-400/5 dark:to-green-500/5"></div>
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl mb-4 shadow-lg">
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

          {/* Loading State */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="group relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6 transition-all duration-300">
                <div className="animate-pulse">
                  <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading Chart */}
          <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 transition-all duration-300">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
              <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 pb-24">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-white via-white to-green-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-700 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 transition-all duration-300 hover:shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-green-700/5 dark:from-green-400/5 dark:to-green-500/5"></div>
          <div className="relative text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl mb-4 shadow-lg">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
              Dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Welcome to {app.name} Management System
            </p>
            <div className="mt-4 flex justify-center items-center space-x-4 flex-wrap gap-2">
              <NotificationStatus />
              
              {/* Auto-refresh Toggle */}
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-1">
                <button
                  onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                  className={`flex items-center space-x-1 text-xs font-medium transition-all duration-200 ${
                    autoRefreshEnabled 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span>Auto-refresh</span>
                </button>
              </div>

              {/* Last refresh time */}
              {lastRefreshTime && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {lastRefreshTime.toLocaleTimeString()}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log('🔄 Manual dashboard refresh triggered');
                  unifiedRefresh();
                  setLastRefreshTime(new Date());
                }}
                className="flex items-center space-x-2"
              >
                <Activity className="h-4 w-4" />
                <span>Refresh Now</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGoalSettingModalOpen(true)}
                className="flex items-center space-x-2"
              >
                <Target className="h-4 w-4" />
                <span>Set Goals</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-6 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center">
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
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${dateRange === 'today'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setDateRange('this_month')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${dateRange === 'this_month'
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => setDateRange('custom')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${dateRange === 'custom'
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
              {currentDashboardMetrics ? (
                `Showing ${currentDashboardMetrics.totalTransactions || 0} ${dateRange === 'today' ? 'today\'s' : dateRange === 'this_month' ? 'this month\'s' : 'filtered'} transactions`
              ) : (
                `Showing 0 total transactions`
              )}
            </div>
          </div>
        </div>

        {/* Notification Permission Banner */}
        <NotificationPermissionBanner />

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
                  <p className={`text-lg font-bold text-gray-900 dark:text-white mb-2 transition-all duration-300 ${
                    metric.isAnimating ? 'scale-105 text-green-600 dark:text-green-400' : ''
                  }`}>
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

        {/* Goal Progress Cards */}
        {(dailyProgress || monthlyProgress) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Goal Progress */}
            {dailyProgress && (
              <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-gray-800">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
          <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: '#009DE3' }}>
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
              <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Daily Goal</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {dailyProgress.goal.goal_name || 'Daily Sales Target'}
                        </p>
              </div>
              </div>
                    {dailyProgress.is_achieved && (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-full" style={{ backgroundColor: '#17A068', color: 'white' }}>
                        <Trophy className="h-3 w-3" />
                        <span className="text-xs font-semibold">ACHIEVED!</span>
            </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {Math.round(dailyProgress.progress_percentage)}%
                      </span>
                </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${dailyProgress.is_achieved
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                            : 'bg-gradient-to-r from-blue-500 to-purple-500'
                          }`}
                        style={{ width: `${Math.min(dailyProgress.progress_percentage, 100)}%` }}
                      ></div>
                  </div>
                </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        ₺{dailyProgress.goal.target_amount.toLocaleString()}
                      </p>
                  </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        ₺{dailyProgress.current_amount.toLocaleString()}
                      </p>
                </div>
                  </div>

                  {dailyProgress.hours_remaining !== undefined && dailyProgress.hours_remaining > 0 && (
                    <div className="mt-2 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {dailyProgress.hours_remaining} hours remaining today
                      </p>
                </div>
                  )}
            </div>
          </div>
            )}

            {/* Monthly Goal Progress */}
            {monthlyProgress && (
              <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-gray-800">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: '#8E3BE0' }}>
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Monthly Goal</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {monthlyProgress.goal.goal_name || 'Monthly Sales Target'}
                        </p>
                      </div>
                    </div>
                    {monthlyProgress.is_achieved && (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-full" style={{ backgroundColor: '#17A068', color: 'white' }}>
                        <Trophy className="h-3 w-3" />
                        <span className="text-xs font-semibold">ACHIEVED!</span>
                      </div>
                    )}
        </div>

                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Progress</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {Math.round(monthlyProgress.progress_percentage)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${monthlyProgress.is_achieved
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500'
                          }`}
                        style={{ width: `${Math.min(monthlyProgress.progress_percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        ₺{monthlyProgress.goal.target_amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        ₺{monthlyProgress.current_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {monthlyProgress.days_remaining !== undefined && monthlyProgress.days_remaining > 0 && (
                    <div className="mt-2 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {monthlyProgress.days_remaining} days remaining this month
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Charts Section */}
        <div className="space-y-8">
          {/* Sales Overview Chart - Full Width */}
          <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 transition-all duration-300 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-teal-600/5 dark:from-emerald-400/5 dark:to-teal-400/5"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sales & Expenses Overview</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getChartPeriod === 'daily' 
                      ? 'Daily performance trends' 
                      : getChartPeriod === 'weekly' 
                      ? 'Weekly performance trends' 
                      : 'Monthly performance trends'}
                    {dateRange === 'today' && ' (showing last 30 days for context)'}
                    {dateRange === 'this_month' && ' (showing last 12 months for context)'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="h-80">
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" opacity={0.2} />
                      <XAxis 
                        dataKey="day"
                        stroke="#6b7280" 
                        fontSize={getChartPeriod === 'monthly' ? 12 : 11}
                        tickLine={false}
                        axisLine={false}
                        interval={getChartPeriod === 'monthly' ? 0 : "preserveStartEnd"}
                        tick={{ fontSize: getChartPeriod === 'monthly' ? 12 : 11 }}
                        height={getChartPeriod === 'monthly' ? 40 : 50}
                        angle={getChartPeriod === 'monthly' ? 0 : -45}
                        textAnchor={getChartPeriod === 'monthly' ? 'middle' : 'end'}
                      />
                      <YAxis 
                        stroke="#6b7280" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11 }}
                        width={60}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          const label = name === 'sales' ? 'Sales' : name === 'expenses' ? 'Expenses' : name;
                          return [formatPrice(value), label];
                        }}
                        labelFormatter={(label) => `Day: ${label}`}
                        {...getTooltipStyles()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="url(#salesGradient)" 
                        strokeWidth={3}
                        dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
                        connectNulls={false}
                        name="Sales"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expenses" 
                        stroke="url(#expensesGradient)" 
                        strokeWidth={3}
                        dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#ffffff' }}
                        connectNulls={false}
                        name="Expenses"
                      />
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#14b8a6" />
                        </linearGradient>
                        <linearGradient id="expensesGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#dc2626" />
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

          {/* Second Row: Top Products */}
          <div className="grid grid-cols-1 gap-8">
            {/* Top Products Chart */}
          <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 transition-all duration-300 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-green-700/5 dark:from-green-400/5 dark:to-green-500/5"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Top Products</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Best performing products</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center shadow-lg">
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
                        angle={0}
                        textAnchor="middle"
                        height={60}
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
                        {...getTooltipStyles()}
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
                      <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Package className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">No product data available</p>
                      <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">Product performance data will appear here</p>
                      <button
                        onClick={() => window.location.href = '/products'}
                        className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white text-sm font-medium rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
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
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white text-sm font-medium rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          </div>

          {/* Payment Methods Chart removed per request */}

          {/* Order Source Analytics */}
          <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8 transition-all duration-300 hover:shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-green-600/5 dark:from-blue-400/5 dark:to-green-400/5"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-600 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Order Source Analytics</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Online vs In-Store breakdown</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-[28rem]">
                {orderSourceData.length > 0 ? (
                  <div className="flex flex-col h-full">
                    {/* Chart Section */}
                    <div className="flex-1 flex items-center justify-center p-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={orderSourceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {orderSourceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number, name: string, props: any) => [
                              formatPrice(value), 
                              `${props.payload.name} (${props.payload.percentage}%)`
                            ]}
                            {...getTooltipStyles()}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Online</span>
                        </div>
                        <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
                          {formatPrice(orderSourceData.find(item => item.name === 'Online')?.value || 0)}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          {orderSourceData.find(item => item.name === 'Online')?.percentage || '0.0'}%
                        </div>
                      </div>
                      
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs font-medium text-green-700 dark:text-green-300">In-Store</span>
                        </div>
                        <div className="text-sm font-bold text-green-900 dark:text-green-100">
                          {formatPrice(orderSourceData.find(item => item.name === 'In-Store')?.value || 0)}
                        </div>
                        <div className="text-xs text-green-600 dark:text-green-400">
                          {orderSourceData.find(item => item.name === 'In-Store')?.percentage || '0.0'}%
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <ShoppingCart className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Order Source Data</h4>
                      <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                        Order source analytics will appear here once you have sales with order source tracking
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
                {currentDashboardMetrics?.recentTransactions && currentDashboardMetrics.recentTransactions.length > 5 && (
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
              {(filteredSales && filteredSales.length > 0) || (currentDashboardMetrics?.recentTransactions && currentDashboardMetrics.recentTransactions.length > 0) ? (
                (filteredSales && filteredSales.length > 0 ? filteredSales : (currentDashboardMetrics?.recentTransactions || []))?.slice(0, 4).map((sale: any, index: number) => {
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
                    <div key={`sale-${index}-${isApiData ? sale.id : sale._id}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${alert.alert_type === 'out_of_stock'
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
        <div className="relative overflow-hidden bg-white/80 dark:bg-gray-800/80 backdrop-sm rounded-xl shadow-lg border border-white/20 dark:border-gray-700/50 p-4 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
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

      {/* Goal Setting Modal */}
      <GoalSettingModal
        isOpen={isGoalSettingModalOpen}
        onClose={() => setIsGoalSettingModalOpen(false)}
      />
    </div>
  );
};
