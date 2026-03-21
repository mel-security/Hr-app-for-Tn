'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatMontant } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminStats } from '@/types';
import {
  FileText,
  CheckCircle,
  XCircle,
  Wallet,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const { profile, isAdmin } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && !isAdmin) {
      router.replace('/dashboard');
      return;
    }
    if (profile && isAdmin) {
      loadStats();
    }
  }, [profile, isAdmin]);

  async function loadStats() {
    // Demandes en attente
    const { count: enAttente } = await supabase
      .from('demandes')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'en_attente');

    // Demandes validées
    const { count: validees } = await supabase
      .from('demandes')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'validee');

    // Demandes refusées
    const { count: refusees } = await supabase
      .from('demandes')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'refusee');

    // Encours global (échéances non payées des demandes validées)
    const { data: encoursData } = await supabase
      .from('echeances')
      .select('montant')
      .in('statut', ['a_venir', 'en_retard']);

    const encoursGlobal = (encoursData || []).reduce((sum, e) => sum + Number(e.montant), 0);

    // Échéances en retard
    const { count: enRetard } = await supabase
      .from('echeances')
      .select('*', { count: 'exact', head: true })
      .eq('statut', 'en_retard');

    // Total employés actifs
    const { count: totalEmployes } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'employe')
      .eq('actif', true);

    // Montant à recouvrer ce mois
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const { data: recouvrerData } = await supabase
      .from('echeances')
      .select('montant')
      .gte('date_echeance', startOfMonth)
      .lte('date_echeance', endOfMonth)
      .in('statut', ['a_venir', 'en_retard']);

    const montantRecouvrer = (recouvrerData || []).reduce((sum, e) => sum + Number(e.montant), 0);

    setStats({
      total_demandes_en_attente: enAttente || 0,
      total_demandes_validees: validees || 0,
      total_demandes_refusees: refusees || 0,
      encours_global: encoursGlobal,
      montant_a_recouvrer: montantRecouvrer,
      echeances_en_retard: enRetard || 0,
      total_employes: totalEmployes || 0,
    });

    setLoading(false);
  }

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-500 mt-1">Vue d&apos;ensemble de la gestion des crédits</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Demandes en attente"
          value={String(stats.total_demandes_en_attente)}
          icon={FileText}
          color="yellow"
        />
        <StatCard
          title="Demandes validées"
          value={String(stats.total_demandes_validees)}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Demandes refusées"
          value={String(stats.total_demandes_refusees)}
          icon={XCircle}
          color="red"
        />
        <StatCard
          title="Encours global"
          value={formatMontant(stats.encours_global)}
          icon={Wallet}
          color="blue"
        />
        <StatCard
          title="À recouvrer ce mois"
          value={formatMontant(stats.montant_a_recouvrer)}
          subtitle={`${stats.echeances_en_retard} échéance(s) en retard`}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Employés actifs"
          value={String(stats.total_employes)}
          icon={Users}
          color="purple"
        />
      </div>
    </div>
  );
}
