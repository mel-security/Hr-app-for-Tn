'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatMontant, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import type { Echeance, Profile } from '@/types';
import { useEffect, useState } from 'react';

interface EcheanceAvecEmploye extends Echeance {
  employe: Profile;
}

export default function AdminEcheancierPage() {
  const { profile, isAdmin } = useAuth();
  const supabase = createClient();
  const [echeances, setEcheances] = useState<EcheanceAvecEmploye[]>([]);
  const [filtre, setFiltre] = useState('a_venir');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || !isAdmin) return;
    loadEcheances();
  }, [profile, isAdmin, filtre]);

  async function loadEcheances() {
    let query = supabase
      .from('echeances')
      .select('*, employe:profiles!employe_id(*)')
      .order('date_echeance', { ascending: true });

    if (filtre !== 'tous') {
      query = query.eq('statut', filtre);
    }

    const { data } = await query;
    setEcheances((data as any) || []);
    setLoading(false);
  }

  async function marquerPayee(id: string) {
    await supabase
      .from('echeances')
      .update({
        statut: 'payee',
        date_paiement: new Date().toISOString().split('T')[0],
      })
      .eq('id', id);
    loadEcheances();
  }

  const totalMontant = echeances.reduce((sum, e) => sum + Number(e.montant), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Échéancier global</h1>
        <p className="text-gray-500 mt-1">Suivi des remboursements</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Échéances</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Total : {formatMontant(totalMontant)} ({echeances.length} échéances)
              </p>
            </div>
            <Select
              value={filtre}
              onChange={(e) => { setFiltre(e.target.value); setLoading(true); }}
              className="w-48"
            >
              <option value="tous">Tous les statuts</option>
              <option value="a_venir">À venir</option>
              <option value="payee">Payées</option>
              <option value="en_retard">En retard</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : echeances.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">Aucune échéance trouvée</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Employé</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">N°</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Montant</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">Statut</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {echeances.map((e) => {
                    const statutColors = {
                      a_venir: 'bg-gray-100 text-gray-700',
                      payee: 'bg-green-100 text-green-700',
                      en_retard: 'bg-red-100 text-red-700',
                    };
                    const statutLabels = {
                      a_venir: 'À venir',
                      payee: 'Payée',
                      en_retard: 'En retard',
                    };

                    return (
                      <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">{formatDate(e.date_echeance)}</td>
                        <td className="py-3 px-2">
                          <p className="font-medium">{e.employe?.prenom} {e.employe?.nom}</p>
                        </td>
                        <td className="py-3 px-2 text-center">{e.numero}</td>
                        <td className="py-3 px-2 text-right font-medium">{formatMontant(e.montant)}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statutColors[e.statut]}`}>
                            {statutLabels[e.statut]}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          {e.statut !== 'payee' && (
                            <button
                              onClick={() => marquerPayee(e.id)}
                              className="text-green-600 hover:underline text-xs"
                            >
                              Marquer payée
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
