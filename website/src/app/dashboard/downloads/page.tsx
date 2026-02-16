'use client';

import { useState, useEffect } from 'react';
import { Download, Monitor, FileText, Shield, Gift, Loader2, CheckCircle, Copy, Key } from 'lucide-react';
import { subscriptionAPI } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface License {
  id: string;
  licenseKey: string;
  status: string;
  expiresAt: string;
  plan: {
    displayName: string;
    name: string;
  };
  activations: Array<{
    id: string;
    machineName: string;
    activatedAt: string;
  }>;
}

export default function DownloadsPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingTrial, setCreatingTrial] = useState(false);
  const [trialLicense, setTrialLicense] = useState<License | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLicenses();
  }, []);

  const fetchLicenses = async () => {
    try {
      const data = await subscriptionAPI.licenses();
      setLicenses(data.licenses);
      
      // Check if user has a trial license
      const trial = data.licenses.find((l: License) => l.plan.name === 'trial');
      if (trial) {
        setTrialLicense(trial);
      }
    } catch (err) {
      console.error('Failed to fetch licenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTrialLicense = async () => {
    setCreatingTrial(true);
    setError('');
    
    try {
      const data = await subscriptionAPI.createTrial();
      setTrialLicense(data.license);
      
      // Refresh licenses list
      await fetchLicenses();
    } catch (err: any) {
      if (err.message?.includes('deja')) {
        setError('Vous avez deja une licence d\'essai');
      } else {
        setError('Erreur lors de la creation de la licence');
      }
    } finally {
      setCreatingTrial(false);
    }
  };

  const copyLicenseKey = () => {
    if (trialLicense?.licenseKey) {
      navigator.clipboard.writeText(trialLicense.licenseKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Telechargements</h1>

      {/* Trial License Card */}
      <div className="glass rounded-2xl p-6 mb-6 border border-green-500/20 bg-green-500/5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">Licence d&apos;essai gratuite</h2>
            <p className="text-dark-400 text-sm mb-4">
              10 jours d&apos;acces complet a toutes les fonctionnalites Pro
            </p>

            {loading ? (
              <div className="flex items-center gap-2 text-dark-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Chargement...
              </div>
            ) : trialLicense ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">
                    Licence active - {getDaysRemaining(trialLicense.expiresAt)} jours restants
                  </span>
                </div>
                
                <div className="bg-dark-900/50 rounded-xl p-4">
                  <p className="text-dark-400 text-xs mb-2">Votre cle de licence</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-dark-950 rounded-lg px-3 py-2 text-sm font-mono text-primary-400 break-all">
                      {trialLicense.licenseKey}
                    </code>
                    <button
                      onClick={copyLicenseKey}
                      className="p-2 hover:bg-white/10 rounded-lg transition"
                      title="Copier"
                    >
                      {copied ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-dark-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-dark-500 text-xs mt-2">
                    Expire le {formatDate(trialLicense.expiresAt)}
                  </p>
                </div>

                <div className="p-4 bg-primary-500/10 rounded-xl border border-primary-500/20">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium text-sm">Comment activer votre licence</p>
                      <p className="text-dark-400 text-xs mt-1">
                        Au premier lancement d&apos;ITStock, entrez votre cle de licence ci-dessus. 
                        Votre licence sera automatiquement liee a votre compte.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <button
                  onClick={createTrialLicense}
                  disabled={creatingTrial}
                  className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition"
                >
                  {creatingTrial ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creation en cours...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      Activer mon essai gratuit
                    </>
                  )}
                </button>
                {error && (
                  <p className="text-red-400 text-sm mt-2">{error}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Software Download Card */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1">ITStock CRM</h2>
            <p className="text-dark-400 text-sm mb-4">Version 1.0.0 - Windows 64-bit</p>

            <div className="flex items-center gap-3 mb-4">
              <a
                href="https://releases.nextendo.com/itstock/ITStock-CRM-Setup-1.0.0.exe"
                className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition"
              >
                <Download className="w-4 h-4" />
                Telecharger l&apos;installeur (.exe)
              </a>
              <span className="text-dark-500 text-xs">~85 MB</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-dark-500">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Signe numeriquement</span>
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Notes de version</span>
            </div>
          </div>
        </div>
      </div>

      {/* Installation guide */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Guide d&apos;installation</h3>
        <ol className="space-y-3 text-sm text-dark-300">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
            <span>Telechargez l&apos;installeur et lancez-le</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
            <span>Suivez les instructions d&apos;installation</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
            <span>Au premier lancement, entrez votre cle de licence (disponible ci-dessus)</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
            <span>Connectez-vous avec vos identifiants ITStock</span>
          </li>
        </ol>

        <div className="mt-6 p-4 bg-dark-900/50 rounded-xl">
          <p className="text-dark-400 text-xs">
            <strong className="text-dark-300">Configuration requise :</strong> Windows 10/11 64-bit, 4 GB RAM, 200 MB d&apos;espace disque.
          </p>
        </div>
      </div>
    </div>
  );
}
