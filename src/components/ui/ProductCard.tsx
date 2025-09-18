import React from 'react';
import { Package, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  showActions?: boolean;
  showStockAlert?: boolean;
  isSelected?: boolean;
  onSelect?: (productId: string) => void;
  showSelection?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete,
  onAddToCart,
  showActions = true,
  showStockAlert = true,
  isSelected = false,
  onSelect,
  showSelection = false,
}) => {
  const isLowStock = product.stock_quantity <= product.min_stock_level;
  const isOutOfStock = product.stock_quantity === 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price);
  };

  return (
    <div className={`group relative bg-white rounded-2xl shadow-lg border transition-all duration-300 overflow-hidden ${
      isSelected 
        ? 'border-primary-500 shadow-primary-200 shadow-lg' 
        : 'border-gray-100 hover:shadow-xl hover:border-primary-200'
    }`}>
      {/* Selection Checkbox */}
      {showSelection && (
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => onSelect?.(product._id)}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            {isSelected ? (
              <CheckSquare className="h-5 w-5 text-primary-600" />
            ) : (
              <Square className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      )}
      
      {/* Stock Alert Badge */}
      {showStockAlert && (isLowStock || isOutOfStock) && (
        <div className={`absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
          isOutOfStock 
            ? 'bg-red-500 text-white' 
            : 'bg-yellow-500 text-white'
        }`}>
          <AlertTriangle className="inline h-3 w-3 mr-1" />
          {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
        </div>
      )}
      
      {/* Product Image */}
      <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images.find(img => img.is_primary)?.url || product.images[0].url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      
      {/* Product Info */}
      <div className="p-5">
        <div className="space-y-3">
          {/* Product Name & Category */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-1">
              {product.name}
            </h3>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded-lg text-xs font-medium">
                {product.category}
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">{product.unit}</span>
            </div>
          </div>
          
          {/* Description */}
          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
          
          {/* Price */}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary-600">
              {formatPrice(product.price)}
            </span>
            <div className="text-right">
              <div className="text-sm text-gray-500">Stock</div>
              <span className={`text-sm font-semibold ${
                isOutOfStock 
                  ? 'text-red-600' 
                  : isLowStock 
                    ? 'text-yellow-600' 
                    : 'text-green-600'
              }`}>
                {product.stock_quantity} {product.unit}
              </span>
            </div>
          </div>
          
          {/* Barcode */}
          {product.barcode && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Barcode:</span>
                <span className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                  {product.barcode}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        {showActions && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex space-x-2">
              {onAddToCart && (
                <Button
                  size="sm"
                  onClick={() => onAddToCart(product)}
                  disabled={isOutOfStock}
                  className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
                >
                  Add to Cart
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(product)}
                  className="px-4 border-gray-200 hover:border-primary-300 hover:text-primary-600"
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(product)}
                  className="px-4 bg-red-500 hover:bg-red-600"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
