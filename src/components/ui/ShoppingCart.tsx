import React from 'react';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { TransactionItem } from '../../types';

interface ShoppingCartProps {
  items: TransactionItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  className?: string;
}

export const ShoppingCartComponent: React.FC<ShoppingCartProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  className = '',
}) => {
  const total = items.reduce((sum, item) => sum + item.total_price, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price);
  };

  if (items.length === 0) {
    return (
      <Card className={`text-center py-8 ${className}`}>
        <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
        <p className="text-gray-500">Add some products to get started</p>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Shopping Cart ({items.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onClearCart}
        >
          Clear All
        </Button>
      </div>

      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <div
            key={item.product_id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{item.product_name}</h4>
              <p className="text-sm text-gray-500">
                {formatPrice(item.unit_price)} each
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="!p-1"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                  className="!p-1"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="text-right min-w-0">
                <p className="font-semibold text-gray-900">
                  {formatPrice(item.total_price)}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onRemoveItem(item.product_id)}
                className="!p-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg font-semibold text-gray-900">Total:</span>
          <span className="text-xl font-bold text-primary-600">
            {formatPrice(total)}
          </span>
        </div>

        <Button
          onClick={onCheckout}
          className="w-full"
          size="lg"
        >
          Checkout
        </Button>
      </div>
    </Card>
  );
};
