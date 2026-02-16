'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { 
  Users, 
  Search, 
  Mail, 
  Calendar,
  Key
} from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({
    search: '',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    loadUsers();
  }, [params]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.listUsers(params);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
          <p className="text-dark-400 text-sm">Gerez la base client ITStock ({total} au total)</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou email..."
            className="w-full bg-dark-900/50 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary-500"
            onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 text-center py-12 text-dark-400">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-dark-400">Aucun utilisateur trouve.</div>
        ) : users.map((user) => (
          <div key={user.id} className="glass rounded-2xl p-6 hover:border-primary-500/30 transition border border-transparent">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center border border-white/5">
                  <Users className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">{user.name || 'Inconnu'}</h3>
                  <div className="flex items-center gap-2 text-dark-500 text-xs mt-0.5">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400' : 'bg-dark-500/10 text-dark-400'}`}>
                {user.role}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-3 bg-dark-900/50 rounded-xl">
                <p className="text-dark-500 text-[10px] uppercase font-bold tracking-wider mb-1">Licences</p>
                <div className="flex items-center gap-2">
                  <Key className="w-3 h-3 text-primary-400" />
                  <span className="text-white font-semibold text-sm">{user._count.licenses} valides</span>
                </div>
              </div>
              <div className="p-3 bg-dark-900/50 rounded-xl">
                <p className="text-dark-500 text-[10px] uppercase font-bold tracking-wider mb-1">Membre depuis</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-dark-400" />
                  <span className="text-white text-sm">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

            <button className="w-full mt-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-dark-300 text-xs font-medium transition">
              Voir les details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
