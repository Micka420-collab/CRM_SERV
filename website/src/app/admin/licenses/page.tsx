'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { 
  Key, 
  Search, 
  XCircle,
} from 'lucide-react';

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({
    status: '',
    plan: '',
    page: 1,
  });

  useEffect(() => {
    loadLicenses();
  }, [params]);

  const loadLicenses = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.listLicenses(params);
      setLicenses(data.licenses || []);
    } catch (err) {
      console.error('Failed to load licenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Etes-vous sur de vouloir revoquer cette licence ? Cette action bloquera immÃ©diatement l\'accÃ¨s au CRM.')) return;
    
    try {
      await adminAPI.revokeLicense(id);
      loadLicenses();
    } catch (err) {
      alert('Erreur lors de la revocation');
    }
  };

  const statusMap: any = {
    ACTIVE: { label: 'Actif', class: 'bg-green-500/10 text-green-400' },
    REVOKED: { label: 'Revoque', class: 'bg-red-500/10 text-red-400' },
    EXPIRED: { label: 'Expire', class: 'bg-dark-500/10 text-dark-500' },
    SUSPENDED: { label: 'Suspendu', class: 'bg-yellow-500/10 text-yellow-400' },
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Gestion des Licences</h1>
        <p className="text-dark-400 text-sm">Controlez les cles et les activations du systeme</p>
      </div>

      {/* Filters bar */}
      <div className="glass rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input 
            type="text" 
            placeholder="Rechercher par utilisateur ou cle..."
            className="w-full bg-dark-900/50 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary-500"
          />
        </div>
        
        <select 
          value={params.status}
          onChange={(e) => setParams({...params, status: e.target.value})}
          className="bg-dark-900/50 border border-white/5 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-primary-500 cursor-pointer"
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="REVOKED">Revoque</option>
          <option value="EXPIRED">Expire</option>
        </select>

        <select 
          value={params.plan}
          onChange={(e) => setParams({...params, plan: e.target.value})}
          className="bg-dark-900/50 border border-white/5 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:border-primary-500 cursor-pointer"
        >
          <option value="">Tous les plans</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-dark-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Cle de Licence</th>
                <th className="px-6 py-4 font-semibold">Utilisateur</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Postes</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-dark-400 text-sm">Chargement...</td>
                </tr>
              ) : licenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-dark-400 text-sm">Aucune licence trouvee.</td>
                </tr>
              ) : licenses.map((lic) => (
                <tr key={lic.id} className="text-sm hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Key className="w-3 h-3 text-primary-400" />
                      <code className="text-dark-300 font-mono text-xs">{lic.licenseKey.substring(0, 18)}...</code>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{lic.user.name || 'Sans nom'}</p>
                    <p className="text-dark-500 text-xs">{lic.user.email}</p>
                  </td>
                  <td className="px-6 py-4 capitalize text-dark-300">{lic.plan.displayName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusMap[lic.status]?.class}`}>
                      {statusMap[lic.status]?.label || lic.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-dark-400">
                    <span className={lic.activations.length >= lic.maxActivations ? 'text-yellow-500' : ''}>
                      {lic.activations.length}
                    </span>
                    <span className="text-dark-600"> / {lic.maxActivations}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {lic.status !== 'REVOKED' && (
                         <button 
                          onClick={() => handleRevoke(lic.id)}
                          className="p-1.5 hover:bg-red-500/10 text-dark-500 hover:text-red-400 rounded-lg transition"
                          title="Revoquer"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
