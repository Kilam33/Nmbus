import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Clock, CheckCircle, XCircle, Search, Filter, Download,
  Printer, RefreshCw, ChevronDown, MoreVertical, ArrowUp,
  ArrowDown, Plus, Truck, Package, CreditCard,
  Edit2,
  Trash2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { OrdersService, Order } from '../services/orders';
import { ProductsService, Product } from '../services/products';
import { SuppliersService, Supplier } from '../services/suppliers';
import { formatCurrency, safeNumber } from '../utils/formatters';

// Enhanced Order type with relationships
type OrderWithDetails = Order & {
  customer: string;
  payment_method: string;
  shipping_method: string;
  items: number;
  itemsDetails: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    sku: string | null;
  }>;
  products: Product;
  suppliers: Supplier;
};

const orderSchema = z.object({
  supplier_id: z.string().uuid('Supplier is required'),
  product_id: z.string().uuid('Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  status: z.enum(['pending', 'delivered', 'cancelled', 'processing', 'shipped']),
  customer: z.string().min(1, 'Customer is required'),
  payment_method: z.string().min(1, 'Payment method is required'),
  shipping_method: z.string().min(1, 'Shipping method is required'),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function Orders() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithDetails[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({
    key: 'created_at',
    direction: 'descending'
  });
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    let result = [...orders];
    
    // Apply filters
    if (searchTerm) {
      result = result.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.products.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.suppliers.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }

    if (dateRange.start && dateRange.end) {
      result = result.filter(order => {
        const orderDate = new Date(order.created_at);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      const key = sortConfig.key as keyof OrderWithDetails;
      let valueA = a[key];
      let valueB = b[key];

      if (key === 'created_at') {
        valueA = new Date(valueA as string).getTime();
        valueB = new Date(valueB as string).getTime();
      }

      // Handle undefined values
      if (valueA === undefined && valueB === undefined) return 0;
      if (valueA === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (valueB === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;

      if (sortConfig.direction === 'ascending') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });

    setFilteredOrders(result);
  }, [orders, searchTerm, statusFilter, dateRange, sortConfig]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const response = await OrdersService.getOrders();
      
      if (!response.success) {
        console.error('Error fetching orders');
        return;
      }

      const enhancedOrders = await Promise.all((response.data || []).map(async (order) => {
        const productResponse = await ProductsService.getProduct(order.product_id);
        const supplierResponse = await SuppliersService.getSupplier(order.supplier_id);
        
        const product = productResponse.success ? productResponse.data : null;
        const supplier = supplierResponse.success ? supplierResponse.data : null;
        
        return {
          ...order,
          order_number: `ORD-${order.id.substring(0, 8).toUpperCase()}`,
          items: order.quantity,
          total: (product?.price || 0) * order.quantity,
          itemsDetails: [{
            id: order.product_id,
            name: product?.name || 'Unknown Product',
            quantity: order.quantity,
            price: product?.price || 0,
            sku: product?.sku || null
          }],
          customer: 'Customer Name', // Default value since Order interface doesn't have this
          payment_method: 'Credit Card', // Default value
          shipping_method: 'Standard', // Default value
          products: product || {} as Product,
          suppliers: supplier || {} as Supplier
        } as OrderWithDetails;
      }));

      setOrders(enhancedOrders);
      setFilteredOrders(enhancedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
      setLastRefreshed(new Date());
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await ProductsService.getProducts();
      if (response.success) {
        setProducts(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await SuppliersService.getSuppliers();
      if (response.success) {
        setSuppliers(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const onSubmit = async (data: OrderFormData) => {
    try {
      if (editingOrder) {
        await OrdersService.updateOrder({ id: editingOrder.id, ...data });
      } else {
        await OrdersService.createOrder({
          supplier_id: data.supplier_id,
          product_id: data.product_id,
          quantity: data.quantity
        });
      }
      await fetchOrders();
      reset();
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const handleEdit = (order: OrderWithDetails) => {
    setEditingOrder(order);
    setValue('product_id', order.product_id);
    setValue('supplier_id', order.supplier_id);
    setValue('quantity', order.quantity);
    setValue('status', order.status);
    setValue('customer', order.customer);
    setValue('payment_method', order.payment_method);
    setValue('shipping_method', order.shipping_method);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await OrdersService.deleteOrder(id);
        await fetchOrders();
      } catch (error) {
        console.error('Error deleting order:', error);
      }
    }
  };

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'pending': return <Clock className="h-4 w-4 text-amber-400" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-rose-400" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />;
      case 'shipped': return <Truck className="h-4 w-4 text-indigo-400" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-900/30 text-emerald-400';
      case 'pending': return 'bg-amber-900/30 text-amber-400';
      case 'cancelled': return 'bg-rose-900/30 text-rose-400';
      case 'processing': return 'bg-blue-900/30 text-blue-400';
      case 'shipped': return 'bg-indigo-900/30 text-indigo-400';
      default: return 'bg-slate-900/30 text-slate-400';
    }
  };

  const refreshData = () => fetchOrders();

  const exportOrders = () => {
    // Implement CSV export logic here
    alert('Export functionality would be implemented here');
  };

  const printOrders = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM dd, yyyy h:mm a');
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div className="bg-slate-900 min-h-screen text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Order Management</h1>
            <p className="text-slate-400 mt-1">
              Last updated: {format(lastRefreshed, 'h:mm:ss a')}
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

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button 
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm flex items-center transition-colors"
              onClick={() => {
                reset();
                setEditingOrder(null);
                setIsModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </button>
            <button 
              onClick={exportOrders}
                className="p-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
                title="Export"
              >
                <Download className="h-5 w-5 text-slate-400" />
              </button>
            <button
              onClick={printOrders}
              className="p-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
              title="Print"
            >
              <Printer className="h-5 w-5 text-slate-400" />
                      </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Search</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-slate-400 mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-300"
                    onClick={() => requestSort('order_number')}
                  >
                    <div className="flex items-center">
                      Order #
                      {getSortIcon('order_number')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-300"
                    onClick={() => requestSort('created_at')}
                  >
                    <div className="flex items-center">
                      Date
                      {getSortIcon('created_at')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-300"
                    onClick={() => requestSort('customer')}
                  >
                    <div className="flex items-center">
                      Customer
                      {getSortIcon('customer')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-300"
                    onClick={() => requestSort('quantity')}
                  >
                    <div className="flex items-center">
                      Items
                      {getSortIcon('quantity')}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-300"
                    onClick={() => requestSort('total')}
                  >
                    <div className="flex items-center">
                      Total
                      {getSortIcon('total')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-slate-400">
                      <RefreshCw className="h-6 w-6 mx-auto animate-spin" />
                      <p className="mt-2">Loading orders...</p>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-slate-400">
                      No orders found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-700/50 transition-colors duration-200"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-indigo-400">{order.order_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-300">{formatDate(order.created_at)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-300">{order.customer}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(order.status)}
                            <span
                              className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}
                            >
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-300">{order.quantity} items</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-emerald-400">
                            {formatCurrency(order.total)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            className="text-indigo-400 hover:text-indigo-300 mr-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(order);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            className="text-rose-400 hover:text-rose-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(order.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedOrder.order_number}</h2>
                    <p className="text-slate-400">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                    </span>
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="p-1 rounded-full hover:bg-slate-700"
                    >
                      <XCircle className="h-5 w-5 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-400 mb-2">Customer</h3>
                    <p className="text-white">{selectedOrder.customer}</p>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-400 mb-2">Payment Method</h3>
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2 text-slate-300" />
                      <span className="text-white">{selectedOrder.payment_method}</span>
                    </div>
                  </div>
                  <div className="bg-slate-700/50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-slate-400 mb-2">Shipping Method</h3>
                    <div className="flex items-center">
                      <Truck className="h-4 w-4 mr-2 text-slate-300" />
                      <span className="text-white">{selectedOrder.shipping_method}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-medium text-white mb-3">Order Items</h3>
                  <div className="bg-slate-700/50 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-700">
                      <thead className="bg-slate-800">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Product</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">SKU</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Qty</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {selectedOrder.itemsDetails.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{item.name}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400">{item.sku || 'N/A'}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{item.quantity}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-300">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-emerald-400">
                              {formatCurrency(item.quantity * safeNumber(item.price))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="bg-slate-700/50 p-4 rounded-lg w-full md:w-1/3">
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-400">Subtotal:</span>
                      <span className="text-slate-300">{formatCurrency(selectedOrder.total)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-400">Shipping:</span>
                      <span className="text-slate-300">$0.00</span>
                    </div>
                    <div className="flex justify-between font-medium text-lg">
                      <span className="text-white">Total:</span>
                      <span className="text-emerald-400">{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Order Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {editingOrder ? 'Edit Order' : 'Add Order'}
                  </h2>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingOrder(null);
                      reset();
                    }}
                    className="p-1 rounded-full hover:bg-slate-700"
                  >
                    <XCircle className="h-5 w-5 text-slate-400" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Customer *</label>
                    <input
                      type="text"
                      {...register('customer')}
                      className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Customer name"
                    />
                    {errors.customer && (
                      <p className="mt-1 text-sm text-red-400">{errors.customer.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Product *</label>
                    <select
                      {...register('product_id')}
                      className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({formatCurrency(product.price)})
                        </option>
                      ))}
                    </select>
                    {errors.product_id && (
                      <p className="mt-1 text-sm text-red-400">{errors.product_id.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Supplier *</label>
                    <select
                      {...register('supplier_id')}
                      className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Select a supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    {errors.supplier_id && (
                      <p className="mt-1 text-sm text-red-400">{errors.supplier_id.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Quantity *</label>
                    <input
                      type="number"
                      {...register('quantity', { valueAsNumber: true })}
                      className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      min="1"
                    />
                    {errors.quantity && (
                      <p className="mt-1 text-sm text-red-400">{errors.quantity.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Payment Method *</label>
                    <input
                      type="text"
                      {...register('payment_method')}
                      className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. Credit Card"
                    />
                    {errors.payment_method && (
                      <p className="mt-1 text-sm text-red-400">{errors.payment_method.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Shipping Method *</label>
                    <input
                      type="text"
                      {...register('shipping_method')}
                      className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g. Express"
                    />
                    {errors.shipping_method && (
                      <p className="mt-1 text-sm text-red-400">{errors.shipping_method.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Status *</label>
                    <select
                      {...register('status')}
                      className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    {errors.status && (
                      <p className="mt-1 text-sm text-red-400">{errors.status.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingOrder(null);
                        reset();
                      }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white transition-colors"
                    >
                      {editingOrder ? 'Save Changes' : 'Create Order'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800 text-sm text-slate-500 text-center">
          <p>© {new Date().getFullYear()} NIMBUS. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}