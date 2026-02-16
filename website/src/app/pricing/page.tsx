'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Monitor, Check, ArrowRight, Star, Download } from 'lucide-react';

const plans = [
  {
    name: 'basic',
    displayName: 'Basic',
    description: 'Pour les petites equipes IT',
    seats: '1-5 postes',
    monthlyPrice: 29,
    yearlyPrice: 290,
    popular: false,
    features: [
      'Gestion d\'inventaire IT',
      'Suivi des prets PC',
      'Historique des actions',
      'Support par email',
      'Jusqu\'a 5 postes',
    ],
  },
  {
    name: 'pro',
    displayName: 'Pro',
    description: 'Pour les equipes en croissance',
    seats: '6-20 postes',
    monthlyPrice: 59,
    yearlyPrice: 590,
    popular: true,
    features: [
      'Tout le plan Basic',
      'Gestion de telephonie',
      'Rapports avances',
      'Export Excel/PDF',
      'Support prioritaire',
      'Jusqu\'a 20 postes',
    ],
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'Pour les grandes organisations',
    seats: 'Postes illimites',
    monthlyPrice: 99,
    yearlyPrice: 990,
    popular: false,
    features: [
      'Tout le plan Pro',
      'Postes illimites',
      'Acces API',
      'Support dedie',
      'Formation incluse',
      'SLA garanti',
    ],
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ITStock</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-dark-300 hover:text-white transition text-sm">
              Connexion
            </Link>
            <Link href="/auth/register" className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              Creer un compte
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black mb-4">
              Des tarifs <span className="gradient-text">simples et transparents</span>
            </h1>
            <p className="text-dark-400 text-lg max-w-2xl mx-auto">
              Choisissez le plan adapte a la taille de votre equipe.
              Licences par poste, sans surprises.
            </p>
          </div>

          {/* Trial Banner */}
          <div className="glass rounded-2xl p-6 mb-8 max-w-3xl mx-auto border border-green-500/20 bg-green-500/5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Download className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Essayez avant d&apos;acheter</p>
                  <p className="text-dark-400 text-sm">10 jours d&apos;essai gratuit avec toutes les fonctionnalites</p>
                </div>
              </div>
              <Link
                href="/#download"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition whitespace-nowrap"
              >
                Telecharger <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm ${!isYearly ? 'text-white font-medium' : 'text-dark-400'}`}>Mensuel</span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-14 h-7 rounded-full transition ${isYearly ? 'bg-primary-500' : 'bg-dark-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${isYearly ? 'translate-x-7' : ''}`} />
            </button>
            <span className={`text-sm ${isYearly ? 'text-white font-medium' : 'text-dark-400'}`}>
              Annuel <span className="text-green-400 text-xs font-medium ml-1">-17%</span>
            </span>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`glass rounded-2xl p-8 relative flex flex-col ${
                  plan.popular ? 'border-primary-500/30 ring-1 ring-primary-500/20' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      <Star className="w-3 h-3" /> Populaire
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1">{plan.displayName}</h3>
                  <p className="text-dark-400 text-sm">{plan.description}</p>
                  <p className="text-dark-500 text-xs mt-1">{plan.seats}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">
                      {isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-dark-400 text-sm">EUR</span>
                    <span className="text-dark-500 text-sm">/{isYearly ? 'an' : 'mois'}</span>
                  </div>
                  {isYearly && (
                    <p className="text-dark-500 text-xs mt-1">
                      soit {Math.round(plan.yearlyPrice / 12)} EUR/mois
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <Check className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                      <span className="text-dark-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/auth/register?plan=${plan.name}&interval=${isYearly ? 'yearly' : 'monthly'}`}
                  className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition ${
                    plan.popular
                      ? 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                      : 'glass hover:bg-white/5 text-white'
                  }`}
                >
                  Commencer <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>

          {/* FAQ / Info */}
          <div className="text-center mt-16 text-dark-400 text-sm">
            <p>Toutes les licences incluent l&apos;installation locale, les mises a jour, et le support.</p>
            <p className="mt-2">Besoin d&apos;une solution sur mesure ? <Link href="mailto:contact@nextendo.com" className="text-primary-400 hover:underline">Contactez-nous</Link></p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">ITStock</span>
            <span className="text-dark-500 text-xs">by Nextendo</span>
          </div>
          <p className="text-dark-500 text-xs">&copy; 2026 Nextendo. Tous droits reserves.</p>
        </div>
      </footer>
    </div>
  );
}
