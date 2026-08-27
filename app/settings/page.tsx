'use client';

import { 
  Settings2, UserCircle, Bell, Shield, Wallet, Globe, Database
} from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-indigo-400" />
          System Settings
        </h2>
        <p className="text-slate-400">Manage your D-Pay preferences and microservices configurations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="glass-panel p-4 flex flex-col gap-2 h-fit">
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-sm font-medium transition-colors text-left">
            <UserCircle className="w-5 h-5" /> Account Details
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent transition-colors text-left">
            <Shield className="w-5 h-5" /> Security & Access
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent transition-colors text-left">
            <Bell className="w-5 h-5" /> Notifications
          </button>
          <div className="my-2 h-px bg-slate-800" />
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent transition-colors text-left">
            <Wallet className="w-5 h-5" /> Payment Gateways
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent transition-colors text-left">
            <Database className="w-5 h-5" /> Tax & Inventory Rules
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent transition-colors text-left">
            <Globe className="w-5 h-5" /> System UI
          </button>
        </div>

        {/* Settings Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 glow-effect relative overflow-hidden">
             
             <h3 className="text-lg font-semibold text-white mb-6">Profile Information</h3>
             
             <div className="space-y-5 relative z-10">
               <div className="flex items-center gap-6">
                 <div className="w-20 h-20 rounded-full border-2 border-slate-700 bg-slate-800 flex items-center justify-center shrink-0">
                   <UserCircle className="w-10 h-10 text-slate-500" />
                 </div>
                 <div className="flex flex-col gap-2">
                   <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-200 font-medium transition-colors w-fit">
                     Change Avatar
                   </button>
                   <p className="text-xs text-slate-500">JPG, GIF or PNG. 1MB max.</p>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-6 mt-4">
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Full Name</label>
                   <input type="text" defaultValue="Admin User" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Email Address</label>
                   <input type="email" defaultValue="admin@dpay.com" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors" />
                 </div>
                 <div className="col-span-2 space-y-1.5">
                   <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Bio</label>
                   <textarea rows={3} defaultValue="Main Administrator of D-Pay." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors custom-scrollbar" />
                 </div>
               </div>

               <div className="pt-6 border-t border-slate-800/50 flex justify-end gap-3">
                 <button className="px-5 py-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-sm font-medium text-slate-300 transition-colors">
                   Discard Changes
                 </button>
                 <button onClick={handleSave} className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                   Save Settings
                 </button>
               </div>
             </div>
          </div>
        </div>
      </div>

    </div>
  );
}
