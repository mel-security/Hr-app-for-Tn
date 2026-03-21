'use client';

import { useAuth } from '@/hooks/useAuth';
import { formatMontant, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { STATUT_LABELS, STATUT_COLORS, TYPE_LABELS } from '@/types';
import type { Demande, Echeance } from '@/types';
import { Wallet, TrendingUp, Clock, CalendarDays, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployeeDashboard() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) { router.replace('/dashboard/admin'); return; }
    if (!user) return;
    fetch('/api/demandes?limit=5').then(r => r.json()).then(d => {
      setDemandes(d.demandes || []);
      setLoading(false);
    });
  }, [user, isAdmin]);

  if (loading || isAdmin) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  const encours = user?.encours || 0;
  const capacite = user?.capacite || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.prenom}</h1>
          <p className="text-gray-500 mt-1">Voici un aperçu de votre situation</p>
        </div>
        <Link href="/dashboard/demandes/nouvelle">
          <Button><PlusCircle className="h-4 w-4 mr-2" />Nouvelle demande</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Encours total" value={formatMontant(encours)} icon={Wallet} color="blue" />
        <StatCard title="Capacité restante" value={formatMontant(capacite)} subtitle={`Plafond: ${formatMontant(user?.plafond_credit || 0)}`} icon={TrendingUp} color="green" />
        <StatCard title="Salaire net" value={formatMontant(user?.salaire_net || 0)} icon={CalendarDays} color="yellow" />
        <StatCard title="Total demandes" value={String(demandes.length)} icon={Clock} color="purple" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Demandes récentes</CardTitle>
            <Link href="/dashboard/demandes" className="text-sm text-blue-600 hover:underline">Voir tout</Link>
          </div>
        </CardHeader>
        <CardContent>
          {demandes.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">Aucune demande pour le moment</p>
          ) : (
            <div className="space-y-3">
              {demandes.slice(0, 5).map((d) => (
                <Link key={d.id} href={`/dashboard/demandes/${d.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{TYPE_LABELS[d.type]} - {formatMontant(d.montant)}</p>
                    <p className="text-xs text-gray-500">{formatDate(d.created_at)}</p>
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
    </div>
  );
}
