'use client';

import { 
  Bell, 
  Search, 
  Command,
  Sun,
  Moon
} from 'lucide-react';

export default function Header() {
  return (
    <header className="h-20 glass border-b border-border/50 flex items-center justify-between px-4 md:px-8 z-10 sticky top-0">
      
      {/* Dynamic Breadcrumbs or Page Title Area */}
      <div className="hidden md:flex items-center gap-2">
         {/* Could be dynamically populated based on route */}
         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
         <span className="text-sm font-medium text-slate-300 tracking-wide">Live Services Running</span>
      </div>

      {/* Center Search Bar */}
      <div className="flex-1 max-w-xl px-4 hidden sm:block">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-indigo-400" />
          <input
            type="text"
            placeholder="Search transactions, products, or users..."
            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-full pl-10 pr-12 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all shadow-inner"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
            <kbd className="hidden md:inline-flex items-center gap-1 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              <Command className="w-3 h-3" /> K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle (Visual only for now, since app is forced dark) */}
        <button className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600 transition-all text-slate-400 hover:text-slate-200">
          <Moon className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button className="relative w-10 h-10 rounded-full flex items-center justify-center border border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600 transition-all text-slate-400 hover:text-slate-200">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-background" />
        </button>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-800 mx-1" />

        {/* User Profile */}
        <button className="flex items-center gap-3 hover:opacity-80 transition-opacity pl-1">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-200 leading-tight">Admin User</p>
            <p className="text-xs text-slate-500 font-medium tracking-wide">Manager</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-indigo-500/30 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-inner">
              AD
            </div>
          </div>
        </button>
      </div>

    </header>
  );
}
