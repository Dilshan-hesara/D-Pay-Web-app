'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  TrendingUp, Users, Package, ShoppingCart, Activity, Loader2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { inventoryApi, orderApi, userApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  taxAmount?: number;
  notes?: string;
  createdAt?: string;
  items?: Array<{ productName?: string }>;
}

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  stockQty: number;
}

// ─── Order display helpers ────────────────────────────────────────────────────

function parseCustomerFromNotes(notes?: string): string {
  if (!notes) return 'Walk-in Customer';
  const segment = notes.split('|').find((s) => s.trim().startsWith('Customer:'));
  if (!segment) return 'Walk-in Customer';
  return segment.replace('Customer:', '').trim() || 'Walk-in Customer';
}

function getOrderDisplayName(items?: Array<{ productName?: string }>): string {
  if (!items || items.length === 0) return 'Unknown Product';
  const firstName = items[0]?.productName || 'Unknown Product';
  return items.length === 1 ? firstName : `${firstName} +${items.length - 1} more`;
}

// ─── Chart data helpers ───────────────────────────────────────────────────────

type Period = '7d' | '30d' | 'all';

/**
 * Groups orders by date and sums revenue per day.
 * Returns an array sorted ascending by date for Recharts.
 */
function buildChartData(orders: Order[], period: Period) {
  const now = Date.now();
  const cutoff: Record<Period, number> = {
    '7d':  now - 7  * 86_400_000,
    '30d': now - 30 * 86_400_000,
    'all': 0,
  };

  const grouped: Record<string, { revenue: number; orders: number }> = {};

  orders.forEach((o) => {
    const ts = o.createdAt ? new Date(o.createdAt).getTime() : 0;
    if (ts < cutoff[period]) return;

    // Key by locale date string → "23 Aug"
    const key = o.createdAt
      ? new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      : 'Unknown';

    if (!grouped[key]) grouped[key] = { revenue: 0, orders: 0 };
    grouped[key].revenue += Number(o.totalAmount) || 0;
    grouped[key].orders  += 1;
  });

  // Sort chronologically (parse back to date for sort)
  return Object.entries(grouped)
    .map(([date, vals]) => ({ date, ...vals }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-slate-400 font-medium mb-2">{label}</p>
      <p className="text-white font-bold tabular-nums">
        LKR {Number(payload[0]?.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className="text-slate-500 text-xs mt-0.5">
        {payload[1]?.value ?? 0} order{payload[1]?.value === 1 ? '' : 's'}
      </p>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [loading,        setLoading]        = useState(true);
  const [allOrders,      setAllOrders]      = useState<Order[]>([]);
  const [recentOrders,   setRecentOrders]   = useState<Order[]>([]);
  const [lowStockItems,  setLowStockItems]  = useState<LowStockItem[]>([]);
  const [showLowStock,   setShowLowStock]   = useState(false);
  const [period,         setPeriod]         = useState<Period>('30d');

  const LOW_STOCK_THRESHOLD = 20;

  const [stats, setStats] = useState({
    revenue:   0,
    orders:    0,
    lowStock:  0,
    customers: 0,
  });

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [inv, ords, users] = await Promise.all([
          inventoryApi.getAll(),
          orderApi.getAll(),
          userApi.getAll(),
        ]);

        const revenue = ords.reduce((acc: number, o: any) => acc + (Number(o.totalAmount) || 0), 0);

        // Normalize field name: the Inventory Service serialises as `stockQty`
        // but guard against snake_case variants just in case.
        const normalizedInv: LowStockItem[] = inv.map((p: any) => ({
          id:       p.id       ?? '',
          name:     p.name     ?? p.productName ?? 'Unknown',
          sku:      p.sku      ?? '',
          stockQty: p.stockQty ?? p.stock_qty ?? p.stockQuantity ?? p.stock ?? 0,
        }));

        const lowItems = normalizedInv
          .filter((p) => p.stockQty <= LOW_STOCK_THRESHOLD)
          .sort((a, b) => a.stockQty - b.stockQty); // most critical first

        setLowStockItems(lowItems);
        setStats({ revenue, orders: ords.length, lowStock: lowItems.length, customers: users.length });
        setAllOrders(ords);

        const sorted = [...ords].sort((a, b) => {
          if (a.createdAt && b.createdAt)
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          return 0;
        });
        setRecentOrders(sorted.slice(0, 5));
      } catch {
        toast.error('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // Recompute chart data whenever period or orders change
  const chartData = useMemo(() => buildChartData(allOrders, period), [allOrders, period]);

  // Peak revenue for the Y-axis label
  const peakRevenue = useMemo(
    () => chartData.reduce((m, d) => Math.max(m, d.revenue), 0),
    [chartData],
  );

  const statCards = [
    { label: 'Total Revenue',   value: `LKR ${stats.revenue.toLocaleString()}`, icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Total Orders',    value: stats.orders.toString(),                  icon: ShoppingCart, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Low Stock Items', value: stats.lowStock.toString(),                icon: Package,     color: 'text-amber-400',   bg: 'bg-amber-500/10'  },
    { label: 'Total Users',     value: stats.customers.toString(),               icon: Users,       color: 'text-cyan-400',    bg: 'bg-cyan-500/10'   },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col gap-1 mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white">Overview</h2>
        <p className="text-slate-400">Welcome back! Here&apos;s your live business performance data.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const isLowStock = stat.label === 'Low Stock Items';
          return (
            <div
              key={stat.label}
              className={`glass-panel p-6 group hover:-translate-y-1 transition-all duration-300 ${
                isLowStock && stats.lowStock > 0 ? 'cursor-pointer' : ''
              }`}
              onClick={isLowStock && stats.lowStock > 0 ? () => setShowLowStock(v => !v) : undefined}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center border border-white/5`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {isLowStock && stats.lowStock > 0 && (
                  <span className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-widest animate-pulse">
                    Alert
                  </span>
                )}
              </div>
              <h3 className="text-slate-400 text-sm font-medium mb-1 tracking-wide">{stat.label}</h3>
              <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>

              {/* ── Low Stock inline preview ─────────────────────────── */}
              {isLowStock && showLowStock && lowStockItems.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  {lowStockItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-300 truncate flex-1" title={item.name}>
                        {item.name}
                      </p>
                      <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
                        item.stockQty === 0
                          ? 'bg-rose-500/20 text-rose-400'
                          : item.stockQty <= 10
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {item.stockQty === 0 ? 'Out' : `${item.stockQty} left`}
                      </span>
                    </div>
                  ))}
                  {lowStockItems.length > 5 && (
                    <p className="text-[10px] text-slate-600 pt-1">
                      +{lowStockItems.length - 5} more items low
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Revenue Analytics Chart ──────────────────────────────────── */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col relative overflow-hidden glow-effect" style={{ minHeight: 400 }}>

          {/* Header + period selector */}
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <h3 className="text-lg font-semibold text-white">Revenue Analytics</h3>
              {peakRevenue > 0 && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Peak: LKR {peakRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              )}
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="bg-slate-900/60 border border-slate-700/50 text-slate-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Chart body */}
          <div className="flex-1 relative z-10 min-h-[280px]">
            {chartData.length === 0 ? (
              /* No-data state */
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                <Activity className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">No revenue data for this period.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  {/* Gradient fill definitions */}
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#34d399" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0}   />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--font-inter)' }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    interval="preserveStartEnd"
                  />

                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'var(--font-inter)' }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    width={60}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}k`
                        : String(v)
                    }
                  />

                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />

                  {/* Revenue area */}
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fill="url(#revenueGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: '#6366f1', stroke: '#1e1b4b', strokeWidth: 2 }}
                  />

                  {/* Order count area (secondary, hidden Y scale — just visual) */}
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#34d399"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    fill="url(#ordersGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: '#34d399', stroke: '#052e16', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend */}
          {chartData.length > 0 && (
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-800 relative z-10">
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-indigo-500 rounded-full inline-block" />
                <span className="text-xs text-slate-500">Revenue (LKR)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-emerald-400 rounded-full inline-block" style={{ borderTop: '2px dashed #34d399' }} />
                <span className="text-xs text-slate-500">Order Count</span>
              </div>
              <span className="ml-auto text-xs text-slate-600 tabular-nums">
                {chartData.length} data point{chartData.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Background grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        </div>

        {/* ── Recent Orders ─────────────────────────────────────────────── */}
        <div className="glass-panel p-6 flex flex-col glow-effect">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Recent Orders</h3>
            <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
              Live Feed
            </button>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {recentOrders.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-500">No recent orders found.</div>
            ) : (
              recentOrders.map((order) => {
                const productLabel  = getOrderDisplayName(order.items);
                const customerLabel = parseCustomerFromNotes(order.notes);
                const isWalkIn      = customerLabel === 'Walk-in Customer';

                return (
                  <div
                    key={order.id}
                    className="flex items-start justify-between gap-3 p-3.5 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-700/50 cursor-default group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-100 truncate leading-snug group-hover:text-white transition-colors">
                        {productLabel}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-xs truncate ${isWalkIn ? 'text-slate-600 italic' : 'text-indigo-400 font-medium'}`}>
                          {customerLabel}
                        </span>
                        {order.createdAt && (
                          <>
                            <span className="text-slate-700 text-xs">·</span>
                            <span className="text-[10px] text-slate-600 font-mono shrink-0">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <p className="text-sm font-bold text-white tabular-nums leading-none">
                        LKR {Number(order.totalAmount || 0).toLocaleString()}
                      </p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block tracking-wide uppercase ${
                        order.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        order.status === 'CANCELLED' ? 'bg-rose-500/10    text-rose-400    border border-rose-500/20'    :
                        order.status === 'CONFIRMED' ? 'bg-indigo-500/10  text-indigo-400  border border-indigo-500/20'  :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {order.status || 'PROCESSING'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
