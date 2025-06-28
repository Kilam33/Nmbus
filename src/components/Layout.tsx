import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';  // Import the Navbar component
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  ClipboardList,
  FolderTree,
  ShoppingCart,
  Settings,
  LogOut,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Search,
  Bell,
  BarChart3,
  Truck,
  TrendingUp,
  Activity,
  FileText,
  Zap
} from 'lucide-react';

export default function Layout() {
  const { user, signOut } = useAuth();  // Added user to access in the component
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    products: true,
    orders: false,
    analytics: false,
    inventory: false
  });
  const [lowStockCount, setLowStockCount] = useState(4);
  const [pendingOrders, setPendingOrders] = useState(2);
  const [expiringItems, setExpiringItems] = useState(3);
  const [reorderSuggestions, setReorderSuggestions] = useState(5);

  // Simulate fetching real-time alerts
  useEffect(() => {
    // This would be replaced with actual API calls
    const fetchAlerts = () => {
      // Simulating dynamic data updates
      const interval = setInterval(() => {
        setLowStockCount(Math.floor(Math.random() * 5) + 1);
        setPendingOrders(Math.floor(Math.random() * 3) + 1);
        setExpiringItems(Math.floor(Math.random() * 4) + 1);
        setReorderSuggestions(Math.floor(Math.random() * 6) + 1);
      }, 30000);

      return () => clearInterval(interval);
    };

    fetchAlerts();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  interface NavItem {
    to: string;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number | string;
    badgeColor?: string;
    children?: NavItem[];
  }

  const navItems: NavItem[] = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      to: '#',
      label: 'Inventory',
      icon: Package,
      children: [
        { to: '/products', label: 'All Products', icon: Package },
        { to: '/categories', label: 'Categories', icon: Tags },
        { to: '/low-stock', label: 'Low Stock Alerts', icon: AlertCircle, badge: lowStockCount, badgeColor: 'bg-red-500' },
        { to: '/expiring-soon', label: 'Expiring Soon', icon: Activity, badge: expiringItems, badgeColor: 'bg-yellow-500' }
      ]
    },
    {
      to: '#',
      label: 'Orders',
      icon: ShoppingCart,
      children: [
        { to: '/orders', label: 'All Orders', icon: ClipboardList, badge: pendingOrders, badgeColor: 'bg-amber-500' },
        { to: '/suppliers', label: 'Suppliers', icon: Users },
        { to: '/orders', label: 'Purchase Orders', icon: FileText }
      ]
    },
    {
      to: '#',
      label: 'Analytics',
      icon: BarChart3,
      children: [
        { to: '/sales-report', label: 'Sales Report', icon: TrendingUp },
        { to: '/inventory-turnover', label: 'Inventory Turnover', icon: Zap },
        { to: '/analytics', label: 'Demand Forecast', icon: Activity },
        { to: '/reorder-suggestions', label: 'Reorder Suggestions', icon: Truck, badge: reorderSuggestions, badgeColor: 'bg-blue-500' }
      ]
    },
    { to: '/settings', label: 'Settings', icon: Settings }
  ];

  // Toggle expanded state for collapsible sections
  const toggleExpanded = (section: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Filter navigation items based on search
  const filteredNavItems = searchQuery.length > 0
    ? navItems.flatMap(item =>
      item.children
        ? [item, ...item.children.filter(child =>
          child.label.toLowerCase().includes(searchQuery.toLowerCase())
        )]
        : [item]
    ).filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : navItems;

  // Render a navigation item (handles both top-level and child items)
  const renderNavItem = (item: NavItem, isChild = false, level = 0) => {
    const isActive = location.pathname === item.to;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.label.toLowerCase()];
    const Icon = item.icon;

    return (
      <React.Fragment key={item.to + item.label}>
        <a
          href={item.to === '#' ? '#' : item.to}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
              toggleExpanded(item.label.toLowerCase());
            } else if (item.to !== '#') {
              e.preventDefault();
              navigate(item.to);
            }
          }}
          className={`group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg mx-2 mb-2 mt-2 transition-all duration-300 ${isActive
            ? 'bg-indigo-700/20 text-indigo-400'
            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            } ${isChild ? `pl-${level * 4 + 8}` : ''}`}
        >
          <div className="flex items-center overflow-hidden">
            <Icon
              className={`min-w-5 h-5 w-5 mr-3 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                }`}
            />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </div>

          {hasChildren && !collapsed && (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          )}

          {item.badge && !collapsed && (
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${item.badgeColor || 'bg-indigo-600'} text-white`}>
              {item.badge}
            </span>
          )}
        </a>

        {hasChildren && isExpanded && !collapsed && (
          <div className="mb-2">
            {item.children!.map(child => renderNavItem(child, true, level + 1))}
          </div>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Navbar on top */}
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className="relative bg-slate-900 text-white flex flex-col h-full transition-all duration-600" 
          style={{ width: collapsed ? '80px' : '256px' }}
        >
          {/* Company branding */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800 flex-shrink-0">
            {!collapsed && (
              <h1 className="text-xl font-bold text-white truncate">Menu</h1>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {/* Search bar */}
          {!collapsed && (
            <div className="px-4 py-3 flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Navigation - with fixed height and overflow */}
          <nav className="overflow-y-auto px-1 flex-1" style={{ maxHeight: 'calc(100vh - 170px)' }}>
            {filteredNavItems.map(item => renderNavItem(item))}
          </nav>

          {/* Footer with quick actions - fixed at bottom */}
          <div className="w-full p-4 flex-shrink-0 border-t border-slate-700 mt-auto">
            <div className="flex items-center justify-between">
              {!collapsed ? (
                <>
                  <button className="flex items-center rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                    <Bell size={20} />
                    <span className="ml-2">Alerts</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <LogOut size={20} />
                    <span className="ml-2">Logout</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSignOut}
                  className="w-full flex justify-center rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <LogOut size={20} />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-2 bg-slate-800 ">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}