import React, { useState } from 'react';
import Lottie from 'lottie-react';
import animationData from '../../assets/Frame-1.json';
import simpleLoaderData from '../../assets/simple-loader.json';
import simpleSpinnerData from '../../assets/simple-spinner.json';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const [hasError, setHasError] = useState(false);
  const [useSimpleLoader, setUseSimpleLoader] = useState(false);
  const [useSimpleSpinner, setUseSimpleSpinner] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  // Fallback CSS spinner
  const FallbackSpinner = () => (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center`}>
      <div className="animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 w-full h-full"></div>
    </div>
  );

  if (hasError) {
    return <FallbackSpinner />;
  }

  const currentAnimationData = useSimpleSpinner ? simpleSpinnerData : 
                              useSimpleLoader ? simpleLoaderData : animationData;

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <Lottie
        animationData={currentAnimationData}
        loop={true}
        autoplay={true}
        className="w-full h-full"
        onError={(error) => {
          console.error('Lottie animation failed to load:', error);
          if (!useSimpleLoader && !useSimpleSpinner) {
            setUseSimpleLoader(true);
          } else if (!useSimpleSpinner) {
            setUseSimpleSpinner(true);
          } else {
            setHasError(true);
          }
        }}
      />
    </div>
  );
};
