import React, { useState } from 'react';
import { Shield, BarChart3, FileText } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { AuditLogs } from '../components/ui/AuditLogs';
import { AuditAnalytics } from '../components/ui/AuditAnalytics';

export const Audit: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'logs' | 'analytics'>('logs');

  const tabs = [
    {
      id: 'logs' as const,
      name: 'Audit Logs',
      icon: FileText,
      description: 'View detailed audit logs and track user activities'
    },
    {
      id: 'analytics' as const,
      name: 'Analytics',
      icon: BarChart3,
      description: 'Advanced analytics and reporting features'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-blue-100 rounded-lg mr-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit & Security</h1>
              <p className="text-gray-600 mt-1">
                Monitor user activities and system security
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'logs' && (
            <div>
              <div className="mb-6">
                <Card className="p-6 bg-blue-50 border-blue-200">
                  <div className="flex items-start">
                    <FileText className="h-6 w-6 text-blue-600 mt-1 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">
                        Audit Logs
                      </h3>
                      <p className="text-blue-700 mb-4">
                        Track all user activities and system changes with detailed audit trails. 
                        Monitor who performed what actions, when they occurred, and what data was affected.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-3 rounded-lg">
                          <h4 className="font-medium text-blue-900">Complete Tracking</h4>
                          <p className="text-sm text-blue-700">Every action is logged with user details and timestamps</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <h4 className="font-medium text-blue-900">Change History</h4>
                          <p className="text-sm text-blue-700">See exactly what changed with before/after values</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <h4 className="font-medium text-blue-900">Export Data</h4>
                          <p className="text-sm text-blue-700">Download audit logs in CSV format for compliance</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
              <AuditLogs />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <div className="mb-6">
                <Card className="p-6 bg-green-50 border-green-200">
                  <div className="flex items-start">
                    <BarChart3 className="h-6 w-6 text-green-600 mt-1 mr-3" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-900 mb-2">
                        Audit Analytics
                      </h3>
                      <p className="text-green-700 mb-4">
                        Advanced analytics and reporting features to gain insights into user behavior, 
                        system usage patterns, and security trends.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-3 rounded-lg">
                          <h4 className="font-medium text-green-900">Usage Patterns</h4>
                          <p className="text-sm text-green-700">Understand how your system is being used</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <h4 className="font-medium text-green-900">Security Insights</h4>
                          <p className="text-sm text-green-700">Monitor login patterns and suspicious activities</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <h4 className="font-medium text-green-900">Performance Metrics</h4>
                          <p className="text-sm text-green-700">Track system activity and user engagement</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
              <AuditAnalytics />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
