import React from 'react';
import { X, TrendingUp, TrendingDown, Calendar, User, FileText } from 'lucide-react';
import { Modal } from './Modal';
import { PriceHistory } from '../../types';

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  priceHistory: PriceHistory[];
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  isOpen,
  onClose,
  productName,
  priceHistory,
}) => {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriceChangeIcon = (oldPrice: number, newPrice: number) => {
    if (newPrice > oldPrice) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
  };

  const getPriceChangeColor = (oldPrice: number, newPrice: number) => {
    if (newPrice > oldPrice) {
      return 'text-red-600';
    } else {
      return 'text-green-600';
    }
  };

  const calculatePriceChange = (oldPrice: number, newPrice: number) => {
    const change = newPrice - oldPrice;
    const percentChange = oldPrice > 0 ? ((change / oldPrice) * 100) : 0;
    return { change, percentChange };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Price History</h2>
              <p className="text-sm text-gray-500">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close modal"
            aria-label="Close price history modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {priceHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No price history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {priceHistory
                .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
                .map((history, index) => {
                  const { change, percentChange } = calculatePriceChange(history.old_price, history.new_price);
                  const isLatest = index === 0;
                  
                  return (
                    <div
                      key={history._id}
                      className={`border rounded-lg p-4 transition-all ${
                        isLatest 
                          ? 'border-primary-200 bg-primary-50' 
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isLatest ? 'bg-primary-100' : 'bg-gray-100'
                          }`}>
                            {getPriceChangeIcon(history.old_price, history.new_price)}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">From:</span>
                                <span className="font-semibold text-gray-900">
                                  ${history.old_price.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-500">To:</span>
                                <span className="font-semibold text-gray-900">
                                  ${history.new_price.toFixed(2)}
                                </span>
                              </div>
                              <div className={`flex items-center space-x-1 ${getPriceChangeColor(history.old_price, history.new_price)}`}>
                                <span className="text-sm font-medium">
                                  {change > 0 ? '+' : ''}${Math.abs(change).toFixed(2)}
                                </span>
                                <span className="text-xs">
                                  ({percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(history.changed_at)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>User ID: {history.changed_by}</span>
                              </div>
                            </div>
                            
                            {history.change_reason && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                                <span className="font-medium">Reason:</span> {history.change_reason}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {isLatest && (
                          <div className="ml-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                              Latest
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
