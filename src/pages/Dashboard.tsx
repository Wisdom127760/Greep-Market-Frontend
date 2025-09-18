import React from 'react';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  DollarSign,
  ShoppingCart,
  BarChart3
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useApp } from '../context/AppContext';
// import { useAuth } from '../context/AuthContext';
// import { apiService } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const Dashboard: React.FC = () => {
  const { dashboardMetrics, inventoryAlerts, sales, loading } = useApp();
  // const { user } = useAuth();
  // const [analyticsData, setAnalyticsData] = useState<any>(null);
  // const [isLoading, setIsLoading] = useState(false);

  // useEffect(() => {
  //   const loadAnalytics = async () => {
  //     if (user?.store_id) {
  //       setIsLoading(true);
  //       try {
  //         const [salesAnalytics, productPerformance] = await Promise.all([
  //           apiService.getSalesAnalytics({ store_id: user.store_id }),
  //           apiService.getProductPerformance(user.store_id, 'week')
  //         ]);
  //         setAnalyticsData({ salesAnalytics, productPerformance });
  //       } catch (error) {
  //         console.error('Failed to load analytics:', error);
  //       } finally {
  //         setIsLoading(false);
  //       }
  //     }
  //   };

  //   loadAnalytics();
  // }, [user?.store_id]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price);
  };

  // Use real sales data from the API
  const salesData = dashboardMetrics?.salesByMonth?.map(item => ({
    month: item.month,
    sales: item.sales
  })) || [];

  const topProductsData = dashboardMetrics?.topProducts?.map(product => ({
    name: product.productName.length > 15 
      ? product.productName.substring(0, 15) + '...' 
      : product.productName,
    revenue: product.revenue,
    quantity: product.quantitySold,
  })) || [];

  const metricCards = [
    {
      title: 'Total Sales',
      value: formatPrice(dashboardMetrics?.totalSales || 0),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Today Sales',
      value: formatPrice(dashboardMetrics?.todaySales || 0),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Products',
      value: (dashboardMetrics?.totalProducts || 0).toString(),
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Low Stock Items',
      value: (dashboardMetrics?.lowStockItems || 0).toString(),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-gray-800 mb-1">Dashboard</h1>
              <p className="text-base text-gray-500">Welcome to Greep Market Management System</p>
            </div>
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" className="mr-3" />
              <span className="text-gray-500">Loading dashboard data...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-800 mb-1">Dashboard</h1>
            <p className="text-base text-gray-500">Welcome to Greep Market Management System</p>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {metricCards.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <Card key={index} className="text-center p-4 hover:shadow-md transition-shadow duration-200">
                <div className={`w-10 h-10 ${metric.bgColor} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                  <Icon className={`h-5 w-5 ${metric.color}`} />
                </div>
                <h3 className="text-xs font-medium text-gray-500 mb-1">{metric.title}</h3>
                <p className="text-lg font-semibold text-gray-800">{metric.value}</p>
              </Card>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales Overview Chart */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800">Sales Overview</h3>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-48">
              {salesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => [formatPrice(value), 'Sales']}
                      labelFormatter={(label) => `Month: ${label}`}
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
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No sales data available</p>
                    <p className="text-gray-400 text-sm mt-1">Sales data will appear here once transactions are recorded</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Top Products Chart */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800">Top Products</h3>
              <Package className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-48">
              {topProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => [formatPrice(value), 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No product data available</p>
                    <p className="text-gray-400 text-sm mt-1">Product performance data will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Activity & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Sales */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800">Recent Sales</h3>
              <ShoppingCart className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              {sales.length > 0 ? (
                sales.slice(0, 5).map((sale) => (
                  <div key={sale._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">
                        {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(sale.created_at).toLocaleDateString()} • {sale.payment_method.toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800 text-sm">{formatPrice(sale.total_amount)}</p>
                      <p className="text-xs text-gray-500">{sale.cashier_id}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <ShoppingCart className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No recent sales</p>
                  <p className="text-gray-400 text-xs mt-1">Sales transactions will appear here</p>
                </div>
              )}
            </div>
          </Card>

          {/* Inventory Alerts */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800">Inventory Alerts</h3>
              <AlertTriangle className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              {inventoryAlerts.length === 0 ? (
                <div className="text-center py-6">
                  <AlertTriangle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No inventory alerts</p>
                  <p className="text-gray-400 text-xs mt-1">All products are well stocked</p>
                </div>
              ) : (
                inventoryAlerts.map((alert) => (
                  <div key={alert._id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors duration-200">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{alert.product_name}</p>
                      <p className="text-xs text-red-600">
                        {alert.alert_type === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'} • 
                        {alert.current_quantity} remaining
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        alert.alert_type === 'out_of_stock' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {alert.alert_type === 'out_of_stock' ? 'Critical' : 'Warning'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
