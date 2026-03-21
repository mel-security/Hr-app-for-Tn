'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatMontant, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { STATUT_LABELS, STATUT_COLORS, TYPE_LABELS } from '@/types';
import type { Demande, StatutDemande } from '@/types';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function MesDemandesPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [filtre, setFiltre] = useState<string>('tous');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadDemandes();
  }, [profile, filtre]);

  async function loadDemandes() {
    if (!profile) return;
    let query = supabase
      .from('demandes')
      .select('*')
      .eq('employe_id', profile.id)
      .order('created_at', { ascending: false });

    if (filtre !== 'tous') {
      query = query.eq('statut', filtre);
    }

    const { data } = await query;
    setDemandes(data || []);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes demandes</h1>
        <Link href="/dashboard/demandes/nouvelle">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Nouvelle demande
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Historique des demandes</CardTitle>
            <Select
              value={filtre}
              onChange={(e) => setFiltre(e.target.value)}
              className="w-48"
            >
              <option value="tous">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="validee">Validée</option>
              <option value="refusee">Refusée</option>
              <option value="remboursee">Remboursée</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : demandes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Aucune demande trouvée</p>
              <Link href="/dashboard/demandes/nouvelle" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
                Faire une nouvelle demande
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Type</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Montant</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">Mensualités</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Mensualité</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">Statut</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map((d) => (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-600">{formatDate(d.created_at)}</td>
                      <td className="py-3 px-2">{TYPE_LABELS[d.type]}</td>
                      <td className="py-3 px-2 text-right font-medium">{formatMontant(d.montant)}</td>
                      <td className="py-3 px-2 text-center">{d.nombre_mensualites}</td>
                      <td className="py-3 px-2 text-right">{d.mensualite ? formatMontant(d.mensualite) : '-'}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[d.statut]}`}>
                          {STATUT_LABELS[d.statut]}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Link href={`/dashboard/demandes/${d.id}`} className="text-blue-600 hover:underline text-xs">
                          Détails
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
