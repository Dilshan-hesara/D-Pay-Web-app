'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Search, Plus, MoreHorizontal, Edit, Trash2, Shield, Loader2, User as UserIcon
} from 'lucide-react';
import { userApi } from '@/lib/api';

// Derived from UserResponseDTO
interface User {
  id: string; // backend returns UUID string
  username: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  createdAt: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  // UserRequestDTO requires: username, email, phone, role, password
  const [formData, setFormData] = useState({
    username: '', email: '', phone: '', role: 'CASHIER', password: ''
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userApi.getAll();
      setUsers(data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openForm = (u?: User) => {
    if (u) {
      setFormData({
        username: u.username, email: u.email, phone: u.phone || '',
        role: u.role, password: '' // Leave password empty on edit unless user types a new one
      });
      setEditUser(u);
    } else {
      setFormData({ username: '', email: '', phone: '', role: 'CASHIER', password: '' });
      setEditUser(null);
    }
    setIsModalOpen(true);
  };

  const closeForm = () => {
    setIsModalOpen(false);
    setEditUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Backend @Size requires at least 8 chars
    if (formData.password && formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!editUser && !formData.password) {
      toast.error('Password is required for new users');
      return;
    }

    setSubmitting(true);
    try {
      // Create request payload matching UserRequestDTO
      const payload: Record<string, string> = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        role: formData.role
      };
      
      if (formData.password) {
        payload.password = formData.password;
      }
      
      if (editUser) {
        await userApi.update(editUser.id, payload);
        toast.success('User updated successfully');
      } else {
        await userApi.create(payload);
        toast.success('User added successfully');
      }
      closeForm();
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || (editUser ? 'Failed to update user' : 'Failed to add user'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user ${username}?`)) return;
    try {
      await userApi.delete(id);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const toggleStatus = async (id: string, currentActive: boolean) => {
    try {
      await userApi.toggleActive(id, !currentActive);
      toast.success(`User ${!currentActive ? 'activated' : 'deactivated'}`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  const filtered = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-1">User Access Management</h2>
          <p className="text-slate-400">Manage cashier and admin accounts for the POS.</p>
        </div>
        <button 
          onClick={() => openForm()}
          className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="glass-panel overflow-hidden glow-effect flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-border/50 bg-slate-900/30 flex flex-col sm:flex-row gap-4 justify-between items-center z-10 relative">
          <div className="relative w-full sm:max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-colors group-focus-within:text-indigo-400" />
            <input
              type="text"
              placeholder="Search by username, email or role..."
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
                <th className="px-6 py-4 w-16">Profile</th>
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No users found. Create the first user!
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-indigo-400" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-200">{user.username}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {user.role === 'ADMIN' && <Shield className="w-3 h-3 text-emerald-400" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleStatus(user.id, user.active)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                        user.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20' : 
                                      'bg-slate-800 text-slate-400 border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'
                        }`}
                        title={user.active ? "Click to deactivate" : "Click to activate"}
                      >
                        {user.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-300">{user.phone || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openForm(user)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(user.id, user.username)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors">
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-white">{editUser ? 'Edit User' : 'Add New User'}</h3>
              <button onClick={closeForm} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-400">Username *</label>
                  <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. john_doe" />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-400">Email Address *</label>
                  <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="john@example.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">Phone</label>
                  <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="+94770000000" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400">System Role *</label>
                  <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="CASHIER">CASHIER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="MANAGER">MANAGER</option>
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-400">{editUser ? 'New Password (Optional)' : 'Password *'}</label>
                  <input type="password" required={!editUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="••••••••" />
                  <p className="text-[10px] text-slate-500">Must be at least 8 characters long.</p>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-6">
                <button type="button" onClick={closeForm} className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-sm font-medium text-slate-300">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white shadow-lg flex items-center">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
