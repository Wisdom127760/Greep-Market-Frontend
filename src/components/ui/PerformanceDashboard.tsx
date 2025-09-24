import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Trophy, 
  Calendar,
  DollarSign,
  Award
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { GoalSettingModal } from './GoalSettingModal';
import { apiService } from '../../services/api';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface PerformanceData {
  daily: {
    today: number;
    yesterday: number;
    thisWeek: number;
    lastWeek: number;
  };
  monthly: {
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
    lastYear: number;
  };
  trends: {
    dailyData: Array<{ date: string; sales: number; transactions: number }>;
    monthlyData: Array<{ month: string; sales: number; transactions: number }>;
  };
  goals: {
    daily: number;
    monthly: number;
    achieved: boolean;
    streak: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    achieved: boolean;
    icon: string;
  }>;
}

interface PerformanceDashboardProps {
  storeId: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ storeId }) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  const loadPerformanceData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load real data from existing API methods and goals
      const [dashboardMetrics, salesAnalytics, goals] = await Promise.all([
        apiService.getDashboardAnalytics(storeId).catch(err => {
          console.warn('Failed to load dashboard analytics:', err);
          return null;
        }),
        apiService.getSalesAnalytics({ store_id: storeId }).catch(err => {
          console.warn('Failed to load sales analytics:', err);
          return null;
        }),
        apiService.isAuthenticated() ? apiService.getGoals({ store_id: storeId, is_active: true }).catch(err => {
          console.warn('Failed to load goals:', err);
          return [];
        }) : Promise.resolve([])
      ]);

      // Process goals data
      const dailyGoal = goals.find((g: any) => g.goal_type === 'daily');
      const monthlyGoal = goals.find((g: any) => g.goal_type === 'monthly');
      
      // Debug logging with detailed information
      console.log('Performance Dashboard Data:', {
        dashboardMetrics,
        salesAnalytics,
        goals,
        storeId,
        isAuthenticated: apiService.isAuthenticated(),
        dailyGoal,
        monthlyGoal
      });

      // Log specific field values to debug
      if (dashboardMetrics) {
        console.log('Dashboard Metrics Details:', {
          todaySales: dashboardMetrics.todaySales,
          monthlySales: dashboardMetrics.monthlySales,
          totalSales: dashboardMetrics.totalSales,
          totalTransactions: dashboardMetrics.totalTransactions
        });
      }

      // Calculate goal progress and achievements
      const dailyProgress = dailyGoal ? (dashboardMetrics?.todaySales || 0) / dailyGoal.target_amount : 0;
      const monthlyProgress = monthlyGoal ? (dashboardMetrics?.monthlySales || 0) / monthlyGoal.target_amount : 0;

      // Check if we have any meaningful data
      const hasData = (dashboardMetrics?.todaySales && dashboardMetrics.todaySales > 0) || 
                     (dashboardMetrics?.monthlySales && dashboardMetrics.monthlySales > 0) || 
                     (dashboardMetrics?.totalSales && dashboardMetrics.totalSales > 0) ||
                     (dailyGoal?.target_amount > 0) ||
                     (monthlyGoal?.target_amount > 0) ||
                     (localStorage.getItem('local_daily_goal')) ||
                     (localStorage.getItem('local_monthly_goal')) ||
                     (salesAnalytics && Object.keys(salesAnalytics).length > 0);

      console.log('Data validation check:', {
        hasData,
        todaySales: dashboardMetrics?.todaySales,
        monthlySales: dashboardMetrics?.monthlySales,
        totalSales: dashboardMetrics?.totalSales,
        dailyGoalAmount: dailyGoal?.target_amount,
        monthlyGoalAmount: monthlyGoal?.target_amount,
        localDailyGoal: localStorage.getItem('local_daily_goal'),
        localMonthlyGoal: localStorage.getItem('local_monthly_goal'),
        salesAnalyticsKeys: salesAnalytics ? Object.keys(salesAnalytics) : 'null'
      });

      if (!hasData) {
        console.log('No meaningful data found, providing sample data for demonstration');
        // Provide sample data for demonstration when no real data exists
        const sampleData: PerformanceData = {
        daily: {
          today: 1250,
          yesterday: 980,
          thisWeek: 8750,
          lastWeek: 7200
        },
        monthly: {
          thisMonth: 35200,
          lastMonth: 28900,
          thisYear: 185400,
          lastYear: 142300
        },
        trends: {
            dailyData: [
              { date: 'Mon', sales: 1200, transactions: 8 },
              { date: 'Tue', sales: 1500, transactions: 10 },
              { date: 'Wed', sales: 1100, transactions: 7 },
              { date: 'Thu', sales: 1800, transactions: 12 },
              { date: 'Fri', sales: 2000, transactions: 15 },
              { date: 'Sat', sales: 2200, transactions: 18 },
              { date: 'Sun', sales: 1250, transactions: 9 }
            ],
            monthlyData: [
              { month: 'Jan', sales: 28000, transactions: 180 },
              { month: 'Feb', sales: 32000, transactions: 200 },
              { month: 'Mar', sales: 35000, transactions: 220 },
              { month: 'Apr', sales: 31000, transactions: 190 },
              { month: 'May', sales: 38000, transactions: 240 },
              { month: 'Jun', sales: 35200, transactions: 210 }
            ]
        },
        goals: {
            daily: 1500,
            monthly: 35000,
          achieved: true,
          streak: 5
        },
        achievements: [
          {
              id: 'daily-achieved',
              title: 'Daily Goal Achieved',
              description: 'Congratulations! You reached your daily sales goal.',
            achieved: true,
            icon: '🎯'
          },
          {
              id: 'monthly-achieved',
              title: 'Monthly Goal Achieved',
              description: 'Outstanding! You exceeded your monthly target.',
              achieved: true,
              icon: '🏆'
            }
          ]
        };
        setPerformanceData(sampleData);
        return;
      }

      // Create performance data from real API data only
      const performanceData: PerformanceData = {
        daily: {
          today: dashboardMetrics?.todaySales || 0,
          yesterday: 0, // TODO: Calculate from previous day data
          thisWeek: dashboardMetrics?.totalSales || 0, // Using total sales as this week for now
          lastWeek: 0 // TODO: Calculate from previous week data
        },
        monthly: {
          thisMonth: dashboardMetrics?.monthlySales || 0,
          lastMonth: 0, // TODO: Calculate from previous month data
          thisYear: dashboardMetrics?.totalSales || 0,
          lastYear: 0 // TODO: Calculate from previous year data
        },
        trends: {
          dailyData: dashboardMetrics?.salesByMonth?.slice(0, 7).map((item: any, index: number) => ({
            date: item.month || `Day ${index + 1}`,
            sales: item.sales || 0,
            transactions: item.transactions || 0
          })) || [],
          monthlyData: dashboardMetrics?.salesByMonth || []
        },
        goals: {
          daily: dailyGoal?.target_amount || parseInt(localStorage.getItem('local_daily_goal') || '0'),
          monthly: monthlyGoal?.target_amount || parseInt(localStorage.getItem('local_monthly_goal') || '0'),
          achieved: dailyProgress >= 1 || monthlyProgress >= 1,
          streak: 0 // TODO: Calculate from goal history
        },
        achievements: [
          ...(dailyProgress >= 1 ? [{
            id: 'daily-achieved',
            title: 'Daily Goal Achieved',
            description: 'Congratulations! You reached your daily sales goal.',
            achieved: true,
            icon: '🎯'
          }] : []),
          ...(monthlyProgress >= 1 ? [{
            id: 'monthly-achieved',
            title: 'Monthly Goal Achieved',
            description: 'Outstanding! You exceeded your monthly target.',
            achieved: true,
            icon: '🏆'
          }] : []),
          ...(dashboardMetrics?.totalTransactions && dashboardMetrics.totalTransactions > 0 ? [{
            id: 'first-sale',
            title: 'First Sale',
            description: 'Great start! You made your first sale.',
            achieved: true,
            icon: '🎉'
          }] : [])
        ]
      };

      console.log('Created performance data:', performanceData);

      setPerformanceData(performanceData);
    } catch (error) {
      console.error('Failed to load performance data:', error);
      // Set empty data when API fails
      setPerformanceData(null);
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadPerformanceData();
  }, [loadPerformanceData]);

  // Add a method to manually refresh data
  const refreshData = useCallback(() => {
    console.log('Manually refreshing performance data...');
    loadPerformanceData();
  }, [loadPerformanceData]);


  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4" />;
    if (growth < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Performance Data Available</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start making sales or set up goals to see your performance metrics and track your progress.
          </p>
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={refreshData}
              variant="outline"
            >
              Refresh Data
            </Button>
            <Button 
              onClick={() => setIsGoalModalOpen(true)}
              variant="primary"
            >
              Set Goals
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { daily, monthly, trends, goals, achievements } = performanceData;
  const dailyGrowth = calculateGrowth(daily.today, daily.yesterday);
  const monthlyGrowth = calculateGrowth(monthly.thisMonth, monthly.lastMonth);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className={`flex items-center space-x-1 ${getGrowthColor(dailyGrowth)}`}>
                  {getGrowthIcon(dailyGrowth)}
                  <span className="text-sm font-medium">{dailyGrowth > 0 ? '+' : ''}{dailyGrowth.toFixed(1)}%</span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Today's Sales</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₺{daily.today.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">vs ₺{daily.yesterday.toLocaleString()} yesterday</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
            <div className={`flex items-center space-x-1 ${getGrowthColor(monthlyGrowth)}`}>
              {getGrowthIcon(monthlyGrowth)}
              <span className="text-sm font-medium">{monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth.toFixed(1)}%</span>
                </div>
              </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">This Month</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">₺{monthly.thisMonth.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">vs ₺{monthly.lastMonth.toLocaleString()} last month</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex items-center space-x-1">
                  <span className={`text-sm font-medium ${daily.today >= goals.daily ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                    {Math.round((daily.today / goals.daily) * 100)}%
                  </span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Daily Goal</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">₺{goals.daily.toLocaleString()}</p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                daily.today >= goals.daily ? 'bg-green-500' : 'bg-orange-500'
              }`}
                  style={{ width: `${Math.min((daily.today / goals.daily) * 100, 100)}%` }}
                ></div>
              </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {Math.round((daily.today / goals.daily) * 100)}% complete
          </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm font-medium">{achievements.filter(a => a.achieved).length}</span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Achievements</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{achievements.filter(a => a.achieved).length}/{achievements.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">goals unlocked</p>
            </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sales Performance Trend
          </h3>
          {trends.monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                formatter={(value: number) => [`₺${value.toLocaleString()}`, 'Sales']}
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151', 
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
                labelStyle={{ color: '#F9FAFB' }}
              />
              <Line 
                type="monotone" 
                dataKey="sales" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p>No sales data available</p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Achievements</h3>
          {achievements.length > 0 ? (
          <div className="space-y-4">
            {achievements.map((achievement) => (
              <div 
                key={achievement.id}
                className={`flex items-center space-x-3 p-3 rounded-lg ${
                  achievement.achieved 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                    : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className={`text-2xl ${achievement.achieved ? '' : 'grayscale opacity-50'}`}>
                  {achievement.icon}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${achievement.achieved ? 'text-green-900 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {achievement.title}
                  </h4>
                  <p className={`text-sm ${achievement.achieved ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {achievement.description}
                  </p>
                </div>
                {achievement.achieved && (
                  <div className="text-green-600 dark:text-green-400">
                    <Trophy className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-2">🏆</div>
                <p>No achievements available yet</p>
                <p className="text-sm mt-1">Complete goals to unlock achievements</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Motivational Message */}
      <Card className="p-6 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-200 dark:border-primary-800">
        <div className="text-center">
          <div className="text-4xl mb-2">🚀</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {dailyGrowth > 0 ? "You're on fire! 🔥" : daily.today > 0 ? "Keep pushing forward! 💪" : "Ready to start your journey! 🌟"}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {dailyGrowth > 0 
              ? `Great job! You're ${dailyGrowth.toFixed(1)}% ahead of yesterday. Keep up the momentum!`
              : daily.today > 0 
                ? `Every day is a new opportunity to grow. Your consistency will pay off!`
                : `Start making sales to track your performance and unlock achievements!`
            }
          </p>
          <div className="flex justify-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsGoalModalOpen(true)}
            >
              Set Goals
            </Button>
            <Button 
              size="sm"
              onClick={refreshData}
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </Card>

      {/* Goal Setting Modal */}
      <GoalSettingModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        currentGoals={{
          daily: performanceData?.goals.daily || 1000,
          monthly: performanceData?.goals.monthly || 30000
        }}
        onSaveGoals={(goals) => {
          // Goals are already saved to backend in the modal
          // Just reload the performance data to reflect the new goals
          console.log('Goals saved, refreshing performance data...');
          refreshData();
        }}
      />
    </div>
  );
};
