'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList, Search, Loader2, Package, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, RefreshCw, Phone, User,
} from 'lucide-react';
import { orderApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  unitPrice: number;
}

interface Order {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  notes?: string;
  createdAt?: string;
  items: OrderItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCustomerFromNotes(notes?: string): string {
  if (!notes) return 'Walk-in Customer';
  const seg = notes.split('|').find((s) => s.trim().startsWith('Customer:'));
  if (!seg) return 'Walk-in Customer';
  return seg.replace('Customer:', '').trim() || 'Walk-in Customer';
}

function parsePhoneFromNotes(notes?: string): string {
  if (!notes) return '—';
  const seg = notes.split('|').find((s) => s.trim().startsWith('Phone:'));
  if (!seg) return '—';
  return seg.replace('Phone:', '').trim() || '—';
}

function getProductLabel(items: OrderItem[]): string {
  if (!items || items.length === 0) return 'Unknown Product';
  const first = items[0]?.productName || 'Unknown';
  return items.length === 1 ? first : `${first} +${items.length - 1} more`;
}

/** Total units purchased across all line items in the order. */
function getTotalQty(items: OrderItem[]): number {
  if (!items || items.length === 0) return 0;
  return items.reduce((sum, item) => sum + (item.qty || 0), 0);
}

function shortId(id: string) {
  return id ? `#${id.substring(0, 8).toUpperCase()}` : '—';
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
    COMPLETED:  { label: 'Completed',  cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', Icon: CheckCircle2 },
    CONFIRMED:  { label: 'Confirmed',  cls: 'bg-indigo-500/10  text-indigo-400  border-indigo-500/20',  Icon: CheckCircle2 },
    CANCELLED:  { label: 'Cancelled',  cls: 'bg-rose-500/10    text-rose-400    border-rose-500/20',    Icon: XCircle      },
    PROCESSING: { label: 'Processing', cls: 'bg-amber-500/10   text-amber-400   border-amber-500/20',   Icon: Clock        },
  };
  const cfg = map[status] ?? { label: status || 'Unknown', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20', Icon: Clock };
  const { label, cls, Icon } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide ${cls}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const STATUS_OPTIONS = ['All', 'CONFIRMED', 'COMPLETED', 'PROCESSING', 'CANCELLED'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders,  setOrders]  = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderApi.getAll();
      // Sort newest first
      const sorted = [...data].sort((a: Order, b: Order) => {
        if (a.createdAt && b.createdAt)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return 0;
      });
      setOrders(sorted);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  // ── Filtering + pagination ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'All' || o.status === statusFilter;
      if (!matchStatus) return false;
      if (!q) return true;
      const customer = parseCustomerFromNotes(o.notes).toLowerCase();
      const id       = o.id.toLowerCase();
      const product  = getProductLabel(o.items).toLowerCase();
      return customer.includes(q) || id.includes(q) || product.includes(q);
    });
  }, [orders, search, statusFilter]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => setPage(1), [search, statusFilter]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-indigo-400" />
            Orders
          </h2>
          <p className="text-slate-400 mt-1 text-sm">
            {loading ? 'Loading…' : `${filtered.length} order${filtered.length !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* Refresh */}
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search + Status filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            id="orders-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, order ID, or product…"
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>

        {/* Status pills */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_12px_rgba(79,70,229,0.35)]'
                  : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel overflow-hidden glow-effect">

        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1fr_1.4fr_1fr_0.8fr_0.5fr_0.7fr_0.7fr_0.9fr] gap-4 px-6 py-3 border-b border-slate-800 bg-slate-900/40">
          {['Order Ref', 'Product(s)', 'Customer', 'Phone', 'Qty', 'Total', 'Tax', 'Status'].map((h) => (
            <span key={h} className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              {h}
            </span>
          ))}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
            <p className="text-sm">Fetching orders…</p>
          </div>

        /* Empty state */
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-3">
            <Package className="w-16 h-16 opacity-20" />
            <p className="text-sm font-medium">No orders match your search.</p>
            {(search || statusFilter !== 'All') && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('All'); }}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

        /* Rows */
        ) : (
          <div className="divide-y divide-slate-800/60">
            {paginated.map((order) => {
              const customer = parseCustomerFromNotes(order.notes);
              const phone    = parsePhoneFromNotes(order.notes);
              const product  = getProductLabel(order.items);
              const isWalkIn = customer === 'Walk-in Customer';

              return (
                <div
                  key={order.id}
                  className="group px-6 py-4 hover:bg-slate-800/40 transition-colors"
                >
                  {/* ── Desktop row ─────────────────────────────────── */}
                  <div className="hidden md:grid grid-cols-[1fr_1.4fr_1fr_0.8fr_0.5fr_0.7fr_0.7fr_0.9fr] gap-4 items-center">

                    {/* Order ref + date */}
                    <div>
                      <p className="text-sm font-bold text-indigo-300 font-mono group-hover:text-indigo-200 transition-colors">
                        {shortId(order.id)}
                      </p>
                      {order.createdAt && (
                        <p className="text-[10px] text-slate-600 mt-0.5 font-mono">
                          {new Date(order.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: '2-digit' })}
                          {' '}
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>

                    {/* Product(s) */}
                    <p className="text-sm font-semibold text-slate-100 truncate" title={product}>
                      {product}
                    </p>

                    {/* Customer */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User className={`w-3.5 h-3.5 shrink-0 ${isWalkIn ? 'text-slate-600' : 'text-indigo-400'}`} />
                      <span className={`text-sm truncate ${isWalkIn ? 'text-slate-600 italic' : 'text-slate-200 font-medium'}`}>
                        {customer}
                      </span>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-slate-600" />
                      <span className="text-xs text-slate-500 font-mono truncate">{phone}</span>
                    </div>

                    {/* Qty */}
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-slate-200 tabular-nums">
                        {getTotalQty(order.items)}
                      </span>
                      <span className="text-[10px] text-slate-600">pc{getTotalQty(order.items) !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Total */}
                    <p className="text-sm font-bold text-white tabular-nums">
                      LKR {Number(order.totalAmount || 0).toLocaleString()}
                    </p>

                    {/* Tax */}
                    <p className="text-sm text-slate-400 tabular-nums">
                      LKR {Number(order.taxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>

                    {/* Status */}
                    <StatusBadge status={order.status} />
                  </div>

                  {/* ── Mobile card ──────────────────────────────────── */}
                  <div className="md:hidden space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-indigo-300 font-mono">{shortId(order.id)}</p>
                        <p className="text-sm font-semibold text-slate-100 truncate mt-0.5">{product}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className={`flex items-center gap-1 ${isWalkIn ? 'italic' : 'text-indigo-300'}`}>
                        <User className="w-3 h-3" /> {customer}
                      </span>
                      {phone !== '—' && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {phone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 tabular-nums">
                          Qty: <span className="text-slate-300 font-semibold">{getTotalQty(order.items)}</span>
                        </span>
                        <span className="text-sm font-bold text-white tabular-nums">
                          LKR {Number(order.totalAmount || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination footer ───────────────────────────────────────────── */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/30">
            <p className="text-xs text-slate-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page number pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
                .reduce<(number | '…')[]>((acc, n, idx, arr) => {
                  if (idx > 0 && (n as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === '…' ? (
                    <span key={`ellipsis-${i}`} className="text-slate-600 px-1 text-sm">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      className={`w-8 h-8 rounded-lg border text-xs font-semibold transition-all ${
                        currentPage === n
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(79,70,229,0.3)]'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {n}
                    </button>
                  ),
                )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
