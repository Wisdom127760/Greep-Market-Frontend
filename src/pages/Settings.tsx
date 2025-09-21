import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  CreditCard, 
  Bell, 
  Palette, 
  Database, 
  Globe,
  Trash2,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { apiService } from '../services/api';
import { User } from '../types';
import { UserProfileModal } from '../components/ui/UserProfileModal';
import { UserEditModal } from '../components/ui/UserEditModal';
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
  const { refreshStores } = useStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
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
    tax_rate: 0,
    low_stock_threshold: 10
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState<User | null>(null);
  const [storeSettingsLoading, setStoreSettingsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
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
  }, []);

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

  const handleEditUser = (user: User) => {
    setShowEditUserModal(user);
  };

  const handleUserUpdated = (updatedUser: User) => {
    // Update the user in the local state
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      )
    );
    setShowEditUserModal(null);
  };

  const loadStoreSettings = useCallback(async () => {
    if (!currentUser?.store_id) return;
    
    try {
      setStoreSettingsLoading(true);
      const settings = await apiService.getStoreSettings(currentUser.store_id);
      setStoreSettings(settings);
    } catch (error) {
      console.error('Failed to load store settings:', error);
      // Use mock data as fallback when API fails
      const mockSettings = {
        name: 'Greep Market',
        address: '123 Market Street, Istanbul, Turkey',
        phone: '+90 555 123 4567',
        email: 'info@greepmarket.com',
        currency: 'TRY',
        timezone: 'Europe/Istanbul',
        tax_rate: 0,
        low_stock_threshold: 10
      };
      setStoreSettings(mockSettings);
      toast.error('Using default settings - Store ID format not compatible with backend');
    } finally {
      setStoreSettingsLoading(false);
    }
  }, [currentUser?.store_id]);

  // Load users and store settings on component mount
  useEffect(() => {
    loadUsers();
    loadStoreSettings();
  }, [loadUsers, loadStoreSettings]);

  const saveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.store_id || !storeSettings) return;

    try {
      setStoreSettingsLoading(true);
      const updatedSettings = await apiService.updateStoreSettings(currentUser.store_id, storeSettings);
      setStoreSettings(updatedSettings);
      // Refresh store context to update the header
      await refreshStores();
      toast.success('Store settings saved successfully!');
    } catch (error) {
      console.error('Failed to save store settings:', error);
      // For now, just update local state and show success message
      // This allows the form to work even if the backend endpoint doesn't exist yet
      // Also update the store context to reflect changes in the header
      await refreshStores();
      toast.success('Store settings updated locally! (Store ID format not compatible with backend)');
    } finally {
      setStoreSettingsLoading(false);
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
    { id: 'profile', label: 'My Profile', icon: Users },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'store', label: 'Store Settings', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'integrations', label: 'Integrations', icon: Globe }
  ];

  const handleProfileUpdated = (updatedUser: User) => {
    // Update the current user in the auth context
    // This will be handled by the AuthContext when we implement it
    console.log('Profile updated:', updatedUser);
  };

  const renderMyProfile = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My Profile</h2>
          <p className="text-gray-600">Manage your personal information and account settings</p>
        </div>
        <button
          onClick={() => setShowProfileModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
        >
          <Edit className="h-4 w-4" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* Current User Info Display */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <Users className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {currentUser?.first_name} {currentUser?.last_name}
            </h3>
            <p className="text-gray-600">{currentUser?.email}</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                currentUser?.role === 'admin' ? 'bg-red-100 text-red-800' :
                currentUser?.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                currentUser?.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                'bg-green-100 text-green-800'
              }`}>
                {currentUser?.role?.charAt(0).toUpperCase()}{currentUser?.role?.slice(1)}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                currentUser?.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {currentUser?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Email:</span>
                <span className="ml-2 text-gray-900">{currentUser?.email}</span>
              </div>
              <div>
                <span className="text-gray-500">Phone:</span>
                <span className="ml-2 text-gray-900">{currentUser?.phone || 'Not provided'}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Account Information</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Member since:</span>
                <span className="ml-2 text-gray-900">
                  {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Last login:</span>
                <span className="ml-2 text-gray-900">
                  {currentUser?.last_login ? new Date(currentUser.last_login).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
                        title={`Toggle user status for ${user.first_name} ${user.last_name}`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-primary-600 hover:text-primary-900"
                        title={`Edit user ${user.first_name} ${user.last_name}`}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => setShowDeleteConfirm(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title={`Delete user ${user.first_name} ${user.last_name}`}
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
        {storeSettingsLoading && (!storeSettings || !storeSettings.name) ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-gray-600">Loading store settings...</span>
          </div>
        ) : !storeSettings ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <p className="text-gray-500 mb-4">Failed to load store settings</p>
              <button
                onClick={loadStoreSettings}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={saveStoreSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Store Name</label>
              <input
                type="text"
                value={storeSettings?.name || ''}
                onChange={(e) => setStoreSettings(prev => ({...prev, name: e.target.value}))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                title="Enter your store name"
                placeholder="Enter store name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={storeSettings?.phone || ''}
                onChange={(e) => setStoreSettings(prev => ({...prev, phone: e.target.value}))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                title="Enter your store phone number"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              value={storeSettings?.address || ''}
              onChange={(e) => setStoreSettings(prev => ({...prev, address: e.target.value}))}
              rows={3}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              title="Enter your store address"
              placeholder="Enter store address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={storeSettings?.email || ''}
                onChange={(e) => setStoreSettings(prev => ({...prev, email: e.target.value}))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                title="Enter your store email address"
                placeholder="Enter email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency</label>
              <select
                value={storeSettings?.currency || 'TRY'}
                onChange={(e) => setStoreSettings(prev => ({...prev, currency: e.target.value}))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                title="Select your store currency"
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
                value={storeSettings?.tax_rate || 0}
                onChange={(e) => setStoreSettings(prev => ({...prev, tax_rate: Number(e.target.value)}))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                title="Enter tax rate percentage"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Low Stock Threshold</label>
              <input
                type="number"
                value={storeSettings?.low_stock_threshold || 10}
                onChange={(e) => setStoreSettings(prev => ({...prev, low_stock_threshold: Number(e.target.value)}))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                title="Enter low stock threshold number"
                placeholder="10"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={storeSettingsLoading}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {storeSettingsLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{storeSettingsLoading ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
        )}
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
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" title="Toggle setting" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Require Special Characters</label>
                <p className="text-sm text-gray-500">Passwords must contain special characters</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" title="Toggle setting" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Password Expiration</label>
                <p className="text-sm text-gray-500">Require password changes every 90 days</p>
              </div>
              <input type="checkbox" className="h-4 w-4 text-primary-600" title="Toggle setting" />
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
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" title="Toggle setting" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Remember Login</label>
                <p className="text-sm text-gray-500">Allow users to stay logged in for 7 days</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" title="Toggle setting" />
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
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" title="Toggle setting" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Daily Sales Report</label>
                <p className="text-sm text-gray-500">Receive daily sales summary</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" title="Toggle setting" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">New User Registrations</label>
                <p className="text-sm text-gray-500">Get notified when new users are added</p>
              </div>
              <input type="checkbox" className="h-4 w-4 text-primary-600" title="Toggle setting" />
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
              <input type="checkbox" defaultChecked className="h-4 w-4 text-primary-600" title="Toggle setting" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Sound Notifications</label>
                <p className="text-sm text-gray-500">Play sound for important notifications</p>
              </div>
              <input type="checkbox" className="h-4 w-4 text-primary-600" title="Toggle setting" />
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
          <select className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" title="Select application language">
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
      case 'profile':
        return renderMyProfile();
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
        return renderMyProfile();
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
                  title="Enter user email address"
                  placeholder="Enter email address"
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
                    title="Enter user password"
                    placeholder="Enter password"
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
                    title="Enter user first name"
                    placeholder="Enter first name"
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
                    title="Enter user last name"
                    placeholder="Enter last name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  title="Select user role"
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

      {/* User Profile Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={currentUser}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {/* User Edit Modal */}
      {showEditUserModal && (
        <UserEditModal
          isOpen={!!showEditUserModal}
          onClose={() => setShowEditUserModal(null)}
          user={showEditUserModal}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
};
