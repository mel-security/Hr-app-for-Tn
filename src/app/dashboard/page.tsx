'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatMontant, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { STATUT_LABELS, STATUT_COLORS, TYPE_LABELS } from '@/types';
import type { Demande, Echeance } from '@/types';
import {
  Wallet,
  TrendingUp,
  Clock,
  CalendarDays,
  PlusCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployeeDashboard() {
  const { profile, isAdmin } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [encours, setEncours] = useState(0);
  const [capacite, setCapacite] = useState(0);
  const [recentDemandes, setRecentDemandes] = useState<Demande[]>([]);
  const [prochaines, setProchaines] = useState<Echeance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      router.replace('/dashboard/admin');
      return;
    }
    if (!profile) return;
    loadData();
  }, [profile, isAdmin]);

  async function loadData() {
    if (!profile) return;

    // Load encours
    const { data: encoursData } = await supabase.rpc('get_encours_employe', {
      p_employe_id: profile.id,
    });
    setEncours(encoursData || 0);

    // Load capacite
    const { data: capaciteData } = await supabase.rpc('get_capacite_credit', {
      p_employe_id: profile.id,
    });
    setCapacite(capaciteData || 0);

    // Recent demandes
    const { data: demandes } = await supabase
      .from('demandes')
      .select('*')
      .eq('employe_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentDemandes(demandes || []);

    // Prochaines échéances
    const { data: echeances } = await supabase
      .from('echeances')
      .select('*')
      .eq('employe_id', profile.id)
      .eq('statut', 'a_venir')
      .order('date_echeance', { ascending: true })
      .limit(5);
    setProchaines(echeances || []);

    setLoading(false);
  }

  if (loading || isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const mensualitesRestantes = prochaines.length;
  const prochaineMensualite = prochaines[0]?.montant || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {profile?.prenom}
          </h1>
          <p className="text-gray-500 mt-1">Voici un aperçu de votre situation</p>
        </div>
        <Link href="/dashboard/demandes/nouvelle">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Nouvelle demande
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Encours total"
          value={formatMontant(encours)}
          icon={Wallet}
          color="blue"
        />
        <StatCard
          title="Capacité restante"
          value={formatMontant(capacite)}
          subtitle={`Plafond: ${formatMontant(profile?.plafond_credit || 0)}`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Prochaine mensualité"
          value={formatMontant(prochaineMensualite)}
          subtitle={prochaines[0] ? formatDate(prochaines[0].date_echeance) : 'Aucune'}
          icon={CalendarDays}
          color="yellow"
        />
        <StatCard
          title="Mensualités restantes"
          value={String(mensualitesRestantes)}
          icon={Clock}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demandes récentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Demandes récentes</CardTitle>
              <Link href="/dashboard/demandes" className="text-sm text-blue-600 hover:underline">
                Voir tout
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentDemandes.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">
                Aucune demande pour le moment
              </p>
            ) : (
              <div className="space-y-3">
                {recentDemandes.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dashboard/demandes/${d.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {TYPE_LABELS[d.type]} - {formatMontant(d.montant)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(d.created_at)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[d.statut]}`}>
                      {STATUT_LABELS[d.statut]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prochaines échéances */}
        <Card>
          <CardHeader>
            <CardTitle>Prochaines échéances</CardTitle>
          </CardHeader>
          <CardContent>
            {prochaines.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">
                Aucune échéance à venir
              </p>
            ) : (
              <div className="space-y-3">
                {prochaines.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Échéance n°{e.numero}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(e.date_echeance)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatMontant(e.montant)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
