import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  Package,
  CreditCard,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface Expense {
  _id: string;
  store_id: string;
  date: string;
  month_year: string;
  product_name: string;
  unit: string;
  quantity: number;
  amount: number;
  currency: string;
  payment_method: string;
  category: string;
  description?: string;
  receipt_number?: string;
  vendor_name?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ExpenseStats {
  totalExpenses: number;
  totalAmount: number;
  expensesByCategory: Array<{
    category: string;
    count: number;
    amount: number;
  }>;
  expensesByPaymentMethod: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  expensesByMonth: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
  topExpenseItems: Array<{
    product_name: string;
    total_amount: number;
    count: number;
  }>;
}

interface NewExpense {
  store_id: string;
  date: string;
  product_name: string;
  unit: string;
  quantity: number;
  amount: number;
  currency: string;
  payment_method: string;
  category: string;
  description?: string;
  receipt_number?: string;
  vendor_name?: string;
}

export const Expenses: React.FC = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState<Expense | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [newExpense, setNewExpense] = useState<NewExpense>({
    store_id: user?.store_id || '',
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    unit: 'pieces',
    quantity: 1,
    amount: 0,
    currency: 'TRY',
    payment_method: 'cash',
    category: 'other',
    description: '',
    receipt_number: '',
    vendor_name: ''
  });

  const units = [
    { value: 'pieces', label: 'Pieces', color: 'bg-green-100 text-green-800' },
    { value: 'kgs', label: 'KGs', color: 'bg-red-100 text-red-800' },
    { value: 'liters', label: 'Liters', color: 'bg-blue-100 text-blue-800' },
    { value: 'boxes', label: 'Boxes', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'packets', label: 'Packets', color: 'bg-purple-100 text-purple-800' },
    { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash Payment', color: 'bg-green-100 text-green-800' },
    { value: 'isbank', label: 'Isbank Payment', color: 'bg-red-100 text-red-800' },
    { value: 'naira', label: 'Naira Payment', color: 'bg-blue-100 text-blue-800' },
    { value: 'card', label: 'Card Payment', color: 'bg-purple-100 text-purple-800' },
    { value: 'transfer', label: 'Transfer', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800' }
  ];

  const categories = [
    { value: 'food', label: 'Food' },
    { value: 'supplies', label: 'Supplies' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' }
  ];

  const currencies = [
    { value: 'TRY', label: '₺ (Turkish Lira)' },
    { value: 'USD', label: '$ (US Dollar)' },
    { value: 'NGN', label: '₦ (Nigerian Naira)' },
    { value: 'EUR', label: '€ (Euro)' }
  ];

  useEffect(() => {
    loadExpenses();
    loadStats();
  }, [currentPage, searchTerm, filterCategory, filterPaymentMethod]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const result = await apiService.getExpenses({
        page: currentPage,
        limit: 20,
        search: searchTerm,
        category: filterCategory,
        payment_method: filterPaymentMethod,
        store_id: user?.store_id
      });
      setExpenses(result.expenses);
      setTotalPages(result.pages);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await apiService.getExpenseStats({
        store_id: user?.store_id
      });
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load expense stats:', error);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createExpense(newExpense);
      toast.success('Expense added successfully');
      setShowAddExpense(false);
      setNewExpense({
        store_id: user?.store_id || '',
        date: new Date().toISOString().split('T')[0],
        product_name: '',
        unit: 'pieces',
        quantity: 1,
        amount: 0,
        currency: 'TRY',
        payment_method: 'cash',
        category: 'other',
        description: '',
        receipt_number: '',
        vendor_name: ''
      });
      loadExpenses();
      loadStats();
    } catch (error) {
      toast.error('Failed to add expense');
    }
  };

  const handleEditExpense = async (updatedExpense: Expense) => {
    try {
      await apiService.updateExpense(updatedExpense._id, updatedExpense);
      toast.success('Expense updated successfully');
      setShowEditExpense(null);
      loadExpenses();
      loadStats();
    } catch (error) {
      toast.error('Failed to update expense');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await apiService.deleteExpense(expenseId);
      toast.success('Expense deleted successfully');
      setShowDeleteConfirm(null);
      loadExpenses();
      loadStats();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols = { TRY: '₺', USD: '$', NGN: '₦', EUR: '€' };
    return `${symbols[currency as keyof typeof symbols] || currency} ${amount.toLocaleString()}`;
  };

  const getUnitColor = (unit: string) => {
    return units.find(u => u.value === unit)?.color || 'bg-gray-100 text-gray-800';
  };

  const getPaymentMethodColor = (method: string) => {
    return paymentMethods.find(p => p.value === method)?.color || 'bg-gray-100 text-gray-800';
  };

  if (loading && expenses.length === 0) {
    return (
      <div className="p-4 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <span className="ml-3 text-gray-600">Loading expenses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600">Track and manage your business expenses</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowAddExpense(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalExpenses}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">₺ {stats.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Package className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expensesByCategory.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Payment Methods</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expensesByPaymentMethod.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <select
            value={filterPaymentMethod}
            onChange={(e) => setFilterPaymentMethod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">All Payment Methods</option>
            {paymentMethods.map(method => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => (
                <tr key={expense._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{expense.product_name}</div>
                      {expense.vendor_name && (
                        <div className="text-sm text-gray-500">{expense.vendor_name}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUnitColor(expense.unit)}`}>
                      {expense.unit.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(expense.amount, expense.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentMethodColor(expense.payment_method)}`}>
                      {paymentMethods.find(p => p.value === expense.payment_method)?.label || expense.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => setShowEditExpense(expense)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(expense._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Expense</h2>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                    <input
                      type="text"
                      value={newExpense.product_name}
                      onChange={(e) => setNewExpense({ ...newExpense, product_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select
                      value={newExpense.unit}
                      onChange={(e) => setNewExpense({ ...newExpense, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {units.map(unit => (
                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newExpense.quantity}
                      onChange={(e) => setNewExpense({ ...newExpense, quantity: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={newExpense.currency}
                      onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {currencies.map(currency => (
                        <option key={currency.value} value={currency.value}>{currency.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={newExpense.payment_method}
                      onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {paymentMethods.map(method => (
                        <option key={method.value} value={method.value}>{method.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {categories.map(category => (
                        <option key={category.value} value={category.value}>{category.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                  <input
                    type="text"
                    value={newExpense.vendor_name || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number</label>
                  <input
                    type="text"
                    value={newExpense.receipt_number || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, receipt_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newExpense.description || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Delete Expense</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this expense? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteExpense(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
