import { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

export const useNotificationDemo = () => {
  const { addNotification } = useNotifications();

  useEffect(() => {
    // Add some demo notifications after a short delay
    const timer1 = setTimeout(() => {
      addNotification({
        type: 'warning',
        title: 'Low Stock Alert',
        message: 'Nigerian Rice is running low (5 items remaining)',
        action: {
          label: 'Restock now',
          onClick: () => console.log('Navigate to inventory'),
        },
      });
    }, 2000);

    const timer2 = setTimeout(() => {
      addNotification({
        type: 'success',
        title: 'Sale Completed',
        message: 'Transaction #12345 completed successfully',
      });
    }, 5000);

    const timer3 = setTimeout(() => {
      addNotification({
        type: 'info',
        title: 'Daily Report Ready',
        message: 'Your daily sales report is now available',
        action: {
          label: 'View report',
          onClick: () => console.log('Navigate to reports'),
        },
      });
    }, 8000);

    const timer4 = setTimeout(() => {
      addNotification({
        type: 'error',
        title: 'Connection Issue',
        message: 'Temporary connection problems detected',
      });
    }, 12000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [addNotification]);
};
