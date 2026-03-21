'use client';

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Clock,
  Users,
  Download,
  LogOut,
  Menu,
  X,
  CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export function Sidebar() {
  const { profile, signOut, isAdmin } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const employeLinks = [
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/dashboard/demandes/nouvelle', label: 'Nouvelle demande', icon: PlusCircle },
    { href: '/dashboard/demandes', label: 'Mes demandes', icon: FileText },
  ];

  const adminLinks = [
    { href: '/dashboard/admin', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/dashboard/admin/demandes', label: 'Demandes', icon: FileText },
    { href: '/dashboard/admin/employes', label: 'Employés', icon: Users },
    { href: '/dashboard/admin/echeancier', label: 'Échéancier', icon: CalendarDays },
    { href: '/dashboard/admin/export', label: 'Export', icon: Download },
  ];

  const links = isAdmin ? adminLinks : employeLinks;

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">HR Crédit</h1>
        <p className="text-xs text-gray-500 mt-1">Gestion des avances</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-gray-900">
            {profile?.prenom} {profile?.nom}
          </p>
          <p className="text-xs text-gray-500">{profile?.email}</p>
          <p className="text-xs text-blue-600 capitalize mt-0.5">
            {isAdmin ? 'Administrateur' : 'Employé'}
          </p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
