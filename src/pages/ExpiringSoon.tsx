import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Package, 
  RefreshCw, 
  Filter, 
  Settings, 
  Search,
  AlertTriangle,
  Calendar,
  Trash2,
  Eye,
  Edit,
  Download,
  Mail,
  TrendingDown
} from 'lucide-react';
import { ProductsService, Product } from '../services/products';
import { formatCurrency } from '../utils/formatters';

interface ExpiringProduct extends Product {
  batchNumber: string;
  expirationDate: string;
  daysUntilExpiry: number;
  supplier: string;
  purchaseDate: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  image?: string;
  value: number;
  category: string;
}

const ExpiringSoon = () => {
  const [products, setProducts] = useState<ExpiringProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ExpiringProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = async () => {
    setIsLoading(true);
    
    try {
      const productsData = await ProductsService.getExpiringProducts(30, 50);

      // Transform the API response to match our interface
      const expiringProducts: ExpiringProduct[] = productsData.map((product: Product) => {
        // Calculate expiration date (mock calculation for now)
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + Math.floor(Math.random() * 30) + 1);
        
        const daysUntilExpiry = Math.ceil((expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const priority = daysUntilExpiry <= 3 ? 'critical' : 
                        daysUntilExpiry <= 7 ? 'high' : 
                        daysUntilExpiry <= 14 ? 'medium' : 'low';
        
        return {
          ...product,
          batchNumber: `BATCH-${product.id.substring(0, 8).toUpperCase()}`,
          expirationDate: expirationDate.toISOString().split('T')[0],
          daysUntilExpiry,
          supplier: product.suppliers?.name || 'Unknown Supplier',
          purchaseDate: product.created_at.split('T')[0],
          priority,
          category: product.categories?.name || 'Uncategorized',
          value: product.price * product.quantity,
          image: `https://images.unsplash.com/photo-${Math.random().toString(36).substring(7)}?w=64&h=64&fit=crop`
        };
      });

      setProducts(expiringProducts);
      setFilteredProducts(expiringProducts);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error loading expiring products:', error);
    } finally {
      setIsLoading(false);
    }
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
        product.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())
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
  const totalExpiring = products.length;
  const totalValue = products.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="bg-slate-900 min-h-screen text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Expiring Soon</h1>
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
            <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg flex items-center">
              <Trash2 className="h-4 w-4 mr-2" />
              Mark Expired
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
                <p className="text-red-400 text-sm font-medium">Critical (≤3 days)</p>
                <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-400 text-sm font-medium">High (≤7 days)</p>
                <p className="text-2xl font-bold text-orange-400">{highCount}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-400" />
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm font-medium">Total Expiring</p>
                <p className="text-2xl font-bold text-blue-400">{totalExpiring}</p>
              </div>
              <Package className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-sm font-medium">Total Value</p>
                <p className="text-2xl font-bold text-yellow-400">{formatCurrency(totalValue)}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-400" />
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
              <option value="critical">Critical (≤3 days)</option>
              <option value="high">High (≤7 days)</option>
              <option value="medium">Medium (≤14 days)</option>
              <option value="low">Low (≤30 days)</option>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Batch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Days Left</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Value</th>
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
                      <div className="text-sm text-white">{product.batchNumber}</div>
                      <div className="text-xs text-slate-400">{product.supplier}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{product.quantity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {new Date(product.expirationDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(product.priority)} text-white mr-2`}>
                          {product.daysUntilExpiry}
                        </span>
                        <span className="text-xs text-slate-400">days</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{formatCurrency(product.value)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button className="text-indigo-400 hover:text-indigo-300">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-red-400 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
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
            <Clock className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No expiring products found</h3>
            <p className="text-slate-500">All products are well within their expiration dates or try adjusting your filters.</p>
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

export default ExpiringSoon; 