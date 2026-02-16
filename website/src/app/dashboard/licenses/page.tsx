'use client';

import { useEffect, useState } from 'react';
import { Key, Copy, Monitor, Check } from 'lucide-react';
import { subscriptionAPI } from '@/lib/api';

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadLicenses();
  }, []);

  const loadLicenses = async () => {
    try {
      const data = await subscriptionAPI.licenses();
      setLicenses(data.licenses || []);
    } catch (err) {
      console.error('Failed to load licenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-500/10 text-green-400',
    EXPIRED: 'bg-red-500/10 text-red-400',
    REVOKED: 'bg-red-500/10 text-red-400',
    SUSPENDED: 'bg-yellow-500/10 text-yellow-400',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Mes licences</h1>

      {loading ? (
        <div className="text-dark-400">Chargement...</div>
      ) : licenses.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Key className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Aucune licence</h2>
          <p className="text-dark-400">Souscrivez a un plan pour obtenir votre premiere cle de licence.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {licenses.map((license) => (
            <div key={license.id} className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                    <Key className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">Plan {license.plan.displayName}</p>
                    <p className="text-dark-500 text-xs">
                      {license.activations?.length || 0}/{license.maxActivations} postes actives
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[license.status] || ''}`}>
                  {license.status}
                </span>
              </div>

              {/* License key */}
              <div className="flex items-center gap-3 p-3 bg-dark-900/50 rounded-xl mb-4">
                <code className="flex-1 text-sm text-dark-300 font-mono">{license.licenseKey}</code>
                <button
                  onClick={() => copyKey(license.licenseKey)}
                  className="p-2 hover:bg-white/5 rounded-lg transition"
                  title="Copier la cle"
                >
                  {copiedKey === license.licenseKey ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-dark-400" />
                  )}
                </button>
              </div>

              {/* Expiration */}
              {license.expiresAt && (
                <p className="text-dark-500 text-xs mb-4">
                  Expire le {new Date(license.expiresAt).toLocaleDateString('fr-FR')}
                </p>
              )}

              {/* Activations */}
              {license.activations && license.activations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-dark-300 mb-2">Machines activees</h4>
                  <div className="space-y-2">
                    {license.activations.map((act: any) => (
                      <div key={act.id} className="flex items-center justify-between p-3 bg-dark-900/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Monitor className="w-4 h-4 text-dark-500" />
                          <div>
                            <p className="text-sm text-dark-300">{act.machineName || 'Machine inconnue'}</p>
                            <p className="text-xs text-dark-500 font-mono">{act.hardwareId}</p>
                          </div>
                        </div>
                        <p className="text-xs text-dark-500">
                          Dernier check: {new Date(act.lastCheckIn).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
