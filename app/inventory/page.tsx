'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Search, Plus, MoreHorizontal, Edit, Trash2, ImageIcon, Loader2
} from 'lucide-react';
import { inventoryApi } from '@/lib/api';

// Derived from ProductResponseDTO
interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stockQty: number;
  imageUrl: string;
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    sku: '', name: '', description: '', category: '', price: '', stockQty: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await inventoryApi.getAll();
      setProducts(data);
    } catch (err) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openForm = (prod?: Product) => {
    if (prod) {
      setFormData({
        sku: prod.sku, name: prod.name, description: prod.description || '',
        category: prod.category, price: prod.price.toString(), stockQty: prod.stockQty.toString()
      });
      setEditProduct(prod);
    } else {
      setFormData({ sku: '', name: '', description: '', category: '', price: '', stockQty: '' });
      setEditProduct(null);
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const closeForm = () => {
    setIsModalOpen(false);
    setEditProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = new FormData();

      // For new products: append a timestamp suffix to SKU to prevent
      // duplicate key errors against the MongoDB @Indexed(unique = true) constraint.
      // For existing products: keep the original SKU so it matches the stored record.
      const skuValue = editProduct
        ? formData.sku
        : `${formData.sku}-${Date.now()}`;

      data.append('sku', skuValue);
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('price', formData.price);
      data.append('stockQty', formData.stockQty);
      if (imageFile) data.append('image', imageFile);

      if (editProduct) {
        await inventoryApi.update(editProduct.id, data);
        toast.success('Product updated successfully');
      } else {
        await inventoryApi.create(data);
        toast.success('Product added successfully');
      }
      closeForm();
      fetchProducts();
    } catch (err) {
      toast.error(editProduct ? 'Failed to update product' : 'Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await inventoryApi.delete(id);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Inventory Management</h2>
          <p className="text-slate-400">Manage your product catalog.</p>
        </div>
        <button 
          onClick={() => openForm()}
          className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Table Container */}
      <div className="glass-panel overflow-hidden glow-effect flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-border/50 bg-slate-900/30 flex flex-col sm:flex-row gap-4 justify-between items-center z-10 relative">
          <div className="relative w-full sm:max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-indigo-400" />
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar flex-1 relative z-10">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800 text-xs font-semibold uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4 w-16">Image</th>
                <th className="px-6 py-4">Product Info</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading inventory...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No products found. Add your first product to get started!
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-200">{item.name}</p>
                    </td>
                    <td className="px-6 py-4"><span className="font-mono text-sm text-slate-300">{item.sku}</span></td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-200">LKR {item.price.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-200">{item.stockQty}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 ${
                          item.stockQty > 10 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          item.stockQty === 0 ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {item.stockQty > 10 ? 'In Stock' : item.stockQty === 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openForm(item)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item.id, item.name)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">{editProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={closeForm} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">SKU Code *</label>
                  <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. PRD-001" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Category *</label>
                  <input required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. Electronics" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-400">Product Name *</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Premium Product Name" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-400">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" rows={2} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Price (LKR) *</label>
                  <input type="number" required min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Stock Quantity *</label>
                  <input type="number" required min="0" value={formData.stockQty} onChange={e => setFormData({...formData, stockQty: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="0" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-400">Product Image (Optional)</label>
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700" />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-6">
                <button type="button" onClick={closeForm} className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-sm font-medium text-slate-300">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white shadow-lg flex items-center">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
