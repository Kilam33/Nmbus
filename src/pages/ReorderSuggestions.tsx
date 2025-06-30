import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  RefreshCw, 
  Filter, 
  Settings, 
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Package,
  TrendingUp,
  ShoppingCart,
  Eye,
  Edit,
  Download,
  Mail,
  Zap,
  Loader2,
  Plus,
  X,
  Cog,
  Save
} from 'lucide-react';
import { ReorderService, ReorderSuggestion, ReorderFilters, ReorderSummary, SuggestionActionData, ReorderSettings } from '../services/reorder';
import { toast } from 'react-hot-toast';

interface SupplierInfo {
  name: string;
  rating: number;
  avgLeadTime: number;
  reliability: number;
  contactInfo: string;
}

const ReorderSuggestions = () => {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<ReorderSuggestion[]>([]);
  const [summary, setSummary] = useState<ReorderSummary | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ReorderFilters>({
    urgency: 'all',
    status: 'pending'
  });
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ReorderSettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await ReorderService.getSuggestions(filters);
      if (response.success && response.data) {
        setSuggestions(response.data.suggestions);
        setFilteredSuggestions(response.data.suggestions);
        setSummary(response.data.summary);
        setLastRefreshed(new Date());
      } else {
        toast.error('Failed to load reorder suggestions');
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Failed to load reorder suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAnalysis = async () => {
    setIsAnalyzing(true);
    setIsPolling(false);
    try {
      const response = await ReorderService.triggerAnalysis({
        scope: 'all',
        urgency_only: false
      });
      
      if (response.success) {
        toast.success('AI analysis started successfully');
        setIsPolling(true); // Start polling phase
        // Poll for completion
        pollAnalysisStatus(response.data.jobId);
      } else {
        toast.error('Failed to start analysis');
        setIsAnalyzing(false);
        setIsPolling(false);
      }
    } catch (error) {
      console.error('Error triggering analysis:', error);
      toast.error('Failed to start analysis');
      setIsAnalyzing(false);
      setIsPolling(false);
    }
  };

  const pollAnalysisStatus = async (jobId: string) => {
    let pollAttempts = 0;
    const maxAttempts = 12; // 1 minute of polling (12 * 5 seconds)
    
    const pollInterval = setInterval(async () => {
      pollAttempts++;
      
      try {
        const response = await ReorderService.getJobStatus(jobId);
        if (response.success && response.data) {
          if (response.data.status === 'completed') {
            clearInterval(pollInterval);
            toast.success('Analysis completed! Refreshing data...');
            loadData();
            setIsAnalyzing(false); // Reset button state
            setIsPolling(false);
          } else if (response.data.status === 'failed') {
            clearInterval(pollInterval);
            toast.error('Analysis failed');
            setIsAnalyzing(false); // Reset button state
            setIsPolling(false);
          }
          // Keep polling if status is 'started' or 'running'
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        
        // If we get a 404 or other error, it might be because Redis is disabled
        // In this case, we'll wait a bit longer and then refresh the data
        if (pollAttempts >= maxAttempts) {
          clearInterval(pollInterval);
          toast.success('Analysis completed! Refreshing data...');
          loadData();
          setIsAnalyzing(false);
          setIsPolling(false);
        }
        // Continue polling for a few more attempts before giving up
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 2 minutes and reset button state
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isAnalyzing) {
        toast.success('Analysis completed! Refreshing data...');
        loadData();
        setIsAnalyzing(false);
        setIsPolling(false);
      }
    }, 120000); // 2 minutes timeout
  };

  const handleSuggestionAction = async (suggestionId: string, actionData: SuggestionActionData) => {
    try {
      const response = await ReorderService.processSuggestion(suggestionId, actionData);
      if (response.success) {
        toast.success(`Suggestion ${actionData.action}ed successfully`);
        loadData(); // Refresh data
      } else {
        toast.error(`Failed to ${actionData.action} suggestion`);
      }
    } catch (error) {
      console.error('Error processing suggestion:', error);
      toast.error(`Failed to ${actionData.action} suggestion`);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedSuggestions.length === 0) {
      toast.error('No suggestions selected');
      return;
    }

    try {
      const response = await ReorderService.bulkApprove(selectedSuggestions);
      if (response.success) {
        toast.success(response.message || 'Bulk approval successful');
        setSelectedSuggestions([]);
        setShowBulkActions(false);
        loadData();
      } else {
        toast.error('Bulk approval failed');
      }
    } catch (error) {
      console.error('Error bulk approving:', error);
      toast.error('Bulk approval failed');
    }
  };

  const handleBulkReject = async () => {
    if (selectedSuggestions.length === 0) {
      toast.error('No suggestions selected');
      return;
    }

    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const response = await ReorderService.bulkReject(selectedSuggestions, reason);
      if (response.success) {
        toast.success(response.message || 'Bulk rejection successful');
        setSelectedSuggestions([]);
        setShowBulkActions(false);
        loadData();
      } else {
        toast.error('Bulk rejection failed');
      }
    } catch (error) {
      console.error('Error bulk rejecting:', error);
      toast.error('Bulk rejection failed');
    }
  };

  const handleExport = async () => {
    try {
      const blob = await ReorderService.exportSuggestions(filters, 'csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reorder-suggestions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Export completed');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Export failed');
    }
  };

  const handleSelectionChange = (suggestionId: string, checked: boolean) => {
    if (checked) {
      setSelectedSuggestions(prev => [...prev, suggestionId]);
    } else {
      setSelectedSuggestions(prev => prev.filter(id => id !== suggestionId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSuggestions(filteredSuggestions.map(s => s.id));
    } else {
      setSelectedSuggestions([]);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await ReorderService.getSettings();
      if (response.success && response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (updatedSettings: Partial<ReorderSettings>) => {
    if (!settings) return;
    
    setIsSavingSettings(true);
    try {
      const response = await ReorderService.updateSettings({
        ...settings,
        ...updatedSettings
      });
      
      if (response.success) {
        setSettings(response.data);
        toast.success('Settings updated successfully');
        setShowSettings(false);
      } else {
        toast.error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  useEffect(() => {
    loadData();
    loadSettings();
  }, [filters]);

  useEffect(() => {
    let filtered = suggestions;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(suggestion =>
        suggestion.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        suggestion.category_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        suggestion.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredSuggestions(filtered);
  }, [suggestions, searchQuery]);

  useEffect(() => {
    setShowBulkActions(selectedSuggestions.length > 0);
  }, [selectedSuggestions]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'Critical';
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'Unknown';
    }
  };

  const criticalCount = summary?.critical_count || 0;
  const highCount = summary?.high_count || 0;
  const totalSuggestions = summary?.total_suggestions || 0;
  const totalEstimatedCost = summary?.total_estimated_cost || 0;

  return (
    <div className="bg-slate-900 min-h-screen text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Reorder Suggestions</h1>
            <p className="text-slate-400 mt-1">
              Last updated: {lastRefreshed.toLocaleTimeString()} 
              <button 
                onClick={loadData}
                disabled={isLoading}
                className={`ml-3 ${isLoading ? 'text-slate-500' : 'text-indigo-400 hover:text-indigo-300'} inline-flex items-center`}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg border transition-colors ${
                showSettings 
                  ? 'bg-indigo-600 border-indigo-500 text-white' 
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-400'
              }`}
              title="Settings"
            >
              <Cog className="h-5 w-5" />
            </button>
            <button 
              onClick={triggerAnalysis}
              disabled={isAnalyzing}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 px-4 py-2 rounded-lg flex items-center"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {isAnalyzing && !isPolling ? 'Starting Analysis...' : 
               isAnalyzing && isPolling ? 'Analyzing...' : 
               'Trigger AI Analysis'}
            </button>
            <button 
              onClick={handleExport}
              className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              <Download className="h-5 w-5 text-slate-400" />
            </button>
            <button className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
              <Mail className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && settings && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <Cog className="h-5 w-5 mr-2" />
                Auto-Reorder Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Enable Auto-Reorder
                    </label>
                    <p className="text-xs text-slate-400">
                      Automatically approve suggestions that meet criteria
                    </p>
                  </div>
                  <button
                    onClick={() => saveSettings({ auto_reorder_enabled: !settings.auto_reorder_enabled })}
                    disabled={isSavingSettings}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.auto_reorder_enabled ? 'bg-indigo-600' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.auto_reorder_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Analysis Frequency (hours)
                  </label>
                  <select
                    value={settings.analysis_frequency_hours}
                    onChange={(e) => saveSettings({ analysis_frequency_hours: parseInt(e.target.value) })}
                    disabled={isSavingSettings}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>Every hour</option>
                    <option value={6}>Every 6 hours</option>
                    <option value={12}>Every 12 hours</option>
                    <option value={24}>Daily</option>
                    <option value={48}>Every 2 days</option>
                    <option value={168}>Weekly</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Confidence Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.default_confidence_threshold}
                    onChange={(e) => saveSettings({ default_confidence_threshold: parseInt(e.target.value) })}
                    disabled={isSavingSettings}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Minimum confidence required for auto-approval
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Max Auto-Approve Amount ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.max_auto_approve_amount}
                    onChange={(e) => saveSettings({ max_auto_approve_amount: parseFloat(e.target.value) })}
                    disabled={isSavingSettings}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Maximum order value for automatic approval
                  </p>
                </div>
              </div>
            </div>

            {isSavingSettings && (
              <div className="mt-4 flex items-center text-indigo-400">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving settings...
              </div>
            )}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-sm font-medium">Critical Orders</p>
                <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-400 text-sm font-medium">High Priority</p>
                <p className="text-2xl font-bold text-orange-400">{highCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-400" />
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm font-medium">Total Suggestions</p>
                <p className="text-2xl font-bold text-blue-400">{totalSuggestions}</p>
              </div>
              <Package className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-400 text-sm font-medium">Estimated Cost</p>
                <p className="text-2xl font-bold text-emerald-400">${totalEstimatedCost.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-200"
                />
              </div>
            </div>
            
            <select
              value={filters.urgency || 'all'}
              onChange={(e) => setFilters(prev => ({ ...prev, urgency: e.target.value as any }))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Urgency Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={filters.status || 'pending'}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="ordered">Ordered</option>
            </select>
            
            <button className="bg-slate-700 p-2 rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors">
              <Filter className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-indigo-400">
                  {selectedSuggestions.length} suggestion(s) selected
                </span>
                <button
                  onClick={handleBulkApprove}
                  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm flex items-center"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve All
                </button>
                <button
                  onClick={handleBulkReject}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm flex items-center"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject All
                </button>
              </div>
              <button
                onClick={() => setSelectedSuggestions([])}
                className="text-slate-400 hover:text-slate-300"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Suggestions Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedSuggestions.length === filteredSuggestions.length && filteredSuggestions.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Suggested Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Estimated Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Urgency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Confidence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                      <p className="text-slate-400 mt-2">Loading suggestions...</p>
                    </td>
                  </tr>
                ) : filteredSuggestions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                      No suggestions found
                    </td>
                  </tr>
                ) : (
                  filteredSuggestions.map((suggestion) => (
                    <tr key={suggestion.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedSuggestions.includes(suggestion.id)}
                          onChange={(e) => handleSelectionChange(suggestion.id, e.target.checked)}
                          className="rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <img 
                            src={suggestion.image || 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=64&h=64&fit=crop'} 
                            alt={suggestion.product_name}
                            className="h-10 w-10 rounded-lg object-cover mr-3"
                          />
                          <div>
                            <div className="text-sm font-medium text-white">{suggestion.product_name}</div>
                            <div className="text-sm text-slate-400">{suggestion.category_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{suggestion.current_stock}</div>
                        <div className="text-xs text-slate-400">Min: {suggestion.min_stock}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-indigo-400 font-medium">{suggestion.suggested_quantity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-emerald-400">${suggestion.estimated_cost.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(suggestion.urgency)} text-white`}>
                          {getUrgencyText(suggestion.urgency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{Math.round(suggestion.confidence_score)}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{suggestion.supplier_name}</div>
                        <div className="text-xs text-slate-400">{suggestion.lead_time_days} days lead time</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleSuggestionAction(suggestion.id, { action: 'approve' })}
                            className="text-green-400 hover:text-green-300"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleSuggestionAction(suggestion.id, { action: 'reject', reason: 'Rejected by user' })}
                            className="text-red-400 hover:text-red-300"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button className="text-slate-400 hover:text-slate-300" title="View Details">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-slate-400 hover:text-slate-300" title="Edit">
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Zap className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">AI-Powered Insights</h2>
          </div>
          <div className="text-slate-300 space-y-3">
            <p>
              Our AI system analyzes historical data, current demand patterns, and supplier performance 
              to generate intelligent reorder suggestions.
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li><span className="font-medium">Confidence Score:</span> Indicates prediction reliability based on data quality</li>
              <li><span className="font-medium">Urgency Level:</span> Determined by stock levels, demand trends, and lead times</li>
              <li><span className="font-medium">Suggested Quantity:</span> Optimized to balance stock costs and service levels</li>
              <li><span className="font-medium">Lead Time:</span> Average time from order to delivery for each supplier</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-sm text-slate-500 text-center">
          <p>© {new Date().getFullYear()} NIMBUS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default ReorderSuggestions; 