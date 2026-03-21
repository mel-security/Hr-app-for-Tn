'use client';

import { useAuth } from '@/hooks/useAuth';
import { formatMontant, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { STATUT_LABELS, STATUT_COLORS, TYPE_LABELS } from '@/types';
import type { Demande } from '@/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminDemandesPage() {
  const { user, isAdmin } = useAuth();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [filtre, setFiltre] = useState('en_attente');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin) return;
    setLoading(true);
    fetch(`/api/admin/demandes?statut=${filtre}`).then(r => r.json()).then(d => {
      setDemandes(d.demandes || []);
      setLoading(false);
    });
  }, [user, isAdmin, filtre]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gestion des demandes</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des demandes</CardTitle>
            <Select value={filtre} onChange={(e) => setFiltre(e.target.value)} className="w-48">
              <option value="tous">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="validee">Validées</option>
              <option value="refusee">Refusées</option>
              <option value="remboursee">Remboursées</option>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          : demandes.length === 0 ? <p className="text-gray-500 text-sm py-8 text-center">Aucune demande</p>
          : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
              <th className="text-left py-3 px-2 font-medium text-gray-500">Employé</th>
              <th className="text-left py-3 px-2 font-medium text-gray-500">Type</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">Montant</th>
              <th className="text-center py-3 px-2 font-medium text-gray-500">Statut</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500"></th>
            </tr></thead><tbody>
              {demandes.map((d) => (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 text-gray-600">{formatDate(d.created_at)}</td>
                  <td className="py-3 px-2"><p className="font-medium">{d.employe_prenom} {d.employe_nom}</p><p className="text-xs text-gray-500">{d.employe_matricule || d.employe_email}</p></td>
                  <td className="py-3 px-2">{TYPE_LABELS[d.type]}</td>
                  <td className="py-3 px-2 text-right font-medium">{formatMontant(d.montant)}</td>
                  <td className="py-3 px-2 text-center"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUT_COLORS[d.statut]}`}>{STATUT_LABELS[d.statut]}</span></td>
                  <td className="py-3 px-2 text-right"><Link href={`/dashboard/admin/demandes/${d.id}`} className="text-blue-600 hover:underline text-xs">Traiter</Link></td>
                </tr>
              ))}
            </tbody></table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
