import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Edit, Trash, Search, Filter, Download, Printer,
  RefreshCw, ChevronDown, ArrowUp, ArrowDown, CheckCircle,
  XCircle, Clock, Star, User, Truck, Package, MapPin,
  PhoneCall, Mail, Archive
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { SuppliersService, Supplier } from '../services/suppliers';
import { apiClient } from '../lib/api';
import { safeToFixed } from '../utils/formatters';

const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  contact_person: z.string().min(1, 'Contact person is required'),
  avg_lead_time: z.number().min(1, 'Lead time must be at least 1 day'),
});

type SupplierFormData = z.infer<typeof supplierSchema>;
type SupplierWithExtras = Supplier & {
  productsSupplied: number;
  code: string;
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<SupplierWithExtras[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<SupplierWithExtras[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reliabilityFilter, setReliabilityFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' }>({
    key: 'name',
    direction: 'ascending'
  });
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithExtras | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithExtras | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    let result = [...suppliers];
    
    if (searchTerm) {
      result = result.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.contact_person && supplier.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(supplier => supplier.status === statusFilter);
    }

    if (reliabilityFilter !== 'all') {
      switch (reliabilityFilter) {
        case 'high':
          result = result.filter(supplier => supplier.reliability_score >= 4.5);
          break;
        case 'medium':
          result = result.filter(supplier => supplier.reliability_score >= 3.5 && supplier.reliability_score < 4.5);
          break;
        case 'low':
          result = result.filter(supplier => supplier.reliability_score < 3.5);
          break;
      }
    }

    setFilteredSuppliers(result);
  }, [suppliers, searchTerm, statusFilter, reliabilityFilter, sortConfig]);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const response = await SuppliersService.getSuppliers();
      
      if (!response.success) {
        console.error('Error fetching suppliers');
        setIsLoading(false);
        return;
      }

      const enhancedSuppliers = (response.data || []).map(supplier => ({
        ...supplier,
        productsSupplied: 0,
        code: `SUP-${supplier.id.toString().padStart(4, '0')}`
      }));

      setSuppliers(enhancedSuppliers);
      setFilteredSuppliers(enhancedSuppliers);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SupplierFormData) => {
    try {
      if (editingSupplier) {
        await SuppliersService.updateSupplier({ id: editingSupplier.id, ...data });
      } else {
        await SuppliersService.createSupplier(data);
      }
      await fetchSuppliers();
      reset();
      setIsModalOpen(false);
      setEditingSupplier(null);
    } catch (error) {
      console.error('Error saving supplier:', error);
    }
  };

  const handleEdit = (supplier: SupplierWithExtras) => {
    setEditingSupplier(supplier);
    Object.keys(supplier).forEach((key) => {
      const value = supplier[key as keyof SupplierWithExtras];
      if (value !== null && value !== undefined && (typeof value === 'string' || typeof value === 'number')) {
        setValue(key as keyof SupplierFormData, value);
      }
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await SuppliersService.deleteSupplier(id);
        await fetchSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
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
      case 'active': return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-rose-400" />;
      case 'on-hold': return <Clock className="h-4 w-4 text-amber-400" />;
      case 'new': return <Star className="h-4 w-4 text-indigo-400" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-900/30 text-emerald-400';
      case 'inactive': return 'bg-rose-900/30 text-rose-400';
      case 'on-hold': return 'bg-amber-900/30 text-amber-400';
      case 'new': return 'bg-indigo-900/30 text-indigo-400';
      default: return 'bg-slate-900/30 text-slate-400';
    }
  };

  const getReliabilityColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-400';
    if (score >= 3.5) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getLeadTimeIndicator = (days: number) => {
    if (days <= 3) return 'bg-emerald-400';
    if (days <= 7) return 'bg-amber-400';
    return 'bg-rose-400';
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const getDaysSinceLastOrder = (dateString: string) => {
    const lastOrderDate = parseISO(dateString);
    return differenceInDays(new Date(), lastOrderDate);
  };

  const refreshData = () => {
    fetchSuppliers();
  };

  const exportSuppliers = () => {
    alert('Export functionality would be implemented here');
  };

  const printSuppliers = () => {
    alert('Print functionality would be implemented here');
  };

  return (
    <div className="bg-slate-900 min-h-screen text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Supplier Management</h1>
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
                setEditingSupplier(null);
                setIsModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Supplier
            </button>
            <button
              onClick={exportSuppliers}
              className="p-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
              title="Export"
            >
              <Download className="h-5 w-5 text-slate-400" />
            </button>
            <button
              onClick={printSuppliers}
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
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Status</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-slate-400" />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on-hold">On Hold</option>
                  <option value="new">New</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Reliability Filter */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Reliability</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Star className="h-4 w-4 text-slate-400" />
                </div>
                <select
                  value={reliabilityFilter}
                  onChange={(e) => setReliabilityFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">All Ratings</option>
                  <option value="high">High (4.5+)</option>
                  <option value="medium">Medium (3.5-4.4)</option>
                  <option value="low">Low (&lt;3.5)</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Suppliers Table */}
          <div className="xl:col-span-2">
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-800">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-400 tracking-wider">
                        <button
                          className="flex items-center font-medium text-white"
                          onClick={() => requestSort('name')}
                        >
                          Supplier
                          {getSortIcon('name')}
                        </button>
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-400 tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-400 tracking-wider">
                        <button
                          className="flex items-center font-medium text-white"
                          onClick={() => requestSort('reliability_score')}
                        >
                          Reliability
                          {getSortIcon('reliability_score')}
                        </button>
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-400 tracking-wider">
                        <button
                          className="flex items-center font-medium text-white"
                          onClick={() => requestSort('avg_lead_time')}
                        >
                          Lead Time
                          {getSortIcon('avg_lead_time')}
                        </button>
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-400 tracking-wider">
                        <button
                          className="flex items-center font-medium text-white"
                          onClick={() => requestSort('last_order_date')}
                        >
                          Last Order
                          {getSortIcon('last_order_date')}
                        </button>
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-medium text-slate-400 tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                          <div className="flex flex-col items-center">
                            <RefreshCw className="h-8 w-8 animate-spin mb-3" />
                            <p>Loading suppliers...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredSuppliers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                          <div className="flex flex-col items-center">
                            <Search className="h-8 w-8 mb-3 text-slate-500" />
                            <p>No suppliers found matching your filters.</p>
                            <button
                              onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('all');
                                setReliabilityFilter('all');
                              }}
                              className="mt-2 text-indigo-400 hover:text-indigo-300"
                            >
                              Clear filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSuppliers.map((supplier) => (
                        <tr 
                          key={supplier.id}
                          className={`hover:bg-slate-700 cursor-pointer transition-colors ${selectedSupplier?.id === supplier.id ? 'bg-slate-700' : ''}`}
                          onClick={() => setSelectedSupplier(supplier)}
                        >
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-slate-700 flex items-center justify-center">
                                {supplier.name.charAt(0)}
                              </div>
                              <div className="ml-3">
                                <p className="font-medium text-white">{supplier.name}</p>
                                <p className="text-xs text-slate-400">{supplier.code}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(supplier.status)}`}>
                              {getStatusIcon(supplier.status)}
                              <span className="ml-1 capitalize">{supplier.status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className={`font-medium ${getReliabilityColor(supplier.reliability_score)}`}>
                              {safeToFixed(supplier.reliability_score)}
                            </div>
                            <p className="text-xs text-slate-400">{supplier.on_time_delivery_rate}% On-time</p>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center">
                              <div className={`h-2 w-2 rounded-full ${getLeadTimeIndicator(supplier.avg_lead_time)} mr-2`}></div>
                              <span>{supplier.avg_lead_time} days</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div>{formatDate(supplier.last_order_date || supplier.created_at)}</div>
                            <p className="text-xs text-slate-400">
                              {getDaysSinceLastOrder(supplier.last_order_date || supplier.created_at)} days ago
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            <div className="flex justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(supplier);
                                }}
                                className="text-slate-400 hover:text-indigo-400 mr-3"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(supplier.id);
                                }}
                                className="text-slate-400 hover:text-rose-400"
                              >
                                <Trash className="h-4 w-4" />
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
          </div>

          {/* Supplier Details */}
          <div className="xl:col-span-1">
            {selectedSupplier ? (
              <div className="bg-slate-800 rounded-lg border border-slate-700 h-full">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white">{selectedSupplier.name}</h2>
                  <div className="flex">
                    <button
                      onClick={() => handleEdit(selectedSupplier)}
                      className="p-1 rounded-full hover:bg-slate-700 mr-1"
                      title="Edit Supplier"
                    >
                      <Edit className="h-4 w-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => setSelectedSupplier(null)}
                      className="p-1 rounded-full hover:bg-slate-700"
                      title="Close"
                    >
                      <XCircle className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-6">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(selectedSupplier.status)}`}>
                      {getStatusIcon(selectedSupplier.status)}
                      <span className="ml-1 capitalize">{selectedSupplier.status}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-medium text-slate-400 mb-2">Contact Information</h3>
                  <div className="mb-4 space-y-2">
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5 mr-2" />
                      <p className="text-sm text-white">{selectedSupplier.address}</p>
                    </div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-slate-400 mr-2" />
                      <p className="text-sm text-white">{selectedSupplier.email}</p>
                    </div>
                    <div className="flex items-center">
                      <PhoneCall className="h-4 w-4 text-slate-400 mr-2" />
                      <p className="text-sm text-white">{selectedSupplier.phone}</p>
                    </div>
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-slate-400 mr-2" />
                      <p className="text-sm text-white">{selectedSupplier.contact_person}</p>
                    </div>
                  </div>

                  <h3 className="text-sm font-medium text-slate-400 mb-2">Performance Metrics</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-700 rounded-md p-3">
                      <div className="text-xs text-slate-400 mb-1">Reliability Score</div>
                      <div className={`text-lg font-bold ${getReliabilityColor(selectedSupplier.reliability_score)}`}>
                        {safeToFixed(selectedSupplier.reliability_score)}
                      </div>
                    </div>
                    <div className="bg-slate-700 rounded-md p-3">
                      <div className="text-xs text-slate-400 mb-1">On-Time Delivery</div>
                      <div className="text-lg font-bold text-white">
                        {selectedSupplier.on_time_delivery_rate}%
                      </div>
                    </div>
                    <div className="bg-slate-700 rounded-md p-3">
                      <div className="text-xs text-slate-400 mb-1">Lead Time</div>
                      <div className="text-lg font-bold text-white">
                        {selectedSupplier.avg_lead_time} days
                      </div>
                    </div>
                    <div className="bg-slate-700 rounded-md p-3">
                      <div className="text-xs text-slate-400 mb-1">Products</div>
                      <div className="text-lg font-bold text-white">
                        {selectedSupplier.productsSupplied}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        alert('This would navigate to orders page filtered by this supplier');
                      }}
                      className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm flex items-center justify-center transition-colors"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      View Orders
                    </button>
                    <button
                      onClick={() => {
                        alert('This would open create order form pre-populated with this supplier');
                      }}
                      className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-white text-sm flex items-center justify-center transition-colors"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Create Order
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-lg border border-slate-700 h-full flex flex-col items-center justify-center p-6 text-center">
                <Truck className="h-12 w-12 text-slate-600 mb-3" />
                <h3 className="text-lg font-medium text-white mb-2">No Supplier Selected</h3>
                <p className="text-slate-400 mb-4">Select a supplier from the list to view detailed information and manage orders.</p>
                <button
                  onClick={() => {
                    reset();
                    setEditingSupplier(null);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm flex items-center transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Supplier
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white">
                    {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
                  </h2>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingSupplier(null);
                      reset();
                    }}
                    className="p-1 rounded-full hover:bg-slate-700"
                  >
                    <XCircle className="h-5 w-5 text-slate-400" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Supplier Name *</label>
                      <input
                        type="text"
                        {...register('name')}
                        className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter supplier name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Contact Person *</label>
                      <input
                        type="text"
                        {...register('contact_person')}
                        className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter contact person"
                      />
                      {errors.contact_person && (
                        <p className="mt-1 text-sm text-red-400">{errors.contact_person.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Email *</label>
                      <input
                        type="email"
                        {...register('email')}
                        className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter email address"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Phone *</label>
                      <input
                        type="text"
                        {...register('phone')}
                        className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter phone number"
                      />
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-400">{errors.phone.message}</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-slate-400 mb-1">Address *</label>
                      <textarea
                        {...register('address')}
                        className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter address"
                      />
                      {errors.address && (
                        <p className="mt-1 text-sm text-red-400">{errors.address.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Average Lead Time (days) *</label>
                      <input
                        type="number"
                        {...register('avg_lead_time', { valueAsNumber: true })}
                        className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Enter lead time in days"
                        min="1"
                      />
                      {errors.avg_lead_time && (
                        <p className="mt-1 text-sm text-red-400">{errors.avg_lead_time.message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingSupplier(null);
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
                      {editingSupplier ? 'Save Changes' : 'Add Supplier'}
                    </button>
                  </div>
                </form>
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
}