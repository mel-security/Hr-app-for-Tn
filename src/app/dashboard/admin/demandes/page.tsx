'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatMontant, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { STATUT_LABELS, STATUT_COLORS, TYPE_LABELS } from '@/types';
import type { Demande, Profile } from '@/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminDemandesPage() {
  const { profile, isAdmin } = useAuth();
  const supabase = createClient();
  const [demandes, setDemandes] = useState<(Demande & { employe: Profile })[]>([]);
  const [filtre, setFiltre] = useState<string>('en_attente');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !isAdmin) return;
    loadDemandes();
  }, [profile, isAdmin, filtre]);

  async function loadDemandes() {
    let query = supabase
      .from('demandes')
      .select('*, employe:profiles!employe_id(*)')
      .order('created_at', { ascending: false });

    if (filtre !== 'tous') {
      query = query.eq('statut', filtre);
    }

    const { data } = await query;
    setDemandes((data as any) || []);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des demandes</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des demandes</CardTitle>
            <Select
              value={filtre}
              onChange={(e) => { setFiltre(e.target.value); setLoading(true); }}
              className="w-48"
            >
              <option value="tous">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="validee">Validées</option>
              <option value="refusee">Refusées</option>
              <option value="remboursee">Remboursées</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : demandes.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">Aucune demande trouvée</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Employé</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Type</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Montant</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">Mensualités</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">Statut</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map((d) => (
                    <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-600">{formatDate(d.created_at)}</td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">{d.employe?.prenom} {d.employe?.nom}</p>
                          <p className="text-xs text-gray-500">{d.employe?.matricule || d.employe?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">{TYPE_LABELS[d.type]}</td>
                      <td className="py-3 px-2 text-right font-medium">{formatMontant(d.montant)}</td>
                      <td className="py-3 px-2 text-center">{d.nombre_mensualites}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[d.statut]}`}>
                          {STATUT_LABELS[d.statut]}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Link
                          href={`/dashboard/admin/demandes/${d.id}`}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Traiter
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
