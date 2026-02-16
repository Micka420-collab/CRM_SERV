'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Key, CreditCard, Monitor, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { subscriptionAPI } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [licenses, setLicenses] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    // Handle checkout redirect from registration
    const checkoutPlan = searchParams.get('checkout');
    const interval = searchParams.get('interval') || 'monthly';
    if (checkoutPlan) {
      handleCheckout(checkoutPlan, interval);
    }
  }, [searchParams]);

  const loadData = async () => {
    try {
      const [licData, subData] = await Promise.all([
        subscriptionAPI.licenses(),
        subscriptionAPI.me()
      ]);
      setLicenses(licData.licenses || []);
      setSubscriptions(subData.subscriptions || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (planName: string, interval: string) => {
    try {
      const data = await subscriptionAPI.checkout(planName, interval);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  const activeLicenses = licenses.filter(l => l.status === 'ACTIVE');
  const activeSubscription = subscriptions.find(s => s.status === 'ACTIVE');

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Tableau de bord</h1>

      {loading ? (
        <div className="text-dark-400">Chargement...</div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                  <Key className="w-5 h-5 text-primary-400" />
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Licences actives</p>
                  <p className="text-2xl font-bold text-white">{activeLicenses.length}</p>
                </div>
              </div>
              <Link href="/dashboard/licenses" className="text-primary-400 text-sm hover:underline flex items-center gap-1">
                Voir les details <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Abonnement</p>
                  <p className="text-2xl font-bold text-white">
                    {activeSubscription ? activeSubscription.plan.displayName : 'Aucun'}
                  </p>
                </div>
              </div>
              {activeSubscription ? (
                <p className="text-dark-500 text-xs">
                  Renouvellement le {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString('fr-FR')}
                </p>
              ) : (
                <Link href="/pricing" className="text-primary-400 text-sm hover:underline flex items-center gap-1">
                  Choisir un plan <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <p className="text-dark-400 text-sm">Postes actives</p>
                  <p className="text-2xl font-bold text-white">
                    {activeLicenses.reduce((sum, l) => sum + (l.activations?.length || 0), 0)}
                    <span className="text-dark-500 text-sm font-normal">
                      /{activeLicenses.reduce((sum, l) => sum + l.maxActivations, 0)}
                    </span>
                  </p>
                </div>
              </div>
              <p className="text-dark-500 text-xs">Machines avec ITStock installe</p>
            </div>
          </div>

          {/* Recent licenses */}
          {activeLicenses.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Vos licences</h2>
              <div className="space-y-3">
                {activeLicenses.slice(0, 5).map((license) => (
                  <div key={license.id} className="flex items-center justify-between p-4 bg-dark-900/50 rounded-xl">
                    <div>
                      <p className="text-white font-mono text-sm">
                        {license.licenseKey.substring(0, 15)}...
                      </p>
                      <p className="text-dark-500 text-xs mt-1">
                        Plan {license.plan.displayName} - {license.activations?.length || 0}/{license.maxActivations} postes
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                      Actif
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No subscription CTA */}
          {!activeSubscription && activeLicenses.length === 0 && (
            <div className="glass rounded-2xl p-12 text-center">
              <Key className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Aucune licence active</h2>
              <p className="text-dark-400 mb-6">
                Souscrivez a un plan pour obtenir votre cle de licence et commencer a utiliser ITStock CRM.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition"
              >
                Voir les plans <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
