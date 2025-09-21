import React, { useState } from 'react';
import { Bell, User, LogOut, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../context/StoreContext';
// import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { inventoryAlerts } = useApp();
  const { user, logout, isLoading } = useAuth();
  const { currentStore } = useStore();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const alertCount = inventoryAlerts.length;

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    setShowUserMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
    
            <img src="./icons/GreepMarket-Green_BG-White.svg" alt="Greep Market" className="h-12 w-12 text-white" />
          
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {currentStore?.name || 'Greep Market'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentStore?.address || 'Retail Management System'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {alertCount > 0 && (
            <div className="relative">
              <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white relative">
                <Bell className="h-5 w-5" />
                {alertCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-600" />
              </div>
              <div className="text-left hidden sm:block">
                {isLoading ? (
                  <>
                    <p className="text-sm font-medium text-gray-900 dark:text-white animate-pulse">
                      Loading...
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                      Loading...
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                  </>
                )}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 transition-colors duration-200">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  {isLoading ? (
                    <>
                      <p className="text-sm font-medium text-gray-900 dark:text-white animate-pulse">
                        Loading...
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                        Loading...
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </>
                  )}
                </div>
                <button 
                  onClick={handleSettingsClick}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors duration-200"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
