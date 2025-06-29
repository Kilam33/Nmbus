import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Plus, Search, Edit2, Trash2, Filter, 
  RefreshCw, Download, Printer, Package, 
  ArrowUp, ArrowDown, AlertTriangle
} from 'lucide-react';
import { ProductsService, Product, Category, Supplier } from '../services/products';
import { apiClient } from '../lib/api';
import { formatCurrency } from '../utils/formatters';

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be positive'),
  quantity: z.number().min(0, 'Quantity must be positive'),
  category_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  low_stock_threshold: z.number().min(0).default(10).optional(),
  sku: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSuppliers();
  }, [sortConfig]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ProductsService.getProducts();
      
      if (!response.success) throw new Error('Error fetching products');
      
      const processedProducts = response.data?.map(product => ({
        ...product,
        low_stock_threshold: Number(product.low_stock_threshold) || 10,
        last_updated: product.updated_at || new Date().toISOString()
      })) || [];
      
      setProducts(processedProducts);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get<Category[]>('/categories');
      if (response.success) setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient.get<Supplier[]>('/suppliers');
      if (response.success) setSuppliers(response.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (editingProduct) {
        await ProductsService.updateProduct({ id: editingProduct.id, ...data });
      } else {
        await ProductsService.createProduct(data);
      }
      await fetchProducts();
      reset();
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    Object.keys(product).forEach((key) => {
      const value = product[key as keyof Product];
      if (key === 'sku') {
        setValue('sku', value as string);
      } else if (typeof value === 'string' || typeof value === 'number') {
        setValue(key as keyof ProductFormData, value);
      }
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      try {
        await ProductsService.deleteProduct(id);
        await fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  // Handle sorting
  const handleSort = (column: keyof Product) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === column) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }
    setSortConfig({ key: column, direction });
  };

  // Get sort icon for column
  const getSortIcon = (column: keyof Product) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-3 w-3 ml-1" /> : 
      <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Filter and sort products based on search, category, low stock, and sort config
  const filteredProducts = products
    .filter(product => {
      const matchesSearch = searchTerm === '' || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = categoryFilter === '' || product.category_id === categoryFilter;
      
      const matchesLowStock = !showLowStockOnly || 
        (product.quantity <= (product.low_stock_threshold || 10));
      
      return matchesSearch && matchesCategory && matchesLowStock;
    })
    .sort((a, b) => {
      const { key, direction } = sortConfig;
      
      // Handle different data types appropriately
      const aValue = a[key];
      const bValue = b[key];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
      
      const aDate = aValue as unknown as Date;
      const bDate = bValue as unknown as Date;
      if (aDate?.getTime && bDate?.getTime) {
        return direction === 'asc'
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }
      
      // Fallback for other types or null/undefined values
      return 0;
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Mock export function
  const exportProducts = () => {
    alert('Export functionality would generate a CSV or PDF report');
  };

  return (
    <div className="bg-slate-900 min-h-screen text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Product Inventory</h1>
            <p className="text-slate-400 mt-1">
              Last updated: {new Date(lastRefreshed).toLocaleTimeString()} 
              <button 
                onClick={fetchProducts}
                disabled={loading}
                className={`ml-3 ${loading ? 'text-slate-500' : 'text-indigo-400 hover:text-indigo-300'} inline-flex items-center`}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> 
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </p>
          </div>
          
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button 
              onClick={() => {
                reset();
                setEditingProduct(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm flex items-center transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </button>
            <button 
              onClick={() => exportProducts()}
              className="p-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
              title="Export"
            >
              <Download className="h-5 w-5 text-slate-400" />
            </button>
            <button 
              onClick={() => window.print()}
              className="p-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
              title="Print"
            >
              <Printer className="h-5 w-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Search</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Low Stock Toggle */}
            <div className="flex items-end">
              <label className="inline-flex items-center mt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLowStockOnly}
                  onChange={() => setShowLowStockOnly(!showLowStockOnly)}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                <span className="ml-3 text-sm text-slate-300">Show Low Stock Only</span>
              </label>
            </div>

            {/* Sort Dropdown */}
            <div>
              <label className="block text-sm text-slate-400 mb-1">Sort By</label>
              <select
                value={sortConfig.key}
                onChange={(e) => handleSort(e.target.value as keyof Product)}
                className="w-full py-2 px-3 bg-slate-700 border border-slate-600 rounded-md text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="quantity">Quantity</option>
                <option value="created_at">Created Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-300"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Product
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    SKU
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-300"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center">
                      Stock
                      {getSortIcon('quantity')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-300"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center">
                      Price
                      {getSortIcon('price')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-slate-400">
                      <RefreshCw className="h-6 w-6 mx-auto animate-spin" />
                      <p className="mt-2">Loading products...</p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-rose-400">
                      <AlertTriangle className="h-6 w-6 mx-auto" />
                      <p className="mt-2">{error}</p>
                    </td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-slate-400">
                      No products found matching your criteria
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-slate-700 rounded-md flex items-center justify-center">
                            <Package className="h-5 w-5 text-indigo-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{product.name}</div>
                            <div className="text-sm text-slate-400 line-clamp-1">{product.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{product.sku || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 mr-3">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Stock</span>
                              <span>{product.quantity}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  product.quantity <= (product.low_stock_threshold || 10) ? 'bg-rose-500' : 
                                  product.quantity <= (product.low_stock_threshold || 10) * 2 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{
                                  width: `${Math.min(
                                    (product.quantity / ((product.low_stock_threshold || 10) * 3)) * 100, 
                                    100
                                  )}%`
                                }}
                              ></div>
                            </div>
                          </div>
                          {product.quantity <= (product.low_stock_threshold || 10) && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-rose-900/30 text-rose-400">
                              Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-emerald-400">
                          {formatCurrency(product.price)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{product.categories?.name || 'Uncategorized'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{product.suppliers?.name || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button 
                            onClick={() => handleEdit(product)}
                            className="text-indigo-400 hover:text-indigo-300 p-1"
                            title="Edit"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {!loading && !error && filteredProducts.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-t border-slate-700">
              <div className="flex items-center">
                <span className="text-sm text-slate-400">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-md bg-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-md bg-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full border border-slate-700 shadow-xl">
              <h2 className="text-xl font-bold mb-6 text-white">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className="mt-1 block w-full rounded-md bg-slate-700 border-slate-600 text-white shadow-s focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-rose-400">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    className="mt-1 block w-full rounded-md bg-slate-700 border-slate-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('price', { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md bg-slate-700 border-slate-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    {errors.price && (
                      <p className="mt-1 text-sm text-rose-400">{errors.price.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      {...register('quantity', { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md bg-slate-700 border-slate-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    {errors.quantity && (
                      <p className="mt-1 text-sm text-rose-400">{errors.quantity.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    {...register('sku')}
                    className="mt-1 block w-full rounded-md bg-slate-700 border-slate-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    {...register('low_stock_threshold', { valueAsNumber: true })}
                    defaultValue={10}
                    className="mt-1 block w-full rounded-md bg-slate-700 border-slate-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    {...register('category_id')}
                    className="mt-1 block w-full rounded-md bg-slate-700 border-slate-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && (
                    <p className="mt-1 text-sm text-rose-400">{errors.category_id.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Supplier
                  </label>
                  <select
                    {...register('supplier_id')}
                    className="mt-1 block w-full rounded-md bg-slate-700 border-slate-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  {errors.supplier_id && (
                    <p className="mt-1 text-sm text-rose-400">{errors.supplier_id.message}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingProduct(null);
                      reset();
                    }}
                    className="px-4 py-2 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {editingProduct ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
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