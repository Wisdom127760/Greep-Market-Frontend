import React from 'react';
import Lottie from 'lottie-react';
import animationData from '../../assets/Frame-1.json';

interface CheckoutLoaderProps {
  isVisible: boolean;
  message?: string;
}

export const CheckoutLoader: React.FC<CheckoutLoaderProps> = ({ 
  isVisible, 
  message = "Processing your order..." 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
        <div className="mb-6">
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
            className="w-30 h-30 mx-auto"
          />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Processing Order
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {message}
        </p>
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-primary-500 h-2 rounded-full animate-pulse w-3/5"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
