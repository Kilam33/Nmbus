import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Package, 
  RefreshCw, 
  Filter, 
  Settings, 
  Search,
  TrendingDown,
  Clock,
  ShoppingCart,
  Eye,
  Edit,
  Plus,
  Download,
  Mail
} from 'lucide-react';

interface LowStockProduct {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  supplier: string;
  lastOrdered: string;
  daysUntilStockout: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  image?: string;
}

const LowStock = () => {
  const [products, setProducts] = useState<LowStockProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<LowStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = () => {
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const mockProducts: LowStockProduct[] = [
        {
          id: '1',
          name: 'Laptop Pro X',
          category: 'Electronics',
          currentStock: 5,
          minStock: 20,
          reorderPoint: 15,
          supplier: 'TechCorp Inc.',
          lastOrdered: '2024-01-15',
          daysUntilStockout: 3,
          priority: 'critical',
          image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=64&h=64&fit=crop'
        },
        {
          id: '2',
          name: 'Wireless Earbuds',
          category: 'Audio',
          currentStock: 12,
          minStock: 25,
          reorderPoint: 20,
          supplier: 'AudioTech Solutions',
          lastOrdered: '2024-01-10',
          daysUntilStockout: 7,
          priority: 'high',
          image: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=64&h=64&fit=crop'
        },
        {
          id: '3',
          name: 'Smart Watch Series 5',
          category: 'Wearables',
          currentStock: 8,
          minStock: 15,
          reorderPoint: 12,
          supplier: 'WearableTech Co.',
          lastOrdered: '2024-01-08',
          daysUntilStockout: 5,
          priority: 'high',
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=64&h=64&fit=crop'
        },
        {
          id: '4',
          name: 'Gaming Console Pro',
          category: 'Gaming',
          currentStock: 3,
          minStock: 10,
          reorderPoint: 8,
          supplier: 'GameTech Industries',
          lastOrdered: '2024-01-12',
          daysUntilStockout: 2,
          priority: 'critical',
          image: 'https://images.unsplash.com/photo-1486401899868-0e435ed85128?w=64&h=64&fit=crop'
        },
        {
          id: '5',
          name: 'Bluetooth Speaker',
          category: 'Audio',
          currentStock: 18,
          minStock: 30,
          reorderPoint: 25,
          supplier: 'SoundMaster Ltd.',
          lastOrdered: '2024-01-05',
          daysUntilStockout: 12,
          priority: 'medium',
          image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=64&h=64&fit=crop'
        },
        {
          id: '6',
          name: 'Tablet Air',
          category: 'Electronics',
          currentStock: 6,
          minStock: 18,
          reorderPoint: 15,
          supplier: 'TechCorp Inc.',
          lastOrdered: '2024-01-14',
          daysUntilStockout: 4,
          priority: 'critical',
          image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=64&h=64&fit=crop'
        }
      ];

      setProducts(mockProducts);
      setFilteredProducts(mockProducts);
      setLastRefreshed(new Date());
      setIsLoading(false);
    }, 800);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered = products;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.supplier.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(product => product.priority === priorityFilter);
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, priorityFilter]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Critical';
      case 'high': return 'High';
      case 'medium': return 'Medium';
      case 'low': return 'Low';
      default: return 'Unknown';
    }
  };

  const criticalCount = products.filter(p => p.priority === 'critical').length;
  const highCount = products.filter(p => p.priority === 'high').length;
  const totalLowStock = products.length;

  return (
    <div className="bg-slate-900 min-h-screen text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Low Stock Alerts</h1>
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
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </button>
            <button className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
              <Download className="h-5 w-5 text-slate-400" />
            </button>
            <button className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
              <Mail className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Alert Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-sm font-medium">Critical Alerts</p>
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
              <TrendingDown className="h-8 w-8 text-orange-400" />
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm font-medium">Total Low Stock</p>
                <p className="text-2xl font-bold text-blue-400">{totalLowStock}</p>
              </div>
              <Package className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-sm font-medium">Avg. Days Left</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {Math.round(products.reduce((sum, p) => sum + p.daysUntilStockout, 0) / products.length || 0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
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
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Priorities</option>
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

        {/* Products Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Stock Level</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Days Left</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Last Ordered</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover mr-3"
                        />
                        <div>
                          <div className="text-sm font-medium text-white">{product.name}</div>
                          <div className="text-sm text-slate-400">{product.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{product.currentStock}</div>
                      <div className="text-xs text-slate-400">Min: {product.minStock}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(product.priority)} text-white`}>
                        {getPriorityText(product.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{product.daysUntilStockout}</div>
                      <div className="text-xs text-slate-400">days</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {product.supplier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {new Date(product.lastOrdered).toLocaleDateString()}
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

        {/* Empty State */}
        {filteredProducts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No low stock items found</h3>
            <p className="text-slate-500">All products are well stocked or try adjusting your filters.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-sm text-slate-500 text-center">
          <p>© {new Date().getFullYear()} NIMBUS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LowStock; 