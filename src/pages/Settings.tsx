import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Lock, 
  Bell, 
  Mail, 
  Database, 
  Download, 
  Upload, 
  Palette,
  Moon,
  Sun,
  Zap,
  Shield,
  Users as TeamIcon,
  Globe,
  Key,
  HardDrive,
  LogOut,
  ClipboardList
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { toast } from 'react-hot-toast';

interface UserData {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
}

interface ApiKeyResponse {
  key: string;
}

interface AuthMeResponse {
  user: UserData;
}

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('account');
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailReports, setEmailReports] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(10);
  const [autoReorder, setAutoReorder] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [storageUsage, setStorageUsage] = useState({
    used: 2.5,
    total: 10, // in GB
  });

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await apiClient.get<AuthMeResponse>('/auth/me');
        if (response.success) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    getUser();
  }, []);

  const generateApiKey = async () => {
    try {
      const response = await apiClient.post<ApiKeyResponse>('/auth/generate-api-key');
      if (response.success) {
        setApiKey(response.data.key);
        toast.success('API key generated');
      } else {
        toast.error('Failed to generate API key');
      }
    } catch (error) {
      toast.error('Failed to generate API key');
    }
  };

  const handleExportData = async () => {
    try {
      toast.promise(
        apiClient.post('/data/export', { format: exportFormat }),
        {
          loading: 'Preparing your export...',
          success: 'Export prepared! Download will start shortly.',
          error: 'Failed to prepare export',
        }
      );
    } catch (error) {
      toast.error('Failed to prepare export');
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'data', label: 'Data Management', icon: Database },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'team', label: 'Team', icon: TeamIcon },
    { id: 'api', label: 'API', icon: Key },
  ];

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    toast.success(`Dark mode ${!darkMode ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-gray-200 dark:border-slate-700 p-4">
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Settings
        </h2>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  : 'hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <tab.icon className="h-4 w-4 mr-3" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Account Settings */}
        {activeTab === 'account' && (
          <div className="max-w-3xl space-y-6">
            <div className="border-b border-gray-200 dark:border-slate-700 pb-6">
              <h3 className="text-lg font-medium">Profile Information</h3>
              <div className="mt-4 flex items-center">
                <div className="h-16 w-16 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <User className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="ml-4">
                  <p className="font-medium">{user?.email}</p>
                  <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                    Change avatar
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-6 gap-x-4">
              <div className="sm:col-span-3">
                <label htmlFor="first-name" className="block text-sm font-medium">
                  First name
                </label>
                <input
                  type="text"
                  id="first-name"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                  defaultValue=""
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="last-name" className="block text-sm font-medium">
                  Last name
                </label>
                <input
                  type="text"
                  id="last-name"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                  defaultValue=""
                />
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="email" className="block text-sm font-medium">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                  defaultValue={user?.email}
                  disabled
                />
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="timezone" className="block text-sm font-medium">
                  Timezone
                </label>
                <select
                  id="timezone"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                >
                  <option>Pacific Standard Time (PST)</option>
                  <option>Eastern Standard Time (EST)</option>
                  <option>Central European Time (CET)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="max-w-3xl space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Password</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Change Password</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Last changed 3 months ago
                    </p>
                  </div>
                  <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-slate-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-white bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Change
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center">
                      {twoFactorAuth ? (
                        <>
                          <Shield className="h-5 w-5 text-green-500 mr-2" />
                          <span>Enabled</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-5 w-5 text-gray-400 mr-2" />
                          <span>Disabled</span>
                        </>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {twoFactorAuth
                        ? 'Requires authentication code at login'
                        : 'Add an extra layer of security to your account'}
                    </p>
                  </div>
                  <button
                    onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                    className={`inline-flex items-center px-3 py-1.5 border ${
                      twoFactorAuth
                        ? 'border-green-300 dark:border-green-700'
                        : 'border-gray-300 dark:border-slate-700'
                    } shadow-sm text-sm font-medium rounded-md ${
                      twoFactorAuth
                        ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20'
                        : 'text-gray-700 dark:text-white bg-white dark:bg-slate-800'
                    } hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  >
                    {twoFactorAuth ? 'Disable' : 'Enable'}
                  </button>
                </div>
                {twoFactorAuth && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-sm font-medium mb-2">Recovery Codes</p>
                    <div className="bg-gray-50 dark:bg-slate-700/50 p-3 rounded-md">
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Save these codes in a secure place. Each code can only be used once.
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {['3F4G-5H6J', '7K8L-9M0N', '1P2Q-3R4S', '5T6U-7V8W'].map((code) => (
                          <div
                            key={code}
                            className="bg-white dark:bg-slate-800 p-2 rounded text-center font-mono text-sm"
                          >
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                      Generate new codes
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Active Sessions</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium">Chrome on Windows</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          San Francisco, CA • {new Date().toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button className="text-sm text-red-600 dark:text-red-400 hover:text-red-500">
                      Revoke
                    </button>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium">Safari on iPhone</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          New York, NY • 2 days ago
                        </p>
                      </div>
                    </div>
                    <button className="text-sm text-red-600 dark:text-red-400 hover:text-red-500">
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Settings */}
        {activeTab === 'notifications' && (
          <div className="max-w-3xl space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Email Notifications</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Product Alerts</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Receive emails for low stock and out of stock items
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={() => setNotificationsEnabled(!notificationsEnabled)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Email Reports</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Summary</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Receive a weekly report of inventory changes and sales
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailReports}
                      onChange={() => setEmailReports(!emailReports)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notification Preferences</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Desktop Notifications</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Show notifications on your desktop
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Mobile Push Notifications</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Receive push notifications on your mobile device
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sound Alerts</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Play sound for important notifications
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      defaultChecked
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Management Settings */}
        {activeTab === 'data' && (
          <div className="max-w-3xl space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Inventory Settings</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Low Stock Threshold</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Set the minimum quantity before items are marked as low stock
                    </p>
                  </div>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                    className="w-20 rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Auto Reorder</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Automatic Reordering</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Automatically create purchase orders when stock is low
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoReorder}
                      onChange={() => setAutoReorder(!autoReorder)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Data Export</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Export Format</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Choose the format for your data exports
                    </p>
                  </div>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="mt-1 block w-32 rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                    <option value="excel">Excel</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div>
                    <p className="font-medium">Export All Data</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Download a complete backup of your inventory data
                    </p>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-slate-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-white bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </button>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div>
                    <p className="font-medium">Import Data</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Upload inventory data from another system
                    </p>
                  </div>
                  <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-slate-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-white bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Storage Usage</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">
                    {storageUsage.used} GB of {storageUsage.total} GB used
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {Math.round((storageUsage.used / storageUsage.total) * 100)}%
                  </p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full"
                    style={{
                      width: `${Math.round((storageUsage.used / storageUsage.total) * 100)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                  Product images and document attachments are using most of your storage.
                </p>
                <button className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                  Manage storage
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Appearance Settings */}
        {activeTab === 'appearance' && (
          <div className="max-w-3xl space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Theme</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Dark Mode</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Switch between light and dark theme
                    </p>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className={`inline-flex items-center px-3 py-1.5 border ${
                      darkMode
                        ? 'border-indigo-300 dark:border-indigo-700'
                        : 'border-gray-300 dark:border-slate-700'
                    } shadow-sm text-sm font-medium rounded-md ${
                      darkMode
                        ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'text-gray-700 dark:text-white bg-white dark:bg-slate-800'
                    } hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                  >
                    {darkMode ? (
                      <>
                        <Moon className="h-4 w-4 mr-2" />
                        <span>Dark</span>
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4 mr-2" />
                        <span>Light</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Accent Color</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                  Choose your preferred accent color
                </p>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-600' },
                    { name: 'Blue', value: 'blue', bg: 'bg-blue-600' },
                    { name: 'Green', value: 'green', bg: 'bg-green-600' },
                    { name: 'Red', value: 'red', bg: 'bg-red-600' },
                    { name: 'Purple', value: 'purple', bg: 'bg-purple-600' },
                  ].map((color) => (
                    <button
                      key={color.value}
                      className={`flex flex-col items-center p-2 rounded-md ${
                        color.value === 'indigo'
                          ? 'ring-2 ring-indigo-500 ring-offset-2'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div
                        className={`h-8 w-8 rounded-full ${color.bg} mb-1`}
                      ></div>
                      <span className="text-xs">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Density</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                  Adjust the spacing and sizing of interface elements
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: 'Compact', value: 'compact' },
                    { name: 'Normal', value: 'normal', selected: true },
                    { name: 'Comfortable', value: 'comfortable' },
                  ].map((density) => (
                    <button
                      key={density.value}
                      className={`py-2 px-3 rounded-md text-sm font-medium ${
                        density.selected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {density.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Settings */}
        {activeTab === 'api' && (
          <div className="max-w-3xl space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">API Access</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">API Key</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Use this key to authenticate with our API
                    </p>
                  </div>
                  <button
                    onClick={generateApiKey}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-slate-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-white bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Generate Key
                  </button>
                </div>
                {apiKey && (
                  <div className="mt-4">
                    <div className="flex items-center">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        readOnly
                        className="flex-1 rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="ml-2 p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                      >
                        {showApiKey ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          <Key className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(apiKey);
                          toast.success('API key copied to clipboard');
                        }}
                        className="ml-2 p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                      >
                        <ClipboardList className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                      This key will only be shown once. Store it securely.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">API Documentation</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                  Learn how to integrate with our API
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <a
                    href="#"
                    className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <h4 className="font-medium mb-1">Getting Started</h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Learn the basics of our API
                    </p>
                  </a>
                  <a
                    href="#"
                    className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <h4 className="font-medium mb-1">API Reference</h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Detailed documentation for all endpoints
                    </p>
                  </a>
                  <a
                    href="#"
                    className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <h4 className="font-medium mb-1">Examples</h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Code samples in multiple languages
                    </p>
                  </a>
                  <a
                    href="#"
                    className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    <h4 className="font-medium mb-1">Webhooks</h4>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Set up real-time notifications
                    </p>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Settings */}
        {activeTab === 'team' && (
          <div className="max-w-3xl space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Team Members</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg overflow-hidden">
                <div className="divide-y divide-gray-200 dark:divide-slate-700">
                  {[
                    {
                      name: 'You',
                      email: user?.email,
                      role: 'Owner',
                      lastActive: 'Active now',
                    },
                    {
                      name: 'Alex Johnson',
                      email: 'alex@example.com',
                      role: 'Admin',
                      lastActive: '2 hours ago',
                    },
                    {
                      name: 'Sam Wilson',
                      email: 'sam@example.com',
                      role: 'Editor',
                      lastActive: 'Yesterday',
                    },
                  ].map((member, index) => (
                    <div key={index} className="p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                          <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="ml-4">
                          <p className="font-medium">
                            {member.name} {index === 0 && '(You)'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {member.email} • {member.role}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {member.lastActive}
                        </p>
                        {index !== 0 && (
                          <button className="text-sm text-red-600 dark:text-red-400 hover:text-red-500 mt-1">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Invite Team Members</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-6 gap-x-4">
                  <div className="sm:col-span-4">
                    <label htmlFor="email" className="block text-sm font-medium">
                      Email address
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                      placeholder="team@example.com"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="role" className="block text-sm font-medium">
                      Role
                    </label>
                    <select
                      id="role"
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-800"
                    >
                      <option>Viewer</option>
                      <option>Editor</option>
                      <option>Admin</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Send Invitation
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Team Permissions</h3>
              <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Permission
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Owner
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Admin
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Editor
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                          Viewer
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {[
                        { name: 'View inventory', owner: true, admin: true, editor: true, viewer: true },
                        { name: 'Edit inventory', owner: true, admin: true, editor: true, viewer: false },
                        { name: 'Manage orders', owner: true, admin: true, editor: true, viewer: false },
                        { name: 'Manage suppliers', owner: true, admin: true, editor: false, viewer: false },
                        { name: 'Manage team', owner: true, admin: true, editor: false, viewer: false },
                        { name: 'View reports', owner: true, admin: true, editor: true, viewer: true },
                        { name: 'Export data', owner: true, admin: true, editor: true, viewer: false },
                      ].map((permission, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            {permission.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={permission.owner}
                              readOnly
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-700 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={permission.admin}
                              readOnly
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-700 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={permission.editor}
                              readOnly
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-700 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={permission.viewer}
                              readOnly
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-slate-700 rounded"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        {(activeTab === 'account' || activeTab === 'team') && (
          <div className="mt-10 border-t border-gray-200 dark:border-slate-700 pt-6">
            <h3 className="text-lg font-medium text-red-600 dark:text-red-400">Danger Zone</h3>
            <div className="mt-4 bg-white dark:bg-slate-800 shadow rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <button className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-700 shadow-sm text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-sm text-slate-500 text-center">
        <p>© {new Date().getFullYear()} NIMBUS. All rights reserved.</p>        </div>
      </div>
    </div>
  );
};

export default SettingsPage;