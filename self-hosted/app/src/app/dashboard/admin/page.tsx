'use client';

import { useAuth } from '@/hooks/useAuth';
import { formatMontant } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import type { AdminStats } from '@/types';
import { FileText, CheckCircle, XCircle, Wallet, AlertTriangle, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminStats {
  total_demandes_en_attente: number;
  total_demandes_validees: number;
  total_demandes_refusees: number;
  encours_global: number;
  montant_a_recouvrer: number;
  echeances_en_retard: number;
  total_employes: number;
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !isAdmin) { router.replace('/dashboard'); return; }
    if (user && isAdmin) {
      fetch('/api/admin/stats').then(r => r.json()).then(d => {
        setStats(d.stats);
        setLoading(false);
      });
    }
  }, [user, isAdmin]);

  if (loading || !stats) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-500 mt-1">Vue d&apos;ensemble de la gestion des crédits</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Demandes en attente" value={String(stats.total_demandes_en_attente)} icon={FileText} color="yellow" />
        <StatCard title="Demandes validées" value={String(stats.total_demandes_validees)} icon={CheckCircle} color="green" />
        <StatCard title="Demandes refusées" value={String(stats.total_demandes_refusees)} icon={XCircle} color="red" />
        <StatCard title="Encours global" value={formatMontant(stats.encours_global)} icon={Wallet} color="blue" />
        <StatCard title="À recouvrer ce mois" value={formatMontant(stats.montant_a_recouvrer)} subtitle={`${stats.echeances_en_retard} échéance(s) en retard`} icon={AlertTriangle} color="red" />
        <StatCard title="Employés actifs" value={String(stats.total_employes)} icon={Users} color="purple" />
      </div>
    </div>
  );
}
