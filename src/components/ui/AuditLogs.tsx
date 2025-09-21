import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Download, 
  Filter, 
  Calendar,
  User,
  Activity,
  FileText,
  RefreshCw
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { apiService } from '../../services/api';

interface AuditLog {
  _id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  resource_name: string;
  changes?: Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>;
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    store_id?: string;
  };
  created_at: string;
}

interface AuditLogsProps {
  storeId?: string;
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ storeId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    user_id: '',
    resource_type: '',
    action: '',
    start_date: '',
    end_date: '',
  });
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, [filters]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });

      const response = await apiService.request<{
        logs: AuditLog[];
        total: number;
        pages: number;
      }>(`/audit/logs?${queryParams}`);
      
      setLogs(response.data.logs);
      setTotalLogs(response.data.total);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });

      const response = await apiService.rawRequest(`/audit/logs/export?${queryParams}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to export audit logs');
      }

      // Create blob from response data
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      alert('Failed to export audit logs');
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-green-600 bg-green-100';
      case 'UPDATE': return 'text-blue-600 bg-blue-100';
      case 'DELETE': return 'text-red-600 bg-red-100';
      case 'LOGIN': return 'text-purple-600 bg-purple-100';
      case 'LOGOUT': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'PRODUCT': return '📦';
      case 'TRANSACTION': return '💳';
      case 'EXPENSE': return '💰';
      case 'USER': return '👤';
      case 'INVENTORY': return '📊';
      case 'GOAL': return '🎯';
      default: return '📄';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary-500" />
        <span className="ml-2 text-gray-600">Loading audit logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <FileText className="h-12 w-12 mx-auto mb-4" />
          <p>{error}</p>
          <Button onClick={loadAuditLogs} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Logs</h2>
          <p className="text-gray-600">
            Track all user activities and system changes
          </p>
          </div>
        <div className="flex gap-2">
          <Button
              onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            onClick={handleExport}
            variant="primary"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Email
              </label>
              <input
                type="text"
                value={filters.user_id}
                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Filter by user email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource Type
              </label>
              <select
                value={filters.resource_type}
                onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                aria-label="Filter by resource type"
              >
                <option value="">All Types</option>
                <option value="PRODUCT">Product</option>
                <option value="TRANSACTION">Transaction</option>
                <option value="EXPENSE">Expense</option>
                <option value="USER">User</option>
                <option value="INVENTORY">Inventory</option>
                <option value="GOAL">Goal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                aria-label="Filter by action type"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="EXPORT">Export</option>
                <option value="IMPORT">Import</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                aria-label="Filter by start date"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              onClick={() => setFilters({
                page: 1,
                limit: 50,
                user_id: '',
                resource_type: '',
                action: '',
                start_date: '',
                end_date: '',
              })}
              variant="outline"
              size="sm"
            >
              Clear Filters
            </Button>
            <Button onClick={loadAuditLogs} variant="primary" size="sm">
              Apply Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900">{totalLogs}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Actions Today</p>
              <p className="text-2xl font-bold text-gray-900">
                {logs.filter(log => 
                  new Date(log.created_at).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
            <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(logs.map(log => log.user_email)).size}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-gray-900">
                {logs.filter(log => {
                  const logDate = new Date(log.created_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return logDate >= weekAgo;
                }).length}
              </p>
          </div>
        </div>
        </Card>
                </div>
                
      {/* Audit Logs Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                  </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {log.user_email}
                  </div>
                        <div className="text-sm text-gray-500">
                          {log.user_role}
                    </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">
                        {getResourceIcon(log.resource_type)}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {log.resource_name}
                </div>
                        <div className="text-sm text-gray-500">
                          {log.resource_type}
              </div>
            </div>
          </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.metadata?.ip_address || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      onClick={() => setSelectedLog(log)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {((filters.page - 1) * filters.limit) + 1} to{' '}
              {Math.min(filters.page * filters.limit, totalLogs)} of {totalLogs} results
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              <span className="px-3 py-1 text-sm">
                Page {filters.page} of {totalPages}
              </span>
              <Button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page === totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Audit Log Details
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
              </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <p className="text-sm text-gray-900">{selectedLog.action}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resource Type</label>
                    <p className="text-sm text-gray-900">{selectedLog.resource_type}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <p className="text-sm text-gray-900">{selectedLog.user_email} ({selectedLog.user_role})</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Resource</label>
                  <p className="text-sm text-gray-900">{selectedLog.resource_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedLog.created_at)}</p>
                </div>
                
                {selectedLog.metadata && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">IP Address</label>
                      <p className="text-sm text-gray-900">{selectedLog.metadata.ip_address || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Store ID</label>
                      <p className="text-sm text-gray-900">{selectedLog.metadata.store_id || '-'}</p>
                    </div>
                  </div>
                )}
                
                {selectedLog.changes && selectedLog.changes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Changes</label>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      {selectedLog.changes.map((change, index) => (
                        <div key={index} className="mb-2">
                          <div className="font-medium text-sm text-gray-900">
                            {change.field}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="text-red-600">From:</span> {JSON.stringify(change.old_value)}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="text-green-600">To:</span> {JSON.stringify(change.new_value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};