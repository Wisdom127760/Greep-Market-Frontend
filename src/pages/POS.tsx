import React, { useState, useMemo } from 'react';
import { CreditCard, Banknote, Smartphone, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SearchBar } from '../components/ui/SearchBar';
import { ProductCard } from '../components/ui/ProductCard';
import { ShoppingCartComponent } from '../components/ui/ShoppingCart';
import { Modal } from '../components/ui/Modal';
import { BarcodeScanner } from '../components/ui/BarcodeScanner';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { TransactionItem } from '../types';

export const POS: React.FC = () => {
  const { products, addTransaction, updateInventory } = useApp();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Debug user information
  console.log('POS - User info:', { user, isAuthenticated, isLoading });
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<TransactionItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'pos' | 'transfer'>('cash');
  const [customerId, setCustomerId] = useState('');
  const [discount, setDiscount] = useState('');

  const filteredProducts = useMemo(() => {
    if (!products || !Array.isArray(products)) {
      return [];
    }
    if (!searchQuery.trim()) {
      return products;
    }
    
    const searchLower = searchQuery.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(searchLower) ||
      product.barcode?.toLowerCase().includes(searchLower) ||
      product.sku.toLowerCase().includes(searchLower) ||
      product.category.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower) ||
      product.tags?.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }, [products, searchQuery]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.total_price, 0);
  }, [cartItems]);

  const finalTotal = useMemo(() => {
    const discountAmount = parseFloat(discount) || 0;
    return Math.max(0, cartTotal - discountAmount);
  }, [cartTotal, discount]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleBarcodeScan = (barcode: string) => {
    if (!products || !Array.isArray(products)) {
      toast.error('Products not loaded');
      return;
    }
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      toast.success(`Added ${product.name} to cart`);
    } else {
      toast.error('Product not found');
    }
  };

  const addToCart = (product: any) => {
    console.log('Adding product to cart:', product);
    
    if (product.stock_quantity === 0) {
      toast.error('Product is out of stock');
      return;
    }

    const existingItem = cartItems.find(item => item.product_id === product._id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast.error('Not enough stock available');
        return;
      }
      console.log('Updating existing item quantity');
      updateCartItemQuantity(product._id, existingItem.quantity + 1);
    } else {
      const newItem: TransactionItem = {
        _id: '',
        product_id: product._id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price,
      };
      console.log('Adding new item to cart:', newItem);
      setCartItems([...cartItems, newItem]);
      toast.success(`Added ${product.name} to cart`);
    }
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    console.log('Updating cart item quantity:', productId, quantity);
    
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (!products || !Array.isArray(products)) {
      toast.error('Products not loaded');
      return;
    }

    const product = products.find(p => p._id === productId);
    if (product && quantity > product.stock_quantity) {
      toast.error('Not enough stock available');
      return;
    }

    const updatedItems = cartItems.map(item => 
      item.product_id === productId 
        ? { ...item, quantity, total_price: item.unit_price * quantity }
        : item
    );
    
    console.log('Updated cart items:', updatedItems);
    setCartItems(updatedItems);
  };

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscount('');
  };

  const updateInventoryForSale = async (productId: string, quantitySold: number) => {
    try {
      // Get the current product to calculate new stock
      const product = products?.find(p => p._id === productId);
      if (product) {
        const newStock = product.stock_quantity - quantitySold;
        await updateInventory(productId, newStock);
      }
    } catch (error) {
      console.error('Failed to update inventory:', error);
      toast.error('Failed to update inventory');
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const processPayment = async () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Validate required user data
    if (!user?.id) {
      toast.error('User ID is missing. Please log in again.');
      return;
    }
    
    // Use default store if user doesn't have a store_id assigned
    const storeId = user?.store_id || 'default-store';

    try {
      // Create transaction record with all required fields
      const transaction = {
        store_id: storeId,
        cashier_id: user.id,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        discount_amount: parseFloat(discount) || 0,
        payment_method: selectedPaymentMethod,
        customer_id: customerId || undefined,
      };

      console.log('Creating transaction:', transaction);
      await addTransaction(transaction);

      // Update inventory - reduce stock for sold items
      if (products && Array.isArray(products)) {
        for (const item of cartItems) {
          const product = products.find(p => p._id === item.product_id);
          if (product) {
            await updateInventoryForSale(item.product_id, item.quantity);
          }
        }
      }

      // Clear cart and close modal
      clearCart();
      setIsPaymentModalOpen(false);
      setCustomerId('');
      setDiscount('');
      setSelectedPaymentMethod('cash');

      toast.success(`Sale completed! Total: ₺${finalTotal.toFixed(2)}`);
    } catch (error) {
      console.error('Payment processing failed:', error);
      toast.error('Failed to process payment. Please try again.');
    }
  };

  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: Banknote, color: 'text-green-600' },
    { id: 'pos', label: 'POS/Card', icon: CreditCard, color: 'text-blue-600' },
    { id: 'transfer', label: 'Transfer', icon: Smartphone, color: 'text-purple-600' },
  ];

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-primary-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading POS System</h1>
              <p className="text-gray-600">Please wait while we verify your authentication...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
              <p className="text-gray-600 mb-6">You need to be logged in to access the POS system.</p>
              <Button 
                onClick={() => window.location.href = '/login'}
                className="bg-primary-600 hover:bg-primary-700"
              >
                Go to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Modern Header */}
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-blue-50 opacity-50"></div>
          <div className="relative p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
                    <p className="text-gray-600">Process customer transactions quickly and efficiently</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{filteredProducts.length} products available</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>{cartItems.length} items in cart</span>
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => setIsScannerOpen(true)}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Scan Barcode
                </Button>
                <Button 
                  onClick={handleCheckout}
                  disabled={cartItems.length === 0}
                  className="w-full sm:w-auto bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Checkout
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Products Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enhanced Search Bar */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Products</h2>
                  <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                    {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
                  </span>
                </div>
                <SearchBar
                  placeholder="Search products or scan barcode..."
                  onSearch={handleSearch}
                  onBarcodeScan={() => setIsScannerOpen(true)}
                  enableRealTime={true}
                  debounceMs={200}
                  showBarcodeButton={true}
                />
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    onAddToCart={addToCart}
                    showActions={true}
                    showStockAlert={true}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <X className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No products found</h3>
                  <p className="text-gray-500 mb-8 leading-relaxed">
                    Try adjusting your search terms or scan a barcode to find products.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      variant="outline"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear Search
                    </Button>
                    <Button 
                      onClick={() => setIsScannerOpen(true)}
                      className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      Scan Barcode
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Shopping Cart Section */}
          <div className="lg:col-span-1">
            <ShoppingCartComponent
              items={cartItems}
              onUpdateQuantity={updateCartItemQuantity}
              onRemoveItem={removeFromCart}
              onClearCart={clearCart}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Payment"
        size="md"
      >
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
            <div className="space-y-2">
              {cartItems.map(item => (
                <div key={item.product_id} className="flex justify-between text-sm">
                  <span>{item.product_name} x {item.quantity}</span>
                  <span>₺{item.total_price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-2 mt-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₺{cartTotal.toFixed(2)}</span>
              </div>
              {parseFloat(discount) > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Discount:</span>
                  <span>-₺{parseFloat(discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span>₺{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount (₺)
            </label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Customer ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer ID (Optional)
            </label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Enter customer ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              {paymentMethods.map(method => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id as any)}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      selectedPaymentMethod === method.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-6 w-6 mx-auto mb-2 ${method.color}`} />
                    <span className="text-sm font-medium">{method.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsPaymentModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={processPayment}
              className="flex-1"
            >
              Process Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
        onError={(error) => toast.error(`Scanner error: ${error}`)}
      />
    </div>
  );
};
