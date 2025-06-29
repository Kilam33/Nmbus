import React, { useState, useEffect } from 'react';
import { format, subMonths } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  Zap, 
  RefreshCw, 
  Filter, 
  Settings, 
  Search,
  TrendingUp,
  Package,
  Clock,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface TurnoverData {
  month: string;
  turnoverRate: number;
  avgInventory: number;
  costOfGoods: number;
  sales: number;
  daysToSell: number;
}

interface ProductTurnover {
  id: string;
  name: string;
  category: string;
  turnoverRate: number;
  avgInventory: number;
  costOfGoods: number;
  sales: number;
  daysToSell: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  color?: string;
}

interface CategoryPerformance {
  category: string;
  turnoverRate: number;
  avgInventory: number;
  efficiency: number;
  color: string;
}

const InventoryTurnover = () => {
  const [turnoverData, setTurnoverData] = useState<TurnoverData[]>([]);
  const [productTurnover, setProductTurnover] = useState<ProductTurnover[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [timeframe, setTimeframe] = useState('12');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Color palette for charts
  const chartColors = {
    primary: '#8b5cf6', // indigo
    secondary: '#f43f5e', // rose
    success: '#10b981', // emerald
    warning: '#f59e0b', // amber
    danger: '#ef4444', // red
    categories: [
      '#8b5cf6', // indigo
      '#22d3ee', // cyan
      '#f97316', // orange
      '#a3e635', // lime
      '#ec4899', // pink
      '#06b6d4'  // cyan
    ]
  };

  const loadData = () => {
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const months = parseInt(timeframe);
      const today = new Date();
      const data: TurnoverData[] = [];
      
      // Generate turnover data for the selected period
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(today, i);
        const baseTurnover = 4.5;
        const seasonality = Math.sin((i / months) * Math.PI * 2) * 1.5;
        const trend = i * 0.1;
        const random = Math.random() * 0.8 - 0.4;
        
        const turnoverRate = Math.max(0.5, baseTurnover + seasonality + trend + random);
        const avgInventory = Math.max(1000, Math.round(50000 / turnoverRate + Math.random() * 2000 - 1000));
        const costOfGoods = Math.round(avgInventory * 0.6);
        const sales = Math.round(avgInventory * turnoverRate);
        const daysToSell = Math.round(365 / turnoverRate);
        
        data.push({
          month: format(date, 'MMM yyyy'),
          turnoverRate: Math.round(turnoverRate * 100) / 100,
          avgInventory,
          costOfGoods,
          sales,
          daysToSell
        });
      }

      // Generate product turnover data
      const products: ProductTurnover[] = [
        {
          id: '1',
          name: 'Laptop Pro X',
          category: 'Electronics',
          turnoverRate: 6.2,
          avgInventory: 25,
          costOfGoods: 15000,
          sales: 93000,
          daysToSell: 59,
          status: 'excellent',
          color: chartColors.categories[0]
        },
        {
          id: '2',
          name: 'Wireless Earbuds',
          category: 'Audio',
          turnoverRate: 8.5,
          avgInventory: 35,
          costOfGoods: 8750,
          sales: 74375,
          daysToSell: 43,
          status: 'excellent',
          color: chartColors.categories[1]
        },
        {
          id: '3',
          name: 'Smart Watch',
          category: 'Wearables',
          turnoverRate: 4.8,
          avgInventory: 42,
          costOfGoods: 12600,
          sales: 60480,
          daysToSell: 76,
          status: 'good',
          color: chartColors.categories[2]
        },
        {
          id: '4',
          name: 'Gaming Console',
          category: 'Gaming',
          turnoverRate: 2.1,
          avgInventory: 48,
          costOfGoods: 24000,
          sales: 50400,
          daysToSell: 174,
          status: 'poor',
          color: chartColors.categories[3]
        },
        {
          id: '5',
          name: 'Bluetooth Speaker',
          category: 'Audio',
          turnoverRate: 5.3,
          avgInventory: 30,
          costOfGoods: 4500,
          sales: 23850,
          daysToSell: 69,
          status: 'good',
          color: chartColors.categories[4]
        },
        {
          id: '6',
          name: 'Tablet Air',
          category: 'Electronics',
          turnoverRate: 3.7,
          avgInventory: 22,
          costOfGoods: 11000,
          sales: 40700,
          daysToSell: 99,
          status: 'fair',
          color: chartColors.categories[5]
        }
      ];

      // Generate category performance data
      const categories: CategoryPerformance[] = [
        {
          category: 'Audio',
          turnoverRate: 6.9,
          avgInventory: 32.5,
          efficiency: 85,
          color: chartColors.categories[1]
        },
        {
          category: 'Electronics',
          turnoverRate: 4.95,
          avgInventory: 23.5,
          efficiency: 78,
          color: chartColors.categories[0]
        },
        {
          category: 'Wearables',
          turnoverRate: 4.8,
          avgInventory: 42,
          efficiency: 72,
          color: chartColors.categories[2]
        },
        {
          category: 'Gaming',
          turnoverRate: 2.1,
          avgInventory: 48,
          efficiency: 45,
          color: chartColors.categories[3]
        }
      ];

      setTurnoverData(data);
      setProductTurnover(products);
      setCategoryPerformance(categories);
      setLastRefreshed(new Date());
      setIsLoading(false);
    }, 800);
  };

  useEffect(() => {
    loadData();
  }, [timeframe]);

  const refreshData = () => {
    loadData();
  };

  // Calculate summary metrics
  const avgTurnoverRate = turnoverData.reduce((sum, item) => sum + item.turnoverRate, 0) / turnoverData.length;
  const totalAvgInventory = turnoverData.reduce((sum, item) => sum + item.avgInventory, 0);
  const totalSales = turnoverData.reduce((sum, item) => sum + item.sales, 0);
  const avgDaysToSell = turnoverData.reduce((sum, item) => sum + item.daysToSell, 0) / turnoverData.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-emerald-400';
      case 'good': return 'text-blue-400';
      case 'fair': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'good': return <TrendingUp className="h-4 w-4 text-blue-400" />;
      case 'fair': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'poor': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <Package className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-slate-900 min-h-screen text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Inventory Turnover</h1>
            <p className="text-slate-400 mt-1">
              Last updated: {lastRefreshed.toLocaleTimeString()} 
              <button 
                onClick={refreshData}
                disabled={isLoading}
                className={`ml-3 ${isLoading ? 'text-slate-500' : 'text-indigo-400 hover:text-indigo-300'} inline-flex items-center`}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> 
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="6">Last 6 months</option>
              <option value="12">Last 12 months</option>
              <option value="24">Last 24 months</option>
            </select>
            <button className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
              <Settings className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-400 text-sm font-medium">Avg Turnover Rate</p>
                <p className="text-2xl font-bold text-indigo-400">{avgTurnoverRate.toFixed(1)}x</p>
                <p className="text-xs text-indigo-400 mt-1">Per year</p>
              </div>
              <Zap className="h-8 w-8 text-indigo-400" />
            </div>
          </div>
          
          <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-400 text-sm font-medium">Total Sales</p>
                <p className="text-2xl font-bold text-emerald-400">${totalSales.toLocaleString()}</p>
                <p className="text-xs text-emerald-400 mt-1">Period total</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm font-medium">Avg Inventory</p>
                <p className="text-2xl font-bold text-blue-400">${totalAvgInventory.toLocaleString()}</p>
                <p className="text-xs text-blue-400 mt-1">Average value</p>
              </div>
              <Package className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-400 text-sm font-medium">Days to Sell</p>
                <p className="text-2xl font-bold text-amber-400">{Math.round(avgDaysToSell)}</p>
                <p className="text-xs text-amber-400 mt-1">Average</p>
              </div>
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Turnover Rate Trend */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Turnover Rate Trend</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={turnoverData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderColor: '#334155',
                      color: '#fff'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="turnoverRate"
                    stroke={chartColors.primary}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Performance Radar */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Category Performance</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={categoryPerformance}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="category" stroke="#64748b" />
                  <PolarRadiusAxis stroke="#64748b" />
                  <Radar
                    name="Efficiency"
                    dataKey="efficiency"
                    stroke={chartColors.primary}
                    fill={chartColors.primary}
                    fillOpacity={0.3}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderColor: '#334155',
                      color: '#fff'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Product Turnover Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Product Turnover Analysis</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Turnover Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Avg Inventory</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Sales</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Days to Sell</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {productTurnover.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-indigo-400 font-medium">{product.turnoverRate}x</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-400">${product.avgInventory.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-emerald-400">${product.sales.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-amber-400">{product.daysToSell} days</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(product.status)}
                        <span className={`ml-2 text-sm font-medium ${getStatusColor(product.status)}`}>
                          {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Target className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Turnover Insights</h2>
          </div>
          <div className="text-slate-300 space-y-3">
            <p>
              <span className="font-medium">Turnover Rate:</span> Measures how many times inventory is sold and replaced in a given period. 
              Higher rates indicate better inventory management.
            </p>
            <ul className="list-disc list-inside pl-4 space-y-1">
              <li><span className="font-medium">Excellent (6x+):</span> Optimal inventory management</li>
              <li><span className="font-medium">Good (4-6x):</span> Above average performance</li>
              <li><span className="font-medium">Fair (2-4x):</span> Room for improvement</li>
              <li><span className="font-medium">Poor (&lt;2x):</span> Requires immediate attention</li>
            </ul>
            <p className="pt-2">
              <span className="font-medium">Days to Sell:</span> Average number of days it takes to sell inventory. 
              Lower numbers indicate faster sales cycles.
            </p>
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

export default InventoryTurnover; 