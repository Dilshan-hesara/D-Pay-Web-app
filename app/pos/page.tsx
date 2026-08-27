'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Search, Barcode, Trash2, CreditCard, Banknote, Minus, Plus,
  Package, Loader2, ShoppingCart, User, Phone, ChevronUp, ChevronDown,
} from 'lucide-react';
import { inventoryApi, orderApi, userApi, customerApi } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stockQty: number;
  imageUrl?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function POSTerminal() {
  // ── Inventory / Clerk state ────────────────────────────────────────────────
  const [products, setProducts]       = useState<Product[]>([]);
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [search, setSearch]           = useState('');
  const [activeCategory, setActiveCategory] = useState('All Items');

  // Clerk / system user — the first user from the DB serves as the order owner.
  const [clerkId, setClerkId] = useState<string | null>(null);

  // ── Customer fields (Req 1) ────────────────────────────────────────────────
  const [customerName,  setCustomerName]  = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // ── Dynamic tax rate (Req 3) ───────────────────────────────────────────────
  // Stored as an integer percentage (e.g. 15 = 15%). Min: 0.
  const [taxRate, setTaxRate] = useState(15);

  // ── Derived totals (recalculate whenever cart or taxRate changes) ──────────
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total     = subtotal + taxAmount;

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [prods, users] = await Promise.all([
          inventoryApi.getAll(),
          userApi.getAll(),
        ]);
        setProducts(prods);
        if (users?.length > 0) setClerkId(users[0].id);
      } catch {
        toast.error('Failed to load POS data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    if (product.stockQty <= 0) {
      toast.error('Product is out of stock!');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQty) {
          toast.error(`Cannot add more than available stock (${product.stockQty})`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== id) return item;
        const newQ = item.quantity + delta;
        if (newQ > item.product.stockQty) {
          toast.error('Cannot exceed available stock');
          return item;
        }
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }),
    );
  };

  const remove = (id: string) =>
    setCart((prev) => prev.filter((item) => item.product.id !== id));

  // ── Tax scroll handler (Req 3) ─────────────────────────────────────────────
  const handleTaxWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      setTaxRate((prev) => {
        const next = e.deltaY < 0 ? prev + 1 : prev - 1;
        return Math.max(0, next); // clamp to 0%
      });
    },
    [],
  );

  // ── Checkout (Req 2, 4) ────────────────────────────────────────────────────
  const handleCheckout = async (paymentMethod: 'Cash' | 'Card') => {
    if (cart.length === 0) return toast.error('Cart is empty!');
    if (!clerkId) return toast.error('No clerk user found in database to process order');

    setSubmitting(true);
    try {
      // ── Req 2: Auto-save named customer to User Service ──────────────────
      const resolvedName  = customerName.trim()  || 'Walk-in Customer';
      const resolvedPhone = customerPhone.trim() || '';

      if (customerName.trim() && customerPhone.trim()) {
        // Fire-and-forget — a failure here must NOT block the checkout.
        customerApi
          .createWalkIn(customerName.trim(), customerPhone.trim())
          .then(() => toast.info(`Customer "${resolvedName}" saved to database.`))
          .catch((err) => {
            // Log but don't throw — the order should still go through.
            console.warn('[POS] Customer auto-save failed (non-blocking):', err?.response?.data || err);
          });
      }

      // ── Req 4: Build and POST complete Order Payload ─────────────────────
      const orderPayload = {
        userId:         clerkId,
        discountAmount: 0,
        taxAmount:      parseFloat(taxAmount.toFixed(2)),
        notes:          [
          `Paid via ${paymentMethod}`,
          `Customer: ${resolvedName}`,
          resolvedPhone ? `Phone: ${resolvedPhone}` : null,
        ]
          .filter(Boolean)
          .join(' | '),
        items: cart.map((c) => ({
          productId:   c.product.id,
          productName: c.product.name,
          sku:         c.product.sku,
          qty:         c.quantity,
          unitPrice:   parseFloat(c.product.price.toFixed(2)),
        })),
      };

      await orderApi.create(orderPayload);
      toast.success(`Order processed — ${resolvedName}`);

      // Update local stock so repeat attempts are blocked immediately.
      setProducts((prev) =>
        prev.map((p) => {
          const inCart = cart.find((c) => c.product.id === p.id);
          return inCart ? { ...p, stockQty: p.stockQty - inCart.quantity } : p;
        }),
      );

      // Reset cart and customer fields.
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to process order');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtered product list ──────────────────────────────────────────────────
  const categories = ['All Items', ...Array.from(new Set(products.map((p) => p.category)))];

  const displayProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = activeCategory === 'All Items' || p.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)]">

      {/* ── Product Grid (Left) ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">

        {/* Search + Barcode row */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-indigo-400" />
            <input
              id="pos-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, SKU..."
              className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3.5 text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner text-lg"
            />
          </div>
          <button className="h-[52px] px-6 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors flex items-center justify-center text-slate-300">
            <Barcode className="w-6 h-6" />
          </button>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 pb-2 overflow-x-auto custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                  : 'bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-4 px-1">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
              <p>Loading inventory...</p>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="col-span-full text-center py-20 text-slate-500">
              No products available in this category.
            </div>
          ) : (
            displayProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stockQty <= 0}
                className="glass-panel p-4 flex flex-col text-left group hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all cursor-pointer relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-full aspect-square rounded-lg mb-4 flex items-center justify-center bg-slate-800 border border-slate-700 overflow-hidden">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <Package className="w-10 h-10 text-slate-500 opacity-80 group-hover:scale-110 transition-transform duration-500" />
                  )}
                </div>
                <h4 className="font-semibold text-slate-200 text-sm line-clamp-2 leading-tight mb-1">
                  {p.name}
                </h4>
                <div className="mt-auto flex items-end justify-between pt-2 gap-2">
                  <span className="font-bold text-emerald-400 text-sm truncate">
                    LKR {p.price.toLocaleString()}
                  </span>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded flex-shrink-0 ${
                      p.stockQty > 0
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {p.stockQty > 0 ? `Qty: ${p.stockQty}` : 'Out'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Cart Panel (Right) ────────────────────────────────────────────── */}
      <div className="w-full lg:w-[420px] flex-shrink-0 flex flex-col glass-panel overflow-hidden glow-effect">

        {/* Header */}
        <div className="p-5 border-b border-border/50 bg-slate-900/30 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-400" />
            Current Order
          </h2>
          <span className="text-sm font-medium text-slate-400">{cart.length} items</span>
        </div>

        {/* ── Req 1: Customer fields ──────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-2 border-b border-slate-800/60 space-y-2.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Customer Info
          </p>

          {/* Customer Name */}
          <div className="relative group">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              id="pos-customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name (optional)"
              className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          {/* Phone Number */}
          <div className="relative group">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              id="pos-customer-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone Number (optional)"
              className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          {/* Walk-in hint */}
          <p className="text-xs text-slate-600 italic">
            Leave blank to checkout as &ldquo;Walk-in Customer&rdquo;
          </p>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
              <ShoppingCart className="w-16 h-16 opacity-20" />
              <p className="text-sm font-medium tracking-wide">Cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex gap-4 p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-slate-200 truncate">
                    {item.product.name}
                  </h4>
                  <p className="text-emerald-400 text-sm font-medium mt-1">
                    LKR {(item.product.price * item.quantity).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-slate-950 rounded-lg border border-slate-700/50">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-mono text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(item.product.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Totals + Checkout ─────────────────────────────────────────── */}
        <div className="p-5 border-t border-border/50 bg-slate-900/80 mt-auto">
          <div className="space-y-3 mb-6">

            {/* Subtotal */}
            <div className="flex justify-between text-slate-400 text-sm">
              <span>Subtotal</span>
              <span className="text-slate-200 font-mono">LKR {subtotal.toLocaleString()}</span>
            </div>

            {/* ── Req 3: Tax row — scroll to adjust ──────────────────────── */}
            <div
              id="pos-tax-row"
              onWheel={handleTaxWheel}
              title="Scroll up/down to adjust tax rate"
              className="flex justify-between items-center text-slate-400 text-sm select-none cursor-ns-resize group"
              style={{ touchAction: 'none' }}
            >
              <div className="flex items-center gap-1.5">
                <span>Tax</span>
                {/* Visual nudge arrows */}
                <div className="flex flex-col opacity-0 group-hover:opacity-60 transition-opacity">
                  <ChevronUp   className="w-3 h-3 -mb-1 text-indigo-400" />
                  <ChevronDown className="w-3 h-3 text-indigo-400" />
                </div>
                {/* Editable badge */}
                <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-mono bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 tabular-nums">
                  {taxRate}%
                </span>
              </div>
              <span className="text-slate-200 font-mono tabular-nums">
                LKR {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="w-full h-px bg-slate-800 my-2" />

            {/* Total */}
            <div className="flex justify-between items-end">
              <span className="text-slate-300 font-medium pb-1">Total</span>
              <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                LKR {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* ── Payment buttons ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="pos-pay-cash"
              disabled={submitting || cart.length === 0}
              onClick={() => handleCheckout('Cash')}
              className="h-14 rounded-xl flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              <Banknote className="w-5 h-5" />
              Cash
            </button>
            <button
              id="pos-pay-card"
              disabled={submitting || cart.length === 0}
              onClick={() => handleCheckout('Card')}
              className="h-14 rounded-xl flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)] disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5" />
              )}
              {submitting ? 'Processing…' : 'Card'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
