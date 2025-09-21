import React from 'react';
import { LucideIcon } from 'lucide-react';

interface GlassmorphismIconProps {
  icon: LucideIcon;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'active' | 'special' | 'subtle' | 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'red';
  className?: string;
  onClick?: () => void;
}

export const GlassmorphismIcon: React.FC<GlassmorphismIconProps> = ({
  icon: Icon,
  size = 'md',
  variant = 'default',
  className = '',
  onClick,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8',
  };

  const containerSizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3',
  };

  const variantClasses = {
    default: 'bg-white/15 backdrop-blur-lg border border-white/25 text-gray-700 dark:text-gray-300 shadow-lg shadow-black/5',
    active: 'bg-primary-500/15 backdrop-blur-lg border border-primary-400/30 text-primary-600 dark:text-primary-400 shadow-lg shadow-primary-500/20',
    special: 'bg-gradient-to-br from-green-500/15 to-emerald-500/15 backdrop-blur-lg border border-green-400/30 text-green-600 dark:text-green-400 shadow-lg shadow-green-500/20',
    subtle: 'bg-gray-100/20 backdrop-blur-md border border-gray-200/30 text-gray-600 dark:text-gray-400 shadow-md shadow-gray-500/10',
    purple: 'bg-gradient-to-br from-purple-500/15 to-violet-500/15 backdrop-blur-lg border border-purple-400/30 text-purple-600 dark:text-purple-400 shadow-lg shadow-purple-500/20',
    blue: 'bg-gradient-to-br from-blue-500/15 to-cyan-500/15 backdrop-blur-lg border border-blue-400/30 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/20',
    green: 'bg-gradient-to-br from-green-500/15 to-teal-500/15 backdrop-blur-lg border border-green-400/30 text-green-600 dark:text-green-400 shadow-lg shadow-green-500/20',
    orange: 'bg-gradient-to-br from-orange-500/15 to-amber-500/15 backdrop-blur-lg border border-orange-400/30 text-orange-600 dark:text-orange-400 shadow-lg shadow-orange-500/20',
    pink: 'bg-gradient-to-br from-pink-500/15 to-rose-500/15 backdrop-blur-lg border border-pink-400/30 text-pink-600 dark:text-pink-400 shadow-lg shadow-pink-500/20',
    red: 'bg-gradient-to-br from-red-500/15 to-pink-500/15 backdrop-blur-lg border border-red-400/30 text-red-600 dark:text-red-400 shadow-lg shadow-red-500/20',
  };

  const baseClasses = `
    inline-flex items-center justify-center
    rounded-2xl
    transition-all duration-300 ease-in-out
    hover:scale-110 hover:shadow-xl hover:shadow-black/10
    active:scale-95
    ${containerSizes[size]}
    ${variantClasses[variant]}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim();

  return (
    <div className={baseClasses} onClick={onClick}>
      <Icon className={`${sizeClasses[size]} transition-transform duration-200 drop-shadow-sm`} />
    </div>
  );
};

// Helper function for color classes
const getColorClasses = (color: string, isActive: boolean) => {
  const baseClasses = 'backdrop-blur-lg shadow-lg hover:shadow-xl';
  const activeModifier = isActive ? 'shadow-xl' : 'shadow-md';
  
  switch (color) {
    case 'purple':
      return `bg-gradient-to-br from-purple-500/15 to-violet-500/15 border border-purple-400/30 shadow-purple-500/20 hover:shadow-purple-500/30 ${baseClasses} ${activeModifier}`;
    case 'blue':
      return `bg-gradient-to-br from-blue-500/15 to-cyan-500/15 border border-blue-400/30 shadow-blue-500/20 hover:shadow-blue-500/30 ${baseClasses} ${activeModifier}`;
    case 'green':
      return `bg-gradient-to-br from-green-500/15 to-teal-500/15 border border-green-400/30 shadow-green-500/20 hover:shadow-green-500/30 ${baseClasses} ${activeModifier}`;
    case 'orange':
      return `bg-gradient-to-br from-orange-500/15 to-amber-500/15 border border-orange-400/30 shadow-orange-500/20 hover:shadow-orange-500/30 ${baseClasses} ${activeModifier}`;
    case 'pink':
      return `bg-gradient-to-br from-pink-500/15 to-rose-500/15 border border-pink-400/30 shadow-pink-500/20 hover:shadow-pink-500/30 ${baseClasses} ${activeModifier}`;
    case 'red':
      return `bg-gradient-to-br from-red-500/15 to-pink-500/15 border border-red-400/30 shadow-red-500/20 hover:shadow-red-500/30 ${baseClasses} ${activeModifier}`;
    default:
      return isActive 
        ? 'bg-primary-500/15 border border-primary-400/30 shadow-primary-500/20 hover:shadow-primary-500/30 backdrop-blur-lg shadow-lg hover:shadow-xl'
        : 'bg-white/10 border border-white/20 shadow-black/5 hover:bg-white/15 hover:shadow-lg hover:shadow-black/10 backdrop-blur-md shadow-md';
  }
};

// Helper function for icon container classes
const getIconContainerClasses = (color: string, isActive: boolean) => {
  switch (color) {
    case 'purple':
      return `bg-purple-500/20 backdrop-blur-sm border border-purple-400/40`;
    case 'blue':
      return `bg-blue-500/20 backdrop-blur-sm border border-blue-400/40`;
    case 'green':
      return `bg-green-500/20 backdrop-blur-sm border border-green-400/40`;
    case 'orange':
      return `bg-orange-500/20 backdrop-blur-sm border border-orange-400/40`;
    case 'pink':
      return `bg-pink-500/20 backdrop-blur-sm border border-pink-400/40`;
    case 'red':
      return `bg-red-500/20 backdrop-blur-sm border border-red-400/40`;
    default:
      return isActive 
        ? 'bg-primary-500/20 backdrop-blur-sm border border-primary-400/40'
        : 'bg-white/15 backdrop-blur-sm border border-white/25';
  }
};

// Helper function for icon color classes
const getIconColorClasses = (color: string, isActive: boolean) => {
  switch (color) {
    case 'purple':
      return 'text-purple-600 dark:text-purple-400';
    case 'blue':
      return 'text-blue-600 dark:text-blue-400';
    case 'green':
      return 'text-green-600 dark:text-green-400';
    case 'orange':
      return 'text-orange-600 dark:text-orange-400';
    case 'pink':
      return 'text-pink-600 dark:text-pink-400';
    case 'red':
      return 'text-red-600 dark:text-red-400';
    default:
      return isActive 
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200';
  }
};

// Helper function for text color classes
const getTextColorClasses = (color: string, isActive: boolean) => {
  switch (color) {
    case 'purple':
      return isActive ? 'text-purple-700 dark:text-purple-300' : 'text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200';
    case 'blue':
      return isActive ? 'text-blue-700 dark:text-blue-300' : 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200';
    case 'green':
      return isActive ? 'text-green-700 dark:text-green-300' : 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200';
    case 'orange':
      return isActive ? 'text-orange-700 dark:text-orange-300' : 'text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200';
    case 'pink':
      return isActive ? 'text-pink-700 dark:text-pink-300' : 'text-pink-600 dark:text-pink-400 hover:text-pink-800 dark:hover:text-pink-200';
    case 'red':
      return isActive ? 'text-red-700 dark:text-red-300' : 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200';
    default:
      return isActive 
        ? 'text-primary-700 dark:text-primary-300'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200';
  }
};

// Specialized glassmorphism icon variants
export const GlassmorphismButton: React.FC<{
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isSpecial?: boolean;
  color?: 'default' | 'purple' | 'blue' | 'green' | 'orange' | 'pink' | 'red';
  onClick: () => void;
  className?: string;
}> = ({ icon: Icon, label, isActive, isSpecial, color = 'default', onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center
        py-3 px-4 rounded-2xl
        transition-all duration-300 ease-in-out
        hover:scale-105 active:scale-95
        min-w-0 flex-1 mx-1
        ${isSpecial 
          ? 'bg-gradient-to-br from-green-500/15 to-emerald-500/15 backdrop-blur-lg border border-green-400/30 shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30' 
          : isActive 
            ? getColorClasses(color, true)
            : getColorClasses(color, false)
        }
        ${className}
      `.trim()}
    >
      <div className={`p-2 rounded-xl mb-2 transition-all duration-200 ${
        isSpecial 
          ? 'bg-green-500/20 backdrop-blur-sm border border-green-400/40' 
          : getIconContainerClasses(color, isActive || false)
      }`}>
        <Icon className={`h-5 w-5 transition-colors duration-200 drop-shadow-sm ${
          isSpecial 
            ? 'text-green-600 dark:text-green-400' 
            : getIconColorClasses(color, isActive || false)
        }`} />
      </div>
      <span className={`text-xs font-semibold leading-tight transition-colors duration-200 ${
        isSpecial 
          ? 'text-green-700 dark:text-green-300 font-bold' 
          : getTextColorClasses(color, isActive || false)
      }`}>
        {label}
      </span>
    </button>
  );
};
