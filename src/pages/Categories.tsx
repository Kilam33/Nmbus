import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, X, Search, RefreshCw, Box, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';
import { toast } from 'react-hot-toast';

type Category = Database['public']['Tables']['categories']['Row'] & {
  product_count?: number;
};

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters'),
  description: z.string().max(200, 'Description must be less than 200 characters').optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statsLoading, setStatsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const filtered = categories.filter(category => 
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description && 
        category.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCategories(filtered);
  }, [categories, searchTerm]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setStatsLoading(true);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Get product counts for categories - use separate queries
      const enhancedCategories = [];
      
      for (const category of categoriesData || []) {
        const { count, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id);
          
        if (countError) throw countError;
        
        enhancedCategories.push({
          ...category,
          product_count: count || 0
        });
      }

      setCategories(enhancedCategories);
    } catch (error) {
      toast.error('Error fetching categories');
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setLoading(true);
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(data)
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        const { error } = await supabase.from('categories').insert([data]);
        if (error) throw error;
        toast.success('Category created successfully');
      }
      await fetchCategories();
      reset();
      setIsModalOpen(false);
      setEditingCategory(null);
    } catch (error) {
      toast.error('Error saving category');
      console.error('Error saving category:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setValue('name', category.name);
    setValue('description', category.description || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    // Check if category has products before deleting
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (productsError) {
      toast.error('Error checking category usage');
      console.error('Error checking category usage:', productsError);
      return;
    }

    if (products && products.length > 0) {
      toast.error('Cannot delete category with associated products');
      return;
    }

    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        setLoading(true);
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        toast.success('Category deleted successfully');
        await fetchCategories();
      } catch (error) {
        toast.error('Error deleting category');
        console.error('Error deleting category:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-slate-900 min-h-screen text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Categories</h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage your product categories ({categories.length} total)
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                reset();
                setEditingCategory(null);
                setIsModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <Plus size={18} />
              <span>Add Category</span>
            </button>
            <button
              onClick={fetchCategories}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        {!statsLoading && categories.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h3 className="text-slate-400 text-sm font-medium">Total Categories</h3>
              <p className="text-2xl font-bold mt-1">{categories.length}</p>
            </div>
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h3 className="text-slate-400 text-sm font-medium">Total Products</h3>
              <p className="text-2xl font-bold mt-1">
                {categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0)}
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h3 className="text-slate-400 text-sm font-medium">Avg Products/Category</h3>
              <p className="text-2xl font-bold mt-1">
                {categories.length > 0 
                  ? Math.round(categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0) / categories.length)
                  : 0}
              </p>
            </div>
          </div>
        )}

        {/* Search Filter */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search categories by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && filteredCategories.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin mb-2" />
              <p>Loading categories...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              {searchTerm ? (
                <>
                  <p>No categories found matching "{searchTerm}"</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-indigo-400 hover:text-indigo-300 mt-2"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <Box className="h-10 w-10 mb-2 text-slate-500" />
                  <p>No categories found</p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="text-indigo-400 hover:text-indigo-300 mt-4 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    <span>Create your first category</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-slate-800 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-colors p-4 flex flex-col h-full"
              >
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg mb-1">{category.name}</h3>
                      <p className="text-slate-400 text-sm mb-3">
                        {category.description || 'No description provided'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-indigo-400 hover:text-indigo-300 p-1"
                        disabled={loading}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        disabled={loading}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Products:</span>
                      <span className="font-medium">
                        {category.product_count || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Created:</span>
                      <span>{formatDate(category.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700">
                  <button
                    className="w-full flex items-center justify-between text-indigo-400 hover:text-indigo-300 text-sm"
                    onClick={() => {
                      // In a real app, this would navigate to products filtered by this category
                      toast(`Would show products in ${category.name} category`, {
                        icon: 'ℹ️',
                      });
                    }}
                  >
                    <span>View products</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-lg border border-slate-700 shadow-xl w-full max-w-md relative">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCategory(null);
                  reset();
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700/50"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="p-6">
                <h2 className="text-xl font-bold mb-6">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h2>
                
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      {...register('name')}
                      className={`w-full px-4 py-2 bg-slate-700 border ${
                        errors.name ? 'border-rose-500' : 'border-slate-600'
                      } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      disabled={loading}
                      placeholder="e.g., Electronics, Clothing"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-rose-400">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      {...register('description')}
                      className={`w-full px-4 py-2 bg-slate-700 border ${
                        errors.description ? 'border-rose-500' : 'border-slate-600'
                      } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      rows={3}
                      disabled={loading}
                      placeholder="Brief description of this category..."
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-rose-400">{errors.description.message}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Max 200 characters</p>
                  </div>

                  {editingCategory && (
                    <div className="text-sm text-slate-400 p-3 bg-slate-700/50 rounded-md">
                      <p>Created: {formatDate(editingCategory.created_at)}</p>
                      <p className="mt-1">Products: {editingCategory.product_count || 0}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingCategory(null);
                        reset();
                      }}
                      className="px-4 py-2 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 min-w-[100px] flex items-center justify-center"
                      disabled={loading}
                    >
                      {loading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : editingCategory ? (
                        'Update Category'
                      ) : (
                        'Create Category'
                      )}
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