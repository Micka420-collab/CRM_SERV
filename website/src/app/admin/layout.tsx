'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Key, 
  Users, 
  ShieldCheck, 
  ChevronRight,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { authAPI } from '@/lib/api';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [router]);

  const checkAdmin = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    try {
      const data = await authAPI.me();
      if (data.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      setIsAdmin(true);
    } catch (err) {
      console.error('Admin check failed:', err);
      router.push('/auth/login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/auth/login');
  };

  if (isAdmin === null) {
    return <div className="min-h-screen bg-dark-950 flex items-center justify-center text-dark-400">Verification...</div>;
  }

  const navItems = [
    { label: 'Tableau de bord', href: '/admin', icon: LayoutDashboard },
    { label: 'Licences', href: '/admin/licenses', icon: Key },
    { label: 'Utilisateurs', href: '/admin/users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Sidebar Desktop */}
      <aside className="w-64 border-r border-white/5 bg-dark-900/50 hidden md:flex flex-col">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold tracking-tight">ITStock Admin</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition text-sm ${
                  isActive 
                    ? 'bg-primary-500/10 text-primary-400 font-medium' 
                    : 'text-dark-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
                {isActive && <ChevronRight className="w-3 h-3" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-dark-400 hover:bg-red-500/10 hover:text-red-400 transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            Deconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-dark-900/80 backdrop-blur-md border-b border-white/5 px-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary-500" />
          <span className="text-white font-bold">Admin</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-dark-400"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-dark-950 z-40 pt-20 px-4">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-4 rounded-xl text-white bg-white/5"
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-4 rounded-xl text-red-400 bg-red-500/10"
            >
              <LogOut className="w-5 h-5" />
              Deconnexion
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-8 pt-24 md:pt-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
