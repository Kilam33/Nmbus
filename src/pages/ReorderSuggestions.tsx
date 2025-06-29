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
  Zap
} from 'lucide-react';

interface ReorderSuggestion {
  id: string;
  productName: string;
  category: string;
  supplier: string;
  currentStock: number;
  minStock: number;
  suggestedQuantity: number;
  estimatedCost: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  reason: string;
  lastOrderDate: string;
  leadTime: number;
  image?: string;
}

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
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = () => {
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const mockSuggestions: ReorderSuggestion[] = [
        {
          id: '1',
          productName: 'Laptop Pro X',
          category: 'Electronics',
          supplier: 'TechCorp Inc.',
          currentStock: 5,
          minStock: 20,
          suggestedQuantity: 25,
          estimatedCost: 37500,
          urgency: 'critical',
          confidence: 0.95,
          reason: 'Stock below minimum threshold',
          lastOrderDate: '2024-01-10',
          leadTime: 7,
          image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=64&h=64&fit=crop'
        },
        {
          id: '2',
          productName: 'Wireless Earbuds',
          category: 'Audio',
          supplier: 'AudioTech Solutions',
          currentStock: 12,
          minStock: 25,
          suggestedQuantity: 30,
          estimatedCost: 4500,
          urgency: 'high',
          confidence: 0.88,
          reason: 'High demand trend detected',
          lastOrderDate: '2024-01-15',
          leadTime: 5,
          image: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=64&h=64&fit=crop'
        },
        {
          id: '3',
          productName: 'Smart Watch Series 5',
          category: 'Wearables',
          supplier: 'WearableTech Co.',
          currentStock: 8,
          minStock: 15,
          suggestedQuantity: 20,
          estimatedCost: 8000,
          urgency: 'high',
          confidence: 0.92,
          reason: 'Seasonal demand increase',
          lastOrderDate: '2024-01-08',
          leadTime: 10,
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=64&h=64&fit=crop'
        },
        {
          id: '4',
          productName: 'Gaming Console Pro',
          category: 'Gaming',
          supplier: 'GameTech Industries',
          currentStock: 3,
          minStock: 10,
          suggestedQuantity: 15,
          estimatedCost: 7500,
          urgency: 'critical',
          confidence: 0.85,
          reason: 'Critical stock level',
          lastOrderDate: '2024-01-12',
          leadTime: 14,
          image: 'https://images.unsplash.com/photo-1486401899868-0e435ed85128?w=64&h=64&fit=crop'
        },
        {
          id: '5',
          productName: 'Bluetooth Speaker',
          category: 'Audio',
          supplier: 'SoundMaster Ltd.',
          currentStock: 18,
          minStock: 30,
          suggestedQuantity: 25,
          estimatedCost: 2500,
          urgency: 'medium',
          confidence: 0.78,
          reason: 'Moderate demand forecast',
          lastOrderDate: '2024-01-05',
          leadTime: 8,
          image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=64&h=64&fit=crop'
        },
        {
          id: '6',
          productName: 'Tablet Air',
          category: 'Electronics',
          supplier: 'TechCorp Inc.',
          currentStock: 6,
          minStock: 18,
          suggestedQuantity: 20,
          estimatedCost: 12000,
          urgency: 'medium',
          confidence: 0.82,
          reason: 'Stock approaching minimum',
          lastOrderDate: '2024-01-14',
          leadTime: 12,
          image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=64&h=64&fit=crop'
        }
      ];

      const mockSuppliers: SupplierInfo[] = [
        {
          name: 'TechCorp Inc.',
          rating: 4.8,
          avgLeadTime: 9.5,
          reliability: 0.95,
          contactInfo: 'orders@techcorp.com'
        },
        {
          name: 'AudioTech Solutions',
          rating: 4.6,
          avgLeadTime: 5.2,
          reliability: 0.92,
          contactInfo: 'sales@audiotech.com'
        },
        {
          name: 'WearableTech Co.',
          rating: 4.4,
          avgLeadTime: 10.8,
          reliability: 0.88,
          contactInfo: 'orders@wearabletech.com'
        },
        {
          name: 'GameTech Industries',
          rating: 4.2,
          avgLeadTime: 14.3,
          reliability: 0.85,
          contactInfo: 'purchasing@gametech.com'
        },
        {
          name: 'SoundMaster Ltd.',
          rating: 4.7,
          avgLeadTime: 8.1,
          reliability: 0.93,
          contactInfo: 'orders@soundmaster.com'
        }
      ];

      setSuggestions(mockSuggestions);
      setFilteredSuggestions(mockSuggestions);
      setSuppliers(mockSuppliers);
      setLastRefreshed(new Date());
      setIsLoading(false);
    }, 800);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = suggestions;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(suggestion =>
        suggestion.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        suggestion.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        suggestion.supplier.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply urgency filter
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(suggestion => suggestion.urgency === urgencyFilter);
    }

    setFilteredSuggestions(filtered);
  }, [suggestions, searchQuery, urgencyFilter]);

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

  const criticalCount = suggestions.filter(s => s.urgency === 'critical').length;
  const highCount = suggestions.filter(s => s.urgency === 'high').length;
  const totalSuggestions = suggestions.length;
  const totalEstimatedCost = suggestions.reduce((sum, s) => sum + s.estimatedCost, 0);

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
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> 
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg flex items-center">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Create Orders
            </button>
            <button className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
              <Download className="h-5 w-5 text-slate-400" />
            </button>
            <button className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
              <Mail className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

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
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Urgency Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <button className="bg-slate-700 p-2 rounded-lg border border-slate-600 hover:bg-slate-600 transition-colors">
              <Filter className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Suggestions Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
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
                {filteredSuggestions.map((suggestion) => (
                  <tr key={suggestion.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img 
                          src={suggestion.image} 
                          alt={suggestion.productName}
                          className="h-10 w-10 rounded-lg object-cover mr-3"
                        />
                        <div>
                          <div className="text-sm font-medium text-white">{suggestion.productName}</div>
                          <div className="text-sm text-slate-400">{suggestion.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{suggestion.currentStock}</div>
                      <div className="text-xs text-slate-400">Min: {suggestion.minStock}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-indigo-400 font-medium">{suggestion.suggestedQuantity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-emerald-400">${suggestion.estimatedCost.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUrgencyColor(suggestion.urgency)} text-white`}>
                        {getUrgencyText(suggestion.urgency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{Math.round(suggestion.confidence * 100)}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-300">{suggestion.supplier}</div>
                      <div className="text-xs text-slate-400">{suggestion.leadTime} days lead time</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-indigo-400 hover:text-indigo-300">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-green-400 hover:text-green-300">
                          <ShoppingCart className="h-4 w-4" />
                        </button>
                        <button className="text-slate-400 hover:text-slate-300">
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplier Information */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Supplier Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier, index) => (
              <div key={index} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-white">{supplier.name}</h3>
                  <div className="flex items-center">
                    <span className="text-yellow-400 text-sm">{supplier.rating}</span>
                    <span className="text-slate-400 text-sm ml-1">★</span>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-slate-300">
                  <div>Avg Lead Time: {supplier.avgLeadTime} days</div>
                  <div>Reliability: {Math.round(supplier.reliability * 100)}%</div>
                  <div className="text-slate-400">{supplier.contactInfo}</div>
                </div>
              </div>
            ))}
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