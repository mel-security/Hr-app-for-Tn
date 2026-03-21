'use client';

import { useAuth } from '@/hooks/useAuth';
import { formatMontant, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { ECHEANCE_STATUT_LABELS, ECHEANCE_STATUT_COLORS } from '@/types';
import type { Echeance } from '@/types';
import { useEffect, useState } from 'react';

export default function AdminEcheancierPage() {
  const { user, isAdmin } = useAuth();
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [filtre, setFiltre] = useState('a_venir');
  const [loading, setLoading] = useState(true);

  function loadData() {
    setLoading(true);
    fetch(`/api/admin/echeancier?statut=${filtre}`).then(r => r.json()).then(d => {
      setEcheances(d.echeances || []);
      setLoading(false);
    });
  }

  useEffect(() => { if (user && isAdmin) loadData(); }, [user, isAdmin, filtre]);

  async function marquerPayee(id: string) {
    await fetch('/api/admin/echeancier', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadData();
  }

  const total = echeances.reduce((s, e) => s + Number(e.montant), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Échéancier global</h1>
        <p className="text-gray-500 mt-1">Suivi des remboursements</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Échéances</CardTitle><p className="text-sm text-gray-500 mt-1">Total : {formatMontant(total)} ({echeances.length})</p></div>
            <Select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="w-48">
              <option value="tous">Tous</option><option value="a_venir">À venir</option><option value="payee">Payées</option><option value="en_retard">En retard</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          : echeances.length === 0 ? <p className="text-gray-500 text-sm py-8 text-center">Aucune échéance</p>
          : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
              <th className="text-left py-3 px-2 font-medium text-gray-500">Employé</th>
              <th className="text-center py-3 px-2 font-medium text-gray-500">N°</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">Montant</th>
              <th className="text-center py-3 px-2 font-medium text-gray-500">Statut</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">Action</th>
            </tr></thead><tbody>
              {echeances.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2">{formatDate(e.date_echeance)}</td>
                  <td className="py-3 px-2 font-medium">{e.employe_prenom} {e.employe_nom}</td>
                  <td className="py-3 px-2 text-center">{e.numero}</td>
                  <td className="py-3 px-2 text-right font-medium">{formatMontant(e.montant)}</td>
                  <td className="py-3 px-2 text-center"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ECHEANCE_STATUT_COLORS[e.statut]}`}>{ECHEANCE_STATUT_LABELS[e.statut]}</span></td>
                  <td className="py-3 px-2 text-right">{e.statut !== 'payee' && <button onClick={() => marquerPayee(e.id)} className="text-green-600 hover:underline text-xs">Marquer payée</button>}</td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
