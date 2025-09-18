import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  CreditCard, 
  Bell, 
  Palette, 
  Database, 
  Globe,
  Key,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { User } from '../types';
import toast from 'react-hot-toast';

interface NewUser {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'cashier';
}

interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  timezone: string;
  tax_rate: number;
  low_stock_threshold: number;
}

export const Settings: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'cashier'
  });
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    name: '',
    address: '',
    phone: '',
    email: '',
    currency: 'TRY',
    timezone: 'Europe/Istanbul',
    tax_rate: 20,
    low_stock_threshold: 10
  });
  const [showPassword, setShowPassword] = useState(false);

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUsers();
      setUsers(response?.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
      setUsers([]); // Ensure users is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createUser(newUser);
      toast.success('User created successfully');
      setShowAddUser(false);
      setNewUser({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'cashier'
      });
      loadUsers();
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  const handleEditUser = async (updatedUser: User) => {
    try {
      await apiService.updateUser(updatedUser.id, updatedUser);
      toast.success('User updated successfully');
      setShowEditUser(null);
      loadUsers();
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await apiService.deleteUser(userId);
      toast.success('User deleted successfully');
      setShowDeleteConfirm(null);
      loadUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await apiService.toggleUserStatus(userId);
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      loadUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const tabs = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'store', label: 'Store Settings', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'integrations', label: 'Integrations', icon: Globe }
  ];

  const renderUserManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage admins, managers, and cashiers</p>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : !users || users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                (users || []).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleUserStatus(user.id, !user.is_active)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setShowEditUser(user)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => setShowDeleteConfirm(user.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderStoreSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Store Settings</h2>
        <p className="text-gray-600">Configure your store information and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Store Name</label>
              <input
                type="text"
                value={storeSettings.name}
                onChange={(e) => setStoreSettings({...storeSettings, name: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={storeSettings.phone}
                onChange={(e) => setStoreSettings({...storeSettings, phone: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              value={storeSettings.address}
              onChange={(e) => setStoreSettings({...storeSettings, address: e.target.value})}
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={storeSettings.email}
                onChange={(e) => setStoreSettings({...storeSettings, email: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <select
                value={storeSettings.currency}
                onChange={(e) => setStoreSettings({...storeSettings, currency: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="TRY">Turkish Lira (₺)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
              <input
                type="number"
                value={storeSettings.tax_rate}
                onChange={(e) => setStoreSettings({...storeSettings, tax_rate: Number(e.target.value)})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Low Stock Threshold</label>
              <input
                type="number"
                value={storeSettings.low_stock_threshold}
                onChange={(e) => setStoreSettings({...storeSettings, low_stock_threshold: Number(e.target.value)})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
        <p className="text-gray-600">Manage password policies and security preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Password Policy</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Minimum Password Length</label>
                <p className="text-sm text-gray-500">Require passwords to be at least 8 characters</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Require Special Characters</label>
                <p className="text-sm text-gray-500">Passwords must contain special characters</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Password Expiration</label>
                <p className="text-sm text-gray-500">Require password changes every 90 days</p>
              </div>
              <input type="checkbox" className="h-4 w-4 text-primary-600" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Session Management</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Auto Logout</label>
                <p className="text-sm text-gray-500">Automatically logout inactive users after 30 minutes</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Remember Login</label>
                <p className="text-sm text-gray-500">Allow users to stay logged in for 7 days</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Notification Settings</h2>
        <p className="text-gray-600">Configure how you receive notifications</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Low Stock Alerts</label>
                <p className="text-sm text-gray-500">Get notified when products are running low</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Daily Sales Report</label>
                <p className="text-sm text-gray-500">Receive daily sales summary</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">New User Registrations</label>
                <p className="text-sm text-gray-500">Get notified when new users are added</p>
              </div>
              <input type="checkbox" className="h-4 w-4 text-primary-600" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">In-App Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Browser Notifications</label>
                <p className="text-sm text-gray-500">Show notifications in browser</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Sound Notifications</label>
                <p className="text-sm text-gray-500">Play sound for important notifications</p>
              </div>
              <input type="checkbox" className="h-4 w-4 text-primary-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Appearance Settings</h2>
        <p className="text-gray-600">Customize the look and feel of your application</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Theme</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="border-2 border-primary-600 rounded-lg p-4 text-center cursor-pointer">
              <div className="w-12 h-12 bg-gray-900 rounded-lg mx-auto mb-2"></div>
              <span className="text-sm font-medium">Dark</span>
            </div>
            <div className="border-2 border-gray-200 rounded-lg p-4 text-center cursor-pointer">
              <div className="w-12 h-12 bg-white rounded-lg mx-auto mb-2 border"></div>
              <span className="text-sm font-medium">Light</span>
            </div>
            <div className="border-2 border-gray-200 rounded-lg p-4 text-center cursor-pointer">
              <div className="w-12 h-12 bg-blue-500 rounded-lg mx-auto mb-2"></div>
              <span className="text-sm font-medium">Auto</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Language</h3>
          <select className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500">
            <option value="en">English</option>
            <option value="tr">Türkçe</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
        <p className="text-gray-600">Connect with external services and APIs</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Payment Gateway</h3>
                <p className="text-sm text-gray-500">Connect your payment processor</p>
              </div>
            </div>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
              Configure
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Email Service</h3>
                <p className="text-sm text-gray-500">Configure email notifications</p>
              </div>
            </div>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
              Configure
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Cloud Storage</h3>
                <p className="text-sm text-gray-500">Configure cloud storage for backups</p>
              </div>
            </div>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700">
              Configure
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return renderUserManagement();
      case 'store':
        return renderStoreSettings();
      case 'security':
        return renderSecuritySettings();
      case 'notifications':
        return renderNotifications();
      case 'appearance':
        return renderAppearance();
      case 'integrations':
        return renderIntegrations();
      default:
        return renderUserManagement();
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your application settings and preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({...newUser, first_name: e.target.value})}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({...newUser, last_name: e.target.value})}
                    required
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete User</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this user? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
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
