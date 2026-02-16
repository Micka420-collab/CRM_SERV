'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { 
  Upload, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Smartphone,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface Version {
  id: string;
  version: string;
  channel: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl: string;
  size: number;
  mandatory: boolean;
  rolloutPercent: number;
  isActive: boolean;
  _count?: { updateSessions: number };
}

interface Device {
  id: string;
  hardwareId: string;
  machineName: string;
  appVersion: string;
  updateStatus: string;
  lastSeen: string;
  forceUpdate: boolean;
  user: {
    email: string;
    name: string;
  };
  targetVersion?: {
    version: string;
  };
}

interface UpdateStats {
  totalDevices: number;
  pending: number;
  completed: number;
  failed: number;
  upToDate: number;
  successRate: number;
}

export default function AdminUpdatesPage() {
  const [versions, setVersions] = useState<Version[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<UpdateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [showForceUpdateModal, setShowForceUpdateModal] = useState(false);
  const [forceUpdateOptions, setForceUpdateOptions] = useState({
    onlyOutdated: true,
    gradualRollout: false,
    rolloutPercent: 100,
    scheduledTime: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [versionsData, devicesData, statsData] = await Promise.all([
        fetch('/api/v1/updates/versions').then(r => r.json()),
        fetch('/api/v1/updates/devices').then(r => r.json()),
        selectedVersion ? fetch(`/api/v1/updates/stats/${selectedVersion}`).then(r => r.json()) : Promise.resolve(null)
      ]);

      setVersions(versionsData.versions || []);
      setDevices(devicesData.devices || []);
      if (statsData) setStats(statsData.stats);
    } catch (err) {
      console.error('Failed to load update data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      const response = await fetch('/api/v1/updates/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: formData.get('version'),
          downloadUrl: formData.get('downloadUrl'),
          size: parseInt(formData.get('size') as string),
          checksum: formData.get('checksum'),
          releaseNotes: formData.get('releaseNotes'),
          channel: formData.get('channel'),
          mandatory: formData.get('mandatory') === 'on',
          rolloutPercent: parseInt(formData.get('rolloutPercent') as string)
        })
      });

      if (response.ok) {
        setShowNewVersionModal(false);
        loadData();
      }
    } catch (err) {
      console.error('Failed to create version:', err);
    }
  };

  const handleForceUpdate = async () => {
    if (!selectedVersion) return;

    try {
      const response = await fetch('/api/v1/updates/force-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId: selectedVersion,
          ...forceUpdateOptions,
          scheduledTime: forceUpdateOptions.scheduledTime || null
        })
      });

      if (response.ok) {
        setShowForceUpdateModal(false);
        loadData();
        alert('Mise à jour forcée programmée avec succès!');
      }
    } catch (err) {
      console.error('Failed to force update:', err);
    }
  };

  const handleDeactivateVersion = async (versionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver cette version ?')) return;

    try {
      await fetch(`/api/v1/updates/versions/${versionId}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error('Failed to deactivate version:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UP_TO_DATE': return 'text-green-400';
      case 'UPDATE_PENDING': return 'text-yellow-400';
      case 'UPDATE_DOWNLOADING': return 'text-blue-400';
      case 'UPDATE_FAILED': return 'text-red-400';
      default: return 'text-dark-400';
    }
  };

  if (loading) {
    return <div className="text-dark-400">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestion des Mises à Jour</h1>
          <p className="text-dark-400 text-sm">Déployer et gérer les versions du CRM</p>
        </div>
        <button
          onClick={() => setShowNewVersionModal(true)}
          className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          <Upload className="w-4 h-4" />
          Nouvelle Version
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-2xl p-4">
            <p className="text-dark-400 text-xs uppercase">Total Devices</p>
            <p className="text-2xl font-bold text-white">{stats.totalDevices}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-dark-400 text-xs uppercase">À Jour</p>
            <p className="text-2xl font-bold text-green-400">{stats.upToDate}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-dark-400 text-xs uppercase">En Cours</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-dark-400 text-xs uppercase">Taux de Réussite</p>
            <p className="text-2xl font-bold text-primary-400">{stats.successRate}%</p>
          </div>
        </div>
      )}

      {/* Versions List */}
      <div className="glass rounded-2xl overflow-hidden mb-8">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Versions</h2>
        </div>
        <div className="divide-y divide-white/5">
          {versions.map((version) => (
            <div 
              key={version.id} 
              className={`p-4 hover:bg-white/5 transition cursor-pointer ${selectedVersion === version.id ? 'bg-primary-500/10 border-l-2 border-primary-500' : ''}`}
              onClick={() => setSelectedVersion(version.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${version.mandatory ? 'bg-red-500/20' : 'bg-primary-500/20'}`}>
                    {version.mandatory ? <Zap className="w-5 h-5 text-red-400" /> : <CheckCircle className="w-5 h-5 text-primary-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold">v{version.version}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${version.channel === 'stable' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {version.channel}
                      </span>
                      {version.mandatory && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                          Obligatoire
                        </span>
                      )}
                    </div>
                    <p className="text-dark-400 text-xs">{formatFileSize(version.size)} • {new Date(version.releaseDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-white text-sm">{version._count?.updateSessions || 0} installations</p>
                    <p className="text-dark-400 text-xs">{version.rolloutPercent}% déployé</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeactivateVersion(version.id);
                    }}
                    className="p-2 hover:bg-red-500/10 text-dark-400 hover:text-red-400 rounded-lg transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {selectedVersion === version.id && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-dark-300 text-sm mb-4">{version.releaseNotes}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowForceUpdateModal(true);
                    }}
                    className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Forcer la Mise à Jour
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Devices List */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Devices ({devices.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-dark-500 text-xs uppercase">
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Dernière Connexion</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {devices.slice(0, 20).map((device) => (
                <tr key={device.id} className="text-sm">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-dark-400" />
                      <span className="text-white">{device.machineName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-dark-300">{device.user.name || device.user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-dark-300">{device.appVersion}</span>
                    {device.targetVersion && (
                      <span className="text-primary-400 ml-2">→ {device.targetVersion.version}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`${getStatusColor(device.updateStatus)}`}>
                      {device.updateStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-400">
                    {new Date(device.lastSeen).toLocaleString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    {device.forceUpdate && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary-500/20 text-primary-400">
                        Forcée
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Version Modal */}
      {showNewVersionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">Nouvelle Version</h2>
            <form onSubmit={handleCreateVersion} className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1">Version</label>
                <input name="version" type="text" placeholder="1.2.3" required
                  className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1">URL de Téléchargement</label>
                <input name="downloadUrl" type="url" required
                  className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Taille (bytes)</label>
                  <input name="size" type="number" required
                    className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Checksum SHA256</label>
                  <input name="checksum" type="text" required
                    className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1">Notes de Release</label>
                <textarea name="releaseNotes" rows={3} required
                  className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-2 text-white"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Channel</label>
                  <select name="channel" defaultValue="stable"
                    className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-2 text-white">
                    <option value="stable">Stable</option>
                    <option value="beta">Beta</option>
                    <option value="alpha">Alpha</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Déploiement (%)</label>
                  <input name="rolloutPercent" type="number" min="1" max="100" defaultValue="100"
                    className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-2 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input name="mandatory" type="checkbox" id="mandatory"
                  className="w-4 h-4 rounded border-white/10 bg-dark-900/50" />
                <label htmlFor="mandatory" className="text-sm text-dark-300">Mise à jour obligatoire</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowNewVersionModal(false)}
                  className="flex-1 py-2 rounded-xl bg-dark-700 text-white hover:bg-dark-600 transition">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Force Update Modal */}
      {showForceUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">Forcer la Mise à Jour</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="onlyOutdated"
                  checked={forceUpdateOptions.onlyOutdated}
                  onChange={(e) => setForceUpdateOptions({...forceUpdateOptions, onlyOutdated: e.target.checked})}
                  className="w-4 h-4 rounded border-white/10 bg-dark-900/50" 
                />
                <label htmlFor="onlyOutdated" className="text-sm text-dark-300">
                  Uniquement les devices pas à jour
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="gradualRollout"
                  checked={forceUpdateOptions.gradualRollout}
                  onChange={(e) => setForceUpdateOptions({...forceUpdateOptions, gradualRollout: e.target.checked})}
                  className="w-4 h-4 rounded border-white/10 bg-dark-900/50" 
                />
                <label htmlFor="gradualRollout" className="text-sm text-dark-300">
                  Déploiement progressif
                </label>
              </div>
              {forceUpdateOptions.gradualRollout && (
                <div>
                  <label className="block text-sm text-dark-300 mb-1">Pourcentage de déploiement</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="100"
                    value={forceUpdateOptions.rolloutPercent}
                    onChange={(e) => setForceUpdateOptions({...forceUpdateOptions, rolloutPercent: parseInt(e.target.value)})}
                    className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-2 text-white" 
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-dark-300 mb-1">Date programmée (optionnel)</label>
                <input 
                  type="datetime-local"
                  value={forceUpdateOptions.scheduledTime}
                  onChange={(e) => setForceUpdateOptions({...forceUpdateOptions, scheduledTime: e.target.value})}
                  className="w-full bg-dark-900/50 border border-white/10 rounded-xl px-4 py-2 text-white" 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowForceUpdateModal(false)}
                  className="flex-1 py-2 rounded-xl bg-dark-700 text-white hover:bg-dark-600 transition">
                  Annuler
                </button>
                <button onClick={handleForceUpdate}
                  className="flex-1 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition">
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
