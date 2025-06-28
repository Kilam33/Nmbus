import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, DollarSign, ShoppingCart, TrendingUp, AlertTriangle, 
  Truck, BarChart2, Calendar, Clock, Settings, Search, Filter, 
  RefreshCw, Archive, ArrowDown, ArrowUp, Tags, Users, ClipboardList
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend: string | null;
  trendDirection: 'positive' | 'negative' | 'neutral';
  onClick?: () => void;
  color?: string;
}

interface AlertProps {
  id: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp?: string;
}

interface ShipmentProps {
  id: number;
  product: string;
  quantity: number;
  expectedDate: string;
  supplier?: string;
  status?: string;
}

interface InventoryItemProps {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  threshold: number;
  category: string;
  location: string;
}

interface DashboardData {
  totalProducts: number;
  totalCategories: number;
  totalSuppliers: number;
  totalOrders: number;
  revenue: number;
  lowStockItems: number;
  revenueChange: number;
  ordersByStatus: {
    status: string;
    count: number;
  }[];
  productsByCategory: {
    category: string;
    count: number;
  }[];
  recentAlerts: AlertProps[];
  upcomingShipments: ShipmentProps[];
  inventoryTrends: {
    name: string;
    products: number;
    revenue: number;
  }[];
  categoryBreakdown: {
    name: string;
    value: number;
    color: string;
  }[];
  lowStockInventory: InventoryItemProps[];
  topSellingProducts: {
    id: number;
    name: string;
    sold: number;
    revenue: number;
    inStock: number;
  }[];
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendDirection,
  onClick,
  color = 'indigo' 
}) => {
  const trendColorMap = {
    positive: 'text-emerald-400',
    negative: 'text-rose-400',
    neutral: 'text-slate-400'
  };

  const bgColorMap = {
    indigo: 'bg-indigo-900/30',
    emerald: 'bg-emerald-900/30',
    amber: 'bg-amber-900/30',
    rose: 'bg-rose-900/30',
    violet: 'bg-violet-900/30',
    green: 'bg-green-900/30'
  };

  const textColorMap = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    violet: 'text-violet-400',
    green: 'text-green-400'
  };

  return (
    <div 
      className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700 hover:border-slate-600 transition-all duration-300"
      onClick={onClick}
    >
      <div className="flex items-center mb-4">
        <div className={`p-3 rounded-full ${bgColorMap[color as keyof typeof bgColorMap]} mr-4`}>
          <Icon className={`h-6 w-6 ${textColorMap[color as keyof typeof textColorMap]}`} />
        </div>
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
      {trend && (
        <div className="flex items-center">
          {trendDirection === 'positive' ? (
            <ArrowUp className={`h-4 w-4 mr-2 ${trendColorMap[trendDirection]}`} />
          ) : trendDirection === 'negative' ? (
            <ArrowDown className={`h-4 w-4 mr-2 ${trendColorMap[trendDirection]}`} />
          ) : (
            <TrendingUp className={`h-4 w-4 mr-2 ${trendColorMap[trendDirection]}`} />
          )}
          <span className={`text-sm ${trendColorMap[trendDirection]}`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
};

const Alert: React.FC<{ alert: AlertProps }> = ({ alert }) => {
  const severityColors = {
    high: 'bg-rose-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500'
  };
  
  return (
    <div className="flex items-center p-3 bg-slate-700/50 rounded-lg mb-2 border border-slate-600 hover:bg-slate-700 transition-all">
      <div className={`w-3 h-3 rounded-full ${severityColors[alert.severity]} mr-3`}></div>
      <div className="flex-grow">
        <p className="text-slate-200">{alert.message}</p>
        {alert.timestamp && <p className="text-xs text-slate-400 mt-1">{alert.timestamp}</p>}
      </div>
    </div>
  );
};

const InventoryItem: React.FC<{ item: InventoryItemProps }> = ({ item }) => {
  const percentage = Math.round((item.quantity / item.threshold) * 100);
  
  return (
    <div className="p-3 bg-slate-700/50 rounded-lg mb-2 border border-slate-600 hover:bg-slate-700 transition-all">
      <div className="flex justify-between mb-1">
        <span className="font-medium text-slate-200">{item.name}</span>
        <span className="text-slate-400 text-sm">{item.sku}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-slate-400 text-sm">{item.location} • {item.category}</span>
        <span className="text-slate-200">{item.quantity} / {item.threshold}</span>
      </div>
      <div className="mt-2 h-2 w-full bg-slate-600 rounded-full overflow-hidden">
        <div 
          className={`h-full ${percentage < 30 ? 'bg-rose-500' : percentage < 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalProducts: 0,
    totalCategories: 0,
    totalSuppliers: 0,
    totalOrders: 0,
    revenue: 0,
    lowStockItems: 0,
    revenueChange: 0,
    ordersByStatus: [],
    productsByCategory: [],
    recentAlerts: [],
    upcomingShipments: [],
    inventoryTrends: [],
    categoryBreakdown: [],
    lowStockInventory: [],
    topSellingProducts: []
  });
  
  const [selectedView, setSelectedView] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedSection, setSelectedSection] = useState<'overview' | 'inventory' | 'orders'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch total counts
      const [
        { count: productsCount },
        { count: categoriesCount },
        { count: suppliersCount },
        { count: ordersCount },
        { count: lowStockCount },
        { data: revenueData },
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact' }),
        supabase.from('categories').select('*', { count: 'exact' }),
        supabase.from('suppliers').select('*', { count: 'exact' }),
        supabase.from('orders').select('*', { count: 'exact' }),
        supabase.from('products').select('*', { count: 'exact' }).lt('quantity', 10),
        supabase.from('orders').select('total_amount').eq('status', 'completed'),
      ]);

      // Calculate revenue and change
      const revenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const revenueChange = 12.5; // This would normally come from your data

      // Fetch orders by status
      const { data: orderStatusData } = await supabase
        .from('orders')
        .select('status');

      let ordersByStatus: { status: string; count: number }[] = [];
      if (orderStatusData) {
        const counts: Record<string, number> = {};
        orderStatusData.forEach(order => {
          counts[order.status] = (counts[order.status] || 0) + 1;
        });
        ordersByStatus = Object.entries(counts).map(([status, count]) => ({
          status,
          count,
        }));
      }

      // Fetch products by category
      const { data: categoryData } = await supabase
        .from('products')
        .select('categories (name)');

      let productsByCategory: { category: string; count: number }[] = [];
      if (categoryData) {
        const counts: Record<string, number> = {};
        categoryData.forEach((product: any) => {
          const categoryName = product.categories?.name || 'Uncategorized';
          counts[categoryName] = (counts[categoryName] || 0) + 1;
        });
        productsByCategory = Object.entries(counts).map(([category, count]) => ({
          category,
          count,
        }));
      }

      // Mock data for other sections (replace with actual Supabase queries as needed)
      const recentAlerts = [
        { id: 1, message: 'Laptop XPS 15 stock below threshold', severity: 'high' as const, timestamp: '30 min ago' },
        { id: 2, message: 'Order #4592 awaiting approval', severity: 'medium' as const, timestamp: '2 hours ago' },
        { id: 3, message: 'Weekly inventory report ready', severity: 'low' as const, timestamp: '5 hours ago' },
      ];

      const upcomingShipments = [
        { id: 1, product: 'Laptop XPS 15', quantity: 50, expectedDate: '2024-04-15', supplier: 'Dell Inc.', status: 'In Transit' },
        { id: 2, product: 'Smartphone Galaxy S24', quantity: 100, expectedDate: '2024-04-20', supplier: 'Samsung', status: 'Processing' },
      ];

      const inventoryTrends = [
        { name: 'Jan', products: 200, revenue: 15000 },
        { name: 'Feb', products: 220, revenue: 18000 },
        { name: 'Mar', products: 246, revenue: 24567 },
      ];

      const categoryBreakdown = [
        { name: 'Electronics', value: 45, color: '#8b5cf6' },
        { name: 'Accessories', value: 25, color: '#22d3ee' },
        { name: 'Peripherals', value: 15, color: '#FDBD01' },
      ];

      const lowStockInventory = [
        { id: 1, name: 'Laptop XPS 15', sku: 'LAP-XPS-15', quantity: 5, threshold: 20, category: 'Electronics', location: 'Warehouse A' },
        { id: 2, name: 'Wireless Mouse MX', sku: 'ACC-MX-001', quantity: 8, threshold: 30, category: 'Accessories', location: 'Warehouse B' },
      ];

      const topSellingProducts = [
        { id: 1, name: 'Smartphone Galaxy S23', sold: 120, revenue: 96000, inStock: 85 },
        { id: 2, name: 'Wireless Earbuds Pro', sold: 200, revenue: 36000, inStock: 150 },
      ];

      setDashboardData({
        totalProducts: productsCount || 0,
        totalCategories: categoriesCount || 0,
        totalSuppliers: suppliersCount || 0,
        totalOrders: ordersCount || 0,
        revenue,
        lowStockItems: lowStockCount || 0,
        revenueChange,
        ordersByStatus,
        productsByCategory,
        recentAlerts,
        upcomingShipments,
        inventoryTrends,
        categoryBreakdown,
        lowStockInventory,
        topSellingProducts
      });

      setLastRefreshed(new Date());
      toast.success('Dashboard data updated');
    } catch (error) {
      setError('Failed to load dashboard data');
      toast.error('Error loading dashboard data');
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getTrendDirection = (trend: string | null) => {
    if (!trend) return 'neutral';
    if (trend.startsWith('+')) return 'positive';
    if (trend.startsWith('-')) return 'negative';
    return 'neutral';
  };

  const chartColors = useMemo(() => ({
    products: '#8b5cf6', // Indigo
    revenue: '#22d3ee', // Cyan
    orders: '#f97316', // Orange
    low: '#f43f5e' // Rose
  }), []);

  const formattedLastRefreshed = useMemo(() => {
    return lastRefreshed.toLocaleTimeString();
  }, [lastRefreshed]);

  if (isLoading) {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin">
            <RefreshCw className="h-12 w-12 mx-auto text-indigo-500 mb-4" />
          </div>
          <p className="text-slate-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 min-h-screen flex items-center justify-center">
        <div className="bg-rose-900/20 p-6 rounded-lg flex items-center">
          <AlertTriangle className="h-8 w-8 text-rose-500 mr-4" />
          <div>
            <p className="text-rose-300 font-medium mb-2">{error}</p>
            <button
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md text-white text-sm transition-colors"
              onClick={fetchDashboardData}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-indigo-400">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 min-h-screen text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header with Navigation */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-slate-400 mt-1">
              Last updated: {formattedLastRefreshed} 
              <button 
                onClick={fetchDashboardData}
                className="ml-3 text-indigo-400 hover:text-indigo-300 inline-flex items-center"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </p>
          </div>
          
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <input 
                type="text" 
                placeholder="Search inventory..." 
                className="bg-slate-800 border border-slate-700 rounded-lg py-2 pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-200"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
            <button className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
              <Filter className="h-5 w-5 text-slate-400" />
            </button>
            <button className="bg-slate-800 p-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors">
              <Settings className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>
        
        {/* Section Navigation */}
        <div className="flex overflow-x-auto mb-6 bg-slate-800 p-1 rounded-lg border border-slate-700 no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart2 },
            { id: 'inventory', label: 'Inventory', icon: Archive },
            { id: 'orders', label: 'Orders', icon: ShoppingCart }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center px-4 py-2 rounded-md mr-2 transition-colors ${
                selectedSection === tab.id 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
              onClick={() => setSelectedSection(tab.id as 'overview' | 'inventory' | 'orders')}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Overview Section */}
        {selectedSection === 'overview' && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total Products"
                value={dashboardData.totalProducts}
                icon={Package}
                trend={null}
                trendDirection={getTrendDirection(null)}
                color="indigo"
              />
              <StatCard
                title="Total Categories"
                value={dashboardData.totalCategories}
                icon={Tags}
                trend={null}
                trendDirection={getTrendDirection(null)}
                color="emerald"
              />
              <StatCard
                title="Total Suppliers"
                value={dashboardData.totalSuppliers}
                icon={Users}
                trend={null}
                trendDirection={getTrendDirection(null)}
                color="amber"
              />
              <StatCard
                title="Total Orders"
                value={dashboardData.totalOrders}
                icon={ClipboardList}
                trend="+5.2%"
                trendDirection={getTrendDirection("+5.2%")}
                color="violet"
              />
              <StatCard
                title="Revenue"
                value={`$${dashboardData.revenue.toLocaleString()}`}
                icon={DollarSign}
                trend={`${dashboardData.revenueChange > 0 ? '+' : ''}${dashboardData.revenueChange}%`}
                trendDirection={getTrendDirection(`${dashboardData.revenueChange > 0 ? '+' : ''}${dashboardData.revenueChange}%`)}
                color="green"
              />
              <StatCard
                title="Low Stock Items"
                value={dashboardData.lowStockItems}
                icon={AlertTriangle}
                trend={null}
                trendDirection={getTrendDirection(null)}
                color="rose"
              />
            </div>
            
            {/* Charts and Info Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Inventory Trend Chart */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Inventory & Revenue Trends</h2>
                  <div className="flex">
                    {['Monthly', 'Weekly', 'Daily'].map((period) => (
                      <button
                        key={period}
                        className={`px-3 py-1 rounded-md text-xs mr-1 transition-colors duration-300 ${
                          selectedView.toLowerCase() === period.toLowerCase() 
                            ? 'bg-indigo-700 text-white' 
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                        onClick={() => setSelectedView(period.toLowerCase() as 'daily' | 'weekly' | 'monthly')}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData.inventoryTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        borderColor: '#334155',
                        color: '#fff'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="products" 
                      name="Products" 
                      stroke={chartColors.products} 
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Revenue ($)" 
                      stroke={chartColors.revenue} 
                      strokeWidth={3} 
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Category Breakdown */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h2 className="text-lg font-semibold mb-4 text-white">Category Breakdown</h2>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData.categoryBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {dashboardData.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Percentage']}
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
            </div>
            
            {/* Orders by Status and Products by Category */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Orders by Status */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Orders by Status</h2>
                  <span className="text-sm text-slate-400">Last 30 days</span>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.ordersByStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="status" 
                        stroke="#94a3b8"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="count" 
                        fill="#6366f1" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Products by Category */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Products by Category</h2>
                  <span className="text-sm text-slate-400">Inventory breakdown</span>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dashboardData.productsByCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="category" 
                        stroke="#94a3b8"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#6366f1" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Alerts and Shipments Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Alerts */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center">
                    <Clock className="h-5 w-5 text-amber-400 mr-2" />
                    Recent Alerts
                  </h2>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300">
                    View All
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {dashboardData.recentAlerts.map((alert) => (
                    <Alert key={alert.id} alert={alert} />
                  ))}
                </div>
              </div>
              
              {/* Low Stock Items */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center">
                    <AlertTriangle className="h-5 w-5 text-rose-400 mr-2" />
                    Low Stock Items
                  </h2>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300">
                    View All
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {dashboardData.lowStockInventory.map((item) => (
                    <InventoryItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Inventory Section */}
        {selectedSection === 'inventory' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Top Selling Products */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Top Selling Products</h2>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300">
                    Export Report
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                        <th className="pb-2">Product</th>
                        <th className="pb-2">Units Sold</th>
                        <th className="pb-2">Revenue</th>
                        <th className="pb-2">In Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.topSellingProducts.map((product) => (
                        <tr key={product.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-3 text-slate-200">{product.name}</td>
                          <td className="py-3 text-slate-200">{product.sold}</td>
                          <td className="py-3 text-emerald-400">${product.revenue.toLocaleString()}</td>
                          <td className="py-3 text-slate-200">{product.inStock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Category Distribution */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h2 className="text-lg font-semibold mb-4 text-white">Category Distribution</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboardData.categoryBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" />
                    <YAxis dataKey="name" type="category" stroke="#64748b" width={100} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        borderColor: '#334155',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="value" name="Percentage" radius={[0, 4, 4, 0]}>
                      {dashboardData.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Low Stock and Shipments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Stock Items */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center">
                    <AlertTriangle className="h-5 w-5 text-rose-400 mr-2" />
                    Low Stock Items
                  </h2>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300">
                    View All
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {dashboardData.lowStockInventory.map((item) => (
                    <InventoryItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
              
              {/* Upcoming Shipments */}
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white flex items-center">
                    <Truck className="h-5 w-5 text-emerald-400 mr-2" />
                    Upcoming Shipments
                  </h2>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300">
                    View All
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {dashboardData.upcomingShipments.map((shipment) => (
                    <div key={shipment.id} className="p-3 bg-slate-700/50 rounded-lg mb-2 border border-slate-600 hover:bg-slate-700 transition-all">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-slate-200">{shipment.product}</span>
                        <span className="text-slate-400 text-sm">{shipment.expectedDate}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">{shipment.supplier} • {shipment.status}</span>
                        <span className="text-slate-200">Qty: {shipment.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Orders Section */}
        {selectedSection === 'orders' && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 text-center">
            <Calendar className="h-12 w-12 mx-auto text-indigo-400 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Order Management</h2>
            <p className="text-slate-400 mb-4">Order management section is coming soon in the next update.</p>
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm transition-colors">
              View Orders Overview
            </button>
          </div>
        )}
        
        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-sm text-slate-500 text-center">
        <p>© {new Date().getFullYear()} NIMBUS. All rights reserved.</p>        </div>
      </div>
    </div>
  );
};

export default Dashboard;