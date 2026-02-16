'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { 
  Users, 
  Key, 
  CreditCard, 
  Activity,
  ArrowUpRight,
  Monitor
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await adminAPI.getDashboard();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-dark-400">Chargement des statistiques...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Tableau de bord Admin</h1>
          <p className="text-dark-400 text-sm">Aperçu general de l&apos;ecosysteme ITStock</p>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-medium">
          <Activity className="w-3 h-3" />
          Serveur Operationnel
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs text-green-400 flex items-center gap-1 font-medium">
              Total <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-dark-400 text-xs uppercase tracking-wider font-semibold mb-1">Utilisateurs</p>
          <p className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400">
              <Key className="w-5 h-5" />
            </div>
          </div>
          <p className="text-dark-400 text-xs uppercase tracking-wider font-semibold mb-1">Licences Generees</p>
          <p className="text-3xl font-bold text-white">{stats?.totalLicenses || 0}</p>
          <p className="text-dark-500 text-xs mt-2">{stats?.activeLicenses || 0} actives</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-dark-400 text-xs uppercase tracking-wider font-semibold mb-1">Abonnements Actifs</p>
          <p className="text-3xl font-bold text-white">{stats?.activeSubscriptions || 0}</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Monitor className="w-5 h-5" />
            </div>
          </div>
          <p className="text-dark-400 text-xs uppercase tracking-wider font-semibold mb-1">Activations</p>
          <p className="text-3xl font-bold text-white">{stats?.totalActivations || 0}</p>
          <p className="text-dark-500 text-xs mt-2">Postes en circulation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activations */}
        <div className="lg:col-span-2 glass rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">Activations Recentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-dark-500 text-xs uppercase tracking-wider">
                  <th className="pb-4 font-semibold">Machine</th>
                  <th className="pb-4 font-semibold">Plan</th>
                  <th className="pb-4 font-semibold">Hardware ID</th>
                  <th className="pb-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats?.recentActivations?.map((act: any) => (
                  <tr key={act.id} className="text-sm">
                    <td className="py-4 text-white font-medium">{act.machineName}</td>
                    <td className="py-4">
                      <span className="bg-primary-500/10 text-primary-400 px-2 py-0.5 rounded text-xs">
                        {act.plan}
                      </span>
                    </td>
                    <td className="py-4 text-dark-500 font-mono text-xs">{act.hardwareId.substring(0, 12)}...</td>
                    <td className="py-4 text-dark-400">
                      {new Date(act.activatedAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subscriptions by plan */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">Repartition Plans</h2>
          <div className="space-y-4">
            {stats?.subscriptionsByPlan?.map((item: any) => (
              <div key={item.planId} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-300 capitalize">{item.planId}</span>
                  <span className="text-white font-bold">{item._count.id}</span>
                </div>
                <div className="w-full h-2 bg-dark-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-500" 
                    style={{ width: `${(item._count.id / stats.activeSubscriptions) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
