import React, { useState } from 'react';
import { X, Target, Trophy, Calendar, DollarSign } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { apiService } from '../../services/api';

interface GoalSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoals: {
    daily: number;
    monthly: number;
  };
  onSaveGoals: (goals: { daily: number; monthly: number }) => void;
}

export const GoalSettingModal: React.FC<GoalSettingModalProps> = ({
  isOpen,
  onClose,
  currentGoals,
  onSaveGoals,
}) => {
  const [dailyGoal, setDailyGoal] = useState(
    currentGoals.daily > 0 
      ? currentGoals.daily.toString() 
      : localStorage.getItem('local_daily_goal') || '0'
  );
  const [monthlyGoal, setMonthlyGoal] = useState(
    currentGoals.monthly > 0 
      ? currentGoals.monthly.toString() 
      : localStorage.getItem('local_monthly_goal') || '0'
  );

  React.useEffect(() => {
    if (isOpen) {
      const dailyValue = currentGoals.daily > 0 
        ? currentGoals.daily.toString() 
        : localStorage.getItem('local_daily_goal') || '0';
      const monthlyValue = currentGoals.monthly > 0 
        ? currentGoals.monthly.toString() 
        : localStorage.getItem('local_monthly_goal') || '0';
      
      setDailyGoal(dailyValue);
      setMonthlyGoal(monthlyValue);
    }
  }, [isOpen, currentGoals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const daily = parseFloat(dailyGoal);
    const monthly = parseFloat(monthlyGoal);
    
    if (isNaN(daily) || daily <= 0) {
      alert('Please enter a valid daily goal');
      return;
    }
    
    if (isNaN(monthly) || monthly <= 0) {
      alert('Please enter a valid monthly goal');
      return;
    }

    try {
      // Check if user is authenticated before making API calls
      if (!apiService.isAuthenticated()) {
        // User is not authenticated, save goals locally
        localStorage.setItem('local_daily_goal', daily.toString());
        localStorage.setItem('local_monthly_goal', monthly.toString());
        onSaveGoals({ daily, monthly });
        onClose();
        alert('Goals saved locally. Please log in to sync with the server.');
        return;
      }

      // Create goals in the backend with proper date handling
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Create both goals simultaneously
      const [dailyGoalResult, monthlyGoalResult] = await Promise.all([
        apiService.createGoal({
          goal_type: 'daily',
          target_amount: daily,
          currency: 'TRY',
          period_start: startOfDay.toISOString(),
          period_end: endOfDay.toISOString()
        }),
        apiService.createGoal({
          goal_type: 'monthly',
          target_amount: monthly,
          currency: 'TRY',
          period_start: startOfMonth.toISOString(),
          period_end: endOfMonth.toISOString()
        })
      ]);

      console.log('Goals created successfully:', { dailyGoalResult, monthlyGoalResult });
      onSaveGoals({ daily, monthly });
      onClose();
    } catch (error: any) {
      console.error('Failed to save goals:', error);
      
      // Handle authentication errors gracefully - check multiple error formats
      const isAuthError = error?.message?.includes('Access token required') || 
                         error?.message?.includes('Unauthorized') ||
                         error?.error?.details?.statusCode === 401 ||
                         error?.status === 401;
      
      if (isAuthError) {
        alert('Please log in to set goals. Goals are saved locally for now.');
        // Save goals locally as fallback
        localStorage.setItem('local_daily_goal', daily.toString());
        localStorage.setItem('local_monthly_goal', monthly.toString());
        onSaveGoals({ daily, monthly });
        onClose();
      } else {
        alert('Failed to save goals. Please try again.');
      }
    }
  };

  const handleClose = () => {
    setDailyGoal(currentGoals.daily.toString());
    setMonthlyGoal(currentGoals.monthly.toString());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Set Your Goals</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Motivate yourself with achievable targets</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Close modal"
            aria-label="Close goal setting modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="dailyGoal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Daily Sales Goal
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <Input
                id="dailyGoal"
                type="number"
                step="0.01"
                min="0"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                placeholder="Enter daily goal"
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Target sales amount for each day
            </p>
          </div>

          <div>
            <label htmlFor="monthlyGoal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monthly Sales Goal
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <Input
                id="monthlyGoal"
                type="number"
                step="0.01"
                min="0"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(e.target.value)}
                placeholder="Enter monthly goal"
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Target sales amount for each month
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Pro Tip:</p>
                <p>Set realistic but challenging goals. Aim for 10-20% growth over your current performance.</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              Save Goals
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
