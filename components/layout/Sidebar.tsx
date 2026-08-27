'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Settings,
  Activity,
  ClipboardList
} from 'lucide-react';

const routes = [
  { href: '/',          label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/pos',       label: 'POS Terminal', icon: ShoppingCart },
  { href: '/orders',    label: 'Orders',       icon: ClipboardList },
  { href: '/inventory', label: 'Inventory',    icon: Package },
  { href: '/users',     label: 'Users',        icon: Users },
  { href: '/settings',  label: 'Settings',     icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[280px] h-full flex flex-col border-r border-border/50 glass relative z-20">
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              D-Pay
            </h1>
            <span className="text-[10px] font-medium uppercase tracking-widest text-indigo-400/80 -mt-1">
              POS System
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="mb-4 px-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Main Menu</span>
        </div>
        
        {routes.map((route) => {
          const isActive = pathname === route.href || (route.href !== '/' && pathname.startsWith(route.href));
          return (
            <Link
              key={route.href}
              href={route.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                isActive 
                  ? 'text-white bg-indigo-500/10 border border-indigo-500/20 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 hover:border hover:border-slate-700/50 border border-transparent'
              }`}
            >
              <route.icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="relative z-10">{route.label}</span>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Branding */}
      <div className="mt-auto p-6 border-t border-border/50">
        <a 
          href="https://dilshanhesara.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:brightness-125 transition-all duration-300"
        >
          <img 
            src="https://dilshanhesara.com/assets/images/logo/dh01.jpg" 
            alt="Dilshan Hesara Logo" 
            className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
          />
          <div className="flex flex-col justify-center text-left">
            <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
              dev & design by
            </span>
            <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
              Dilshan Hesara
            </span>
          </div>
        </a>
      </div>
    </aside>
  );
}
