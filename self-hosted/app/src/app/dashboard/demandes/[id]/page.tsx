'use client';

import { useAuth } from '@/hooks/useAuth';
import { formatMontant, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { STATUT_LABELS, STATUT_COLORS, TYPE_LABELS, ECHEANCE_STATUT_LABELS, ECHEANCE_STATUT_COLORS } from '@/types';
import type { Demande, Echeance } from '@/types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function DemandeDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const [demande, setDemande] = useState<Demande | null>(null);
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/admin/demandes?id=${params.id}`).then(r => r.json()).then(d => {
      setDemande(d.demande);
      setEcheances(d.echeances || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!demande) return <div className="text-center py-16"><p className="text-gray-500">Demande non trouvée</p></div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard/demandes" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" />Retour
      </Link>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Détail de la demande</CardTitle>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUT_COLORS[demande.statut]}`}>{STATUT_LABELS[demande.statut]}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><p className="text-sm text-gray-500">Type</p><p className="font-medium">{TYPE_LABELS[demande.type]}</p></div>
            <div><p className="text-sm text-gray-500">Date</p><p className="font-medium">{formatDate(demande.created_at)}</p></div>
            <div><p className="text-sm text-gray-500">Montant</p><p className="font-bold text-lg text-blue-600">{formatMontant(demande.montant)}</p></div>
            <div><p className="text-sm text-gray-500">Mensualités</p><p className="font-medium">{demande.nombre_mensualites} mois ({demande.mensualite ? formatMontant(demande.mensualite) : '-'}/mois)</p></div>
            {demande.motif && <div className="sm:col-span-2"><p className="text-sm text-gray-500">Motif</p><p className="font-medium">{demande.motif}</p></div>}
            {demande.commentaire_admin && <div className="sm:col-span-2"><p className="text-sm text-gray-500">Commentaire admin</p><div className="mt-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3"><p className="text-sm text-yellow-800">{demande.commentaire_admin}</p></div></div>}
          </div>
        </CardContent>
      </Card>
      {echeances.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Échéancier</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-500">N°</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                <th className="text-right py-3 px-2 font-medium text-gray-500">Montant</th>
                <th className="text-center py-3 px-2 font-medium text-gray-500">Statut</th>
              </tr></thead>
              <tbody>
                {echeances.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="py-3 px-2">{e.numero}</td>
                    <td className="py-3 px-2">{formatDate(e.date_echeance)}</td>
                    <td className="py-3 px-2 text-right font-medium">{formatMontant(e.montant)}</td>
                    <td className="py-3 px-2 text-center"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ECHEANCE_STATUT_COLORS[e.statut]}`}>{ECHEANCE_STATUT_LABELS[e.statut]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
