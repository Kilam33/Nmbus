import React, { useState, useEffect } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
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
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  RefreshCw, 
  Filter, 
  Settings, 
  Search,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Download,
  Calendar,
  Target,
  Award,
  TrendingDown
} from 'lucide-react';

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
  avgOrderValue: number;
}

interface TopProduct {
  id: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  growth: number;
  color?: string;
}

interface SalesByCategory {
  category: string;
  revenue: number;
  percentage: number;
  color: string;
}

const SalesReport = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<SalesByCategory[]>([]);
  const [dateRange, setDateRange] = useState('30');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Color palette for charts
  const chartColors = {
    primary: '#8b5cf6', // indigo
    secondary: '#f43f5e', // rose
    success: '#10b981', // emerald
    warning: '#f59e0b', // amber
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
      const days = parseInt(dateRange);
      const today = new Date();
      const data: SalesData[] = [];
      
      // Generate sales data for the selected period
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const baseRevenue = 5000;
        const seasonality = Math.sin((i / days) * Math.PI * 2) * 1000;
        const trend = i * 50;
        const random = Math.random() * 800 - 400;
        
        const revenue = Math.max(0, Math.round(baseRevenue + seasonality + trend + random));
        const orders = Math.max(0, Math.round(revenue / 100 + Math.random() * 20 - 10));
        const customers = Math.max(0, Math.round(orders * 0.8 + Math.random() * 10 - 5));
        const avgOrderValue = revenue / orders;
        
        data.push({
          date: format(date, 'MMM dd'),
          revenue,
          orders,
          customers,
          avgOrderValue: Math.round(avgOrderValue)
        });
      }

      // Generate top products data
      const products: TopProduct[] = [
        {
          id: '1',
          name: 'Laptop Pro X',
          category: 'Electronics',
          unitsSold: 150,
          revenue: 225000,
          growth: 12.5,
          color: chartColors.categories[0]
        },
        {
          id: '2',
          name: 'Wireless Earbuds',
          category: 'Audio',
          unitsSold: 300,
          revenue: 45000,
          growth: 8.2,
          color: chartColors.categories[1]
        },
        {
          id: '3',
          name: 'Smart Watch',
          category: 'Wearables',
          unitsSold: 200,
          revenue: 80000,
          growth: 15.7,
          color: chartColors.categories[2]
        },
        {
          id: '4',
          name: 'Gaming Console',
          category: 'Gaming',
          unitsSold: 100,
          revenue: 50000,
          growth: -2.1,
          color: chartColors.categories[3]
        },
        {
          id: '5',
          name: 'Bluetooth Speaker',
          category: 'Audio',
          unitsSold: 250,
          revenue: 37500,
          growth: 5.3,
          color: chartColors.categories[4]
        }
      ];

      // Generate sales by category data
      const categories: SalesByCategory[] = [
        {
          category: 'Electronics',
          revenue: 225000,
          percentage: 45,
          color: chartColors.categories[0]
        },
        {
          category: 'Audio',
          revenue: 82500,
          percentage: 16.5,
          color: chartColors.categories[1]
        },
        {
          category: 'Wearables',
          revenue: 80000,
          percentage: 16,
          color: chartColors.categories[2]
        },
        {
          category: 'Gaming',
          revenue: 50000,
          percentage: 10,
          color: chartColors.categories[3]
        },
        {
          category: 'Accessories',
          revenue: 37500,
          percentage: 7.5,
          color: chartColors.categories[4]
        },
        {
          category: 'Others',
          revenue: 25000,
          percentage: 5,
          color: chartColors.categories[5]
        }
      ];

      setSalesData(data);
      setTopProducts(products);
      setSalesByCategory(categories);
      setLastRefreshed(new Date());
      setIsLoading(false);
    }, 800);
  };

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const refreshData = () => {
    loadData();
  };

  // Calculate summary metrics
  const totalRevenue = salesData.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = salesData.reduce((sum, item) => sum + item.orders, 0);
  const totalCustomers = salesData.reduce((sum, item) => sum + item.customers, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Calculate growth rates (comparing first half vs second half of period)
  const midPoint = Math.floor(salesData.length / 2);
  const firstHalfRevenue = salesData.slice(0, midPoint).reduce((sum, item) => sum + item.revenue, 0);
  const secondHalfRevenue = salesData.slice(midPoint).reduce((sum, item) => sum + item.revenue, 0);
  const revenueGrowth = firstHalfRevenue > 0 ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;

  return (
    <div className="bg-slate-900 min-h-screen text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Sales Report</h1>
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
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
              <Download className="h-5 w-5 text-slate-400" />
            </button>
            <button className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
              <Settings className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-400 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-400">${totalRevenue.toLocaleString()}</p>
                <div className="flex items-center mt-1">
                  {revenueGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-400 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-400 mr-1" />
                  )}
                  <span className={`text-xs ${revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {Math.abs(revenueGrowth).toFixed(1)}% vs previous period
                  </span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm font-medium">Total Orders</p>
                <p className="text-2xl font-bold text-blue-400">{totalOrders.toLocaleString()}</p>
                <p className="text-xs text-blue-400 mt-1">Across {dateRange} days</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-sm font-medium">Total Customers</p>
                <p className="text-2xl font-bold text-purple-400">{totalCustomers.toLocaleString()}</p>
                <p className="text-xs text-purple-400 mt-1">Unique customers</p>
              </div>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-amber-900/20 border border-amber-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-400 text-sm font-medium">Avg Order Value</p>
                <p className="text-2xl font-bold text-amber-400">${avgOrderValue.toFixed(0)}</p>
                <p className="text-xs text-amber-400 mt-1">Per transaction</p>
              </div>
              <Target className="h-8 w-8 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Trend */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Revenue Trend</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderColor: '#334155',
                      color: '#fff'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={chartColors.primary}
                    fill={chartColors.primary}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Orders vs Customers */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Orders vs Customers</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderColor: '#334155',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="orders" name="Orders" fill={chartColors.primary} />
                  <Bar dataKey="customers" name="Customers" fill={chartColors.secondary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sales by Category and Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sales by Category */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Sales by Category</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${category} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                  >
                    {salesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      borderColor: '#334155',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Top Products</h2>
            <div className="space-y-3">
              {topProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 hover:bg-slate-700 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-slate-200">{product.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.growth >= 0
                          ? 'bg-emerald-900/30 text-emerald-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}
                    >
                      {product.growth >= 0 ? '+' : ''}{product.growth.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">{product.unitsSold} units sold</span>
                    <span className="text-indigo-400">
                      ${product.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(product.revenue / Math.max(...topProducts.map(p => p.revenue))) * 100}%`,
                        backgroundColor: product.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Sales Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Daily Sales Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Customers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Avg Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {salesData.slice(-10).map((item, index) => (
                  <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{item.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-400">${item.revenue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">{item.orders}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-400">{item.customers}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-400">${item.avgOrderValue.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

export default SalesReport; 