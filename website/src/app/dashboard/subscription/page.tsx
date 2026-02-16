'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, ArrowRight, ExternalLink } from 'lucide-react';
import { subscriptionAPI } from '@/lib/api';

export default function SubscriptionPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const data = await subscriptionAPI.me();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const openPortal = async () => {
    try {
      const data = await subscriptionAPI.portal();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Portal error:', err);
    }
  };

  const activeSubscription = subscriptions.find(s => s.status === 'ACTIVE');

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-500/10 text-green-400',
    PAST_DUE: 'bg-yellow-500/10 text-yellow-400',
    CANCELED: 'bg-red-500/10 text-red-400',
    UNPAID: 'bg-red-500/10 text-red-400',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Abonnement</h1>

      {loading ? (
        <div className="text-dark-400">Chargement...</div>
      ) : !activeSubscription ? (
        <div className="glass rounded-2xl p-12 text-center">
          <CreditCard className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Aucun abonnement actif</h2>
          <p className="text-dark-400 mb-6">Choisissez un plan pour commencer a utiliser ITStock.</p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition"
          >
            Voir les plans <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current plan */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Plan {activeSubscription.plan.displayName}</h2>
                <p className="text-dark-500 text-sm">
                  {activeSubscription.billingInterval === 'yearly' ? 'Facturation annuelle' : 'Facturation mensuelle'}
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${statusColors[activeSubscription.status]}`}>
                {activeSubscription.status === 'ACTIVE' ? 'Actif' : activeSubscription.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-dark-900/50 rounded-xl">
                <p className="text-dark-500 text-xs mb-1">Debut de la periode</p>
                <p className="text-white text-sm font-medium">
                  {new Date(activeSubscription.currentPeriodStart).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="p-4 bg-dark-900/50 rounded-xl">
                <p className="text-dark-500 text-xs mb-1">Prochaine facturation</p>
                <p className="text-white text-sm font-medium">
                  {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>

            {activeSubscription.cancelAtPeriodEnd && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                <p className="text-yellow-400 text-sm">
                  Votre abonnement sera annule a la fin de la periode actuelle.
                </p>
              </div>
            )}

            <button
              onClick={openPortal}
              className="inline-flex items-center gap-2 glass hover:bg-white/5 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
            >
              Gerer mon abonnement <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          {/* Subscription history */}
          {subscriptions.length > 1 && (
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Historique</h2>
              <div className="space-y-3">
                {subscriptions.filter(s => s.id !== activeSubscription.id).map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-dark-900/50 rounded-xl">
                    <div>
                      <p className="text-dark-300 text-sm">Plan {sub.plan.displayName}</p>
                      <p className="text-dark-500 text-xs">
                        {new Date(sub.currentPeriodStart).toLocaleDateString('fr-FR')} - {new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${statusColors[sub.status]}`}>
                      {sub.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
