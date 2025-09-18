import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  AlertTriangle,
  Receipt
} from 'lucide-react';

const navigationItems = [
  { path: '/dashboard', icon: Home, label: 'Dashboard' },
  { path: '/products', icon: Package, label: 'Products' },
  { path: '/pos', icon: ShoppingCart, label: 'POS', isSpecial: true },
  { path: '/inventory', icon: AlertTriangle, label: 'Inventory' },
  { path: '/expenses', icon: Receipt, label: 'Expenses' },
  { path: '/reports', icon: BarChart3, label: 'Reports' },
];

export const MobileNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
      <div className="flex justify-around items-center py-3 px-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
                          (item.path === '/pos' && location.pathname === '/');
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center py-3 px-4 rounded-xl transition-all duration-300 min-w-0 flex-1 mx-1 ${
                isActive 
                  ? item.isSpecial
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl transform scale-110 border-2 border-green-400'
                    : 'bg-primary-100 text-primary-600 shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:shadow-sm'
              }`}
            >
              <Icon className={`h-6 w-6 mb-2 ${isActive && item.isSpecial ? 'text-white' : ''}`} />
              <span className={`text-xs font-semibold leading-tight ${isActive && item.isSpecial ? 'text-white font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
