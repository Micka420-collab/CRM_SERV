import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ITStock by Nextendo - Gestion d\'inventaire IT',
  description: 'La solution complete de gestion d\'inventaire IT, de prets PC, et de suivi telephonique pour les equipes modernes.',
  keywords: ['IT', 'inventaire', 'CRM', 'gestion', 'prets PC', 'nextendo', 'itstock'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-dark-950 text-dark-50 antialiased">
        {children}
      </body>
    </html>
  );
}
