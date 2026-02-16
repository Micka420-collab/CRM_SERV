import Link from 'next/link';
import { Monitor, Laptop, Smartphone, BarChart3, Shield, Users, ArrowRight, CheckCircle, Download, Gift, Calendar } from 'lucide-react';

const features = [
  {
    icon: Monitor,
    title: 'Gestion d\'inventaire',
    description: 'Suivez tous vos equipements IT avec QR codes, alertes de stock bas, et import/export CSV.'
  },
  {
    icon: Laptop,
    title: 'Prets PC',
    description: 'Gerez les prets et retours de PC avec calendrier interactif et reservations.'
  },
  {
    icon: Smartphone,
    title: 'Flotte telephonique',
    description: 'Suivez vos telephones mobiles, attributions par employe et departement.'
  },
  {
    icon: BarChart3,
    title: 'Rapports avances',
    description: 'Tableaux de bord en temps reel, graphiques de consommation et exports PDF.'
  },
  {
    icon: Shield,
    title: 'Securite',
    description: '30+ permissions granulaires, audit des actions, protection anti-bruteforce.'
  },
  {
    icon: Users,
    title: 'Multi-utilisateurs',
    description: 'Roles personnalises (Lecteur, Hotliner, Technicien, Admin) avec droits granulaires.'
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ITStock</span>
            <span className="text-xs text-dark-400 hidden sm:inline">by Nextendo</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-dark-300 hover:text-white transition text-sm">
              Tarifs
            </Link>
            <Link href="/auth/login" className="text-dark-300 hover:text-white transition text-sm">
              Connexion
            </Link>
            <Link href="/pricing" className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5 mb-8">
            <span className="text-primary-400 text-sm font-medium">Nouveau : Abonnements par poste disponibles</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            Gerez votre parc IT{' '}
            <span className="gradient-text">sans effort</span>
          </h1>

          <p className="text-lg text-dark-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            ITStock est la solution complete de gestion d&apos;inventaire IT.
            Inventaire, prets PC, flotte telephonique, et rapports — tout
            dans un seul logiciel.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pricing" className="inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-8 py-3.5 rounded-xl font-semibold transition shadow-lg shadow-primary-500/25">
              Voir les tarifs <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 glass hover:bg-white/5 text-white px-8 py-3.5 rounded-xl font-semibold transition">
              Creer un compte gratuit
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tout ce dont votre equipe IT a besoin
            </h2>
            <p className="text-dark-400 text-lg max-w-2xl mx-auto">
              Un outil complet pour gerer l&apos;ensemble de votre parc informatique,
              de l&apos;inventaire au suivi des prets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="glass rounded-2xl p-6 hover:border-primary-500/20 transition group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mb-4 group-hover:from-primary-500/30 group-hover:to-accent-500/30 transition">
                    <Icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
                  <p className="text-dark-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Download Trial Section */}
      <section className="py-20 px-6" id="download">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-1.5 mb-6">
              <Gift className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-medium">10 jours d&apos;essai gratuit</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Telechargez et testez <span className="gradient-text">gratuitement</span>
            </h2>
            <p className="text-dark-400 text-lg max-w-2xl mx-auto">
              Essayez ITStock CRM pendant 10 jours sans engagement. Toutes les fonctionnalites Pro incluses.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Download Card */}
            <div className="glass rounded-2xl p-8 border border-primary-500/20">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                  <Monitor className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">ITStock CRM</h3>
                  <p className="text-dark-400 text-sm">Version 1.0.0 - Windows 64-bit</p>
                </div>
              </div>

              <ul className="space-y-3 mb-6 text-sm text-dark-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Acces complet pendant 10 jours</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Toutes les fonctionnalites Pro</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>1 poste inclus</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>Sans carte bancaire</span>
                </li>
              </ul>

              <a
                href="https://releases.nextendo.com/itstock/ITStock-CRM-Setup-1.0.0.exe"
                className="w-full inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3.5 rounded-xl font-semibold transition shadow-lg shadow-primary-500/25"
              >
                <Download className="w-5 h-5" />
                Telecharger l&apos;installeur (.exe)
              </a>
              <p className="text-center text-dark-500 text-xs mt-3">~85 MB • Windows 10/11 64-bit</p>
            </div>

            {/* Trial Info Card */}
            <div className="glass rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-400" />
                Comment ca marche ?
              </h3>

              <ol className="space-y-4">
                <li className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">1</span>
                  <div>
                    <p className="text-white font-medium">Telechargez le logiciel</p>
                    <p className="text-dark-400 text-sm">Cliquez sur le bouton de telechargement ci-contre</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">2</span>
                  <div>
                    <p className="text-white font-medium">Installez ITStock</p>
                    <p className="text-dark-400 text-sm">Lancez l&apos;installeur et suivez les instructions</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">3</span>
                  <div>
                    <p className="text-white font-medium">Creez votre compte</p>
                    <p className="text-dark-400 text-sm">Inscrivez-vous pour obtenir votre licence d&apos;essai</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">4</span>
                  <div>
                    <p className="text-white font-medium">Testez gratuitement</p>
                    <p className="text-dark-400 text-sm">Profitez de 10 jours d&apos;acces complet</p>
                  </div>
                </li>
              </ol>

              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-dark-400 text-xs">
                  <strong className="text-dark-300">Configuration requise :</strong> Windows 10/11 64-bit, 4 GB RAM, 200 MB d&apos;espace disque.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto glass rounded-3xl p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5" />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">Pret a simplifier votre gestion IT ?</h2>
            <p className="text-dark-400 mb-8 max-w-lg mx-auto">
              Rejoignez les equipes qui font confiance a ITStock pour gerer leur parc informatique.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing" className="inline-flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-8 py-3.5 rounded-xl font-semibold transition shadow-lg shadow-primary-500/25">
                Choisir un plan <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="flex justify-center gap-8 mt-8 text-sm text-dark-400">
              <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Installation locale</span>
              <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Donnees securisees</span>
              <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Support reactif</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Monitor className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">ITStock</span>
            <span className="text-dark-500 text-sm">by Nextendo</span>
          </div>
          <div className="flex gap-6 text-sm text-dark-400">
            <Link href="/pricing" className="hover:text-white transition">Tarifs</Link>
            <Link href="/auth/login" className="hover:text-white transition">Connexion</Link>
          </div>
          <p className="text-dark-500 text-sm">&copy; 2026 Nextendo. Tous droits reserves.</p>
        </div>
      </footer>
    </div>
  );
}
