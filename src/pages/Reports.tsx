import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Download,
  DollarSign,
  ShoppingCart,
  Package
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

export const Reports: React.FC = () => {
  const { products, dashboardMetrics, loading } = useApp();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<'sales' | 'inventory' | 'products'>('sales');

  useEffect(() => {
    const loadAnalytics = async () => {
      if (user?.store_id) {
        setIsLoading(true);
        try {
          // Load analytics data from backend
          const [salesAnalytics, productPerformance, inventoryAnalytics] = await Promise.all([
            apiService.getSalesAnalytics({ store_id: user.store_id }),
            apiService.getProductPerformance(user.store_id, selectedPeriod),
            apiService.getInventoryAnalytics(user.store_id)
          ]);
          setAnalyticsData({ salesAnalytics, productPerformance, inventoryAnalytics });
        } catch (error) {
          console.error('Failed to load analytics:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadAnalytics();
  }, [user?.store_id, selectedPeriod]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price);
  };

  // Real data from backend
  const salesData = analyticsData?.salesAnalytics?.salesByMonth || [];
  const paymentMethodData = analyticsData?.salesAnalytics?.paymentMethods || [];

  const topProductsData = dashboardMetrics?.topProducts?.map(product => ({
    name: product.productName.length > 15 
      ? product.productName.substring(0, 15) + '...' 
      : product.productName,
    revenue: product.revenue,
    quantity: product.quantitySold,
  })) || [];

  const inventoryStatusData = [
    { name: 'In Stock', value: (products || []).filter(p => p.stock_quantity > p.min_stock_level).length, color: '#22c55e' },
    { name: 'Low Stock', value: (products || []).filter(p => p.stock_quantity <= p.min_stock_level && p.stock_quantity > 0).length, color: '#f59e0b' },
    { name: 'Out of Stock', value: (products || []).filter(p => p.stock_quantity === 0).length, color: '#ef4444' },
  ];

  // Calculate metrics from real data
  const totalSales = dashboardMetrics?.totalSales || 0;
  const totalTransactions = dashboardMetrics?.totalTransactions || 0;
  const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
  const growthRate = dashboardMetrics?.growthRate || 0;

  const reportTabs = [
    { id: 'sales', label: 'Sales Report', icon: DollarSign },
    { id: 'inventory', label: 'Inventory Report', icon: Package },
    { id: 'products', label: 'Product Performance', icon: BarChart3 },
  ];

  const periodOptions = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' },
  ];

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-blue-50 opacity-50"></div>
            <div className="relative p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
                  <p className="text-gray-600">Analyze your business performance</p>
                </div>
              </div>
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" className="mr-4" />
                <span className="text-gray-500 text-lg">Loading reports data...</span>
              </div>
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
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
                    <p className="text-gray-600">Analyze your business performance with detailed insights</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{formatPrice(totalSales)} total sales</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>{totalTransactions} transactions</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>{products.length} products</span>
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Report Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Report Types</h2>
            <div className="flex flex-wrap gap-3">
              {reportTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedReport(tab.id as any)}
                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      selectedReport === tab.id
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Enhanced Period Filter */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-lg font-semibold text-gray-700">Report Period:</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {periodOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSelectedPeriod(option.value as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    selectedPeriod === option.value
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

      {/* Sales Report */}
      {selectedReport === 'sales' && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="text-center p-4 hover:shadow-md transition-shadow duration-200">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="text-xs font-medium text-gray-500 mb-1">Total Sales</h3>
              <p className="text-lg font-semibold text-gray-800">{formatPrice(totalSales)}</p>
            </Card>

            <Card className="text-center p-4 hover:shadow-md transition-shadow duration-200">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-xs font-medium text-gray-500 mb-1">Transactions</h3>
              <p className="text-lg font-semibold text-gray-800">{totalTransactions}</p>
            </Card>

            <Card className="text-center p-4 hover:shadow-md transition-shadow duration-200">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="text-xs font-medium text-gray-500 mb-1">Avg. Transaction</h3>
              <p className="text-lg font-semibold text-gray-800">{formatPrice(averageTransactionValue)}</p>
            </Card>

            <Card className="text-center p-4 hover:shadow-md transition-shadow duration-200">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </div>
              <h3 className="text-xs font-medium text-gray-500 mb-1">Growth Rate</h3>
              <p className="text-lg font-semibold text-gray-800">{growthRate > 0 ? '+' : ''}{growthRate.toFixed(1)}%</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
              <div className="h-64">
                {salesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number) => [formatPrice(value), 'Sales']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No sales data available
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
              <div className="h-64">
                {paymentMethodData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentMethodData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Percentage']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No payment method data available
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

        {/* Inventory Report */}
        {selectedReport === 'inventory' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Status</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {inventoryStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Products']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Value by Category</h3>
                <div className="h-64">
                  {(() => {
                    // Calculate real category data from products
                    const categoryData = (products || []).reduce((acc: any, product) => {
                      const category = product.category || 'Other';
                      if (!acc[category]) {
                        acc[category] = { category, value: 0, count: 0 };
                      }
                      acc[category].value += product.price * product.stock_quantity;
                      acc[category].count += 1;
                      return acc;
                    }, {});
                    
                    const categoryArray = Object.values(categoryData);
                    
                    return categoryArray.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryArray}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`} />
                          <Tooltip 
                            formatter={(value: number) => [formatPrice(value), 'Value']}
                          />
                          <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        No category data available
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Product Performance Report */}
        {selectedReport === 'products' && (
          <>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Products</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => [formatPrice(value), 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Categories</h3>
                <div className="space-y-3">
                  {(() => {
                    // Calculate real category data from products
                    const categoryData = (products || []).reduce((acc: any, product) => {
                      const category = product.category || 'Other';
                      if (!acc[category]) {
                        acc[category] = { category, count: 0, value: 0 };
                      }
                      acc[category].count += 1;
                      acc[category].value += product.price * product.stock_quantity;
                      return acc;
                    }, {});
                    
                    const categoryArray = Object.values(categoryData);
                    
                    return categoryArray.length > 0 ? (
                      categoryArray.map((cat: any) => (
                        <div key={cat.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">{cat.category}</span>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {cat.count} products
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatPrice(cat.value)} value
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No category data available
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Low Stock Products</h3>
                <div className="space-y-3">
                  {(products || []).filter(p => p.stock_quantity <= p.min_stock_level).slice(0, 5).map(product => (
                    <div key={product._id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-red-600">
                          {product.stock_quantity} remaining (min: {product.min_stock_level})
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                        {product.stock_quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
