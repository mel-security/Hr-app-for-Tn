'use client';

import { useAuth } from '@/hooks/useAuth';
import { formatMontant, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { STATUT_LABELS, STATUT_COLORS, TYPE_LABELS, ECHEANCE_STATUT_LABELS, ECHEANCE_STATUT_COLORS } from '@/types';
import type { Demande, Echeance } from '@/types';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AdminDemandeDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [demande, setDemande] = useState<any>(null);
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  function loadData() {
    fetch(`/api/admin/demandes?id=${params.id}`).then(r => r.json()).then(d => {
      setDemande(d.demande);
      setEcheances(d.echeances || []);
      if (d.demande?.commentaire_admin) setCommentaire(d.demande.commentaire_admin);
      setLoading(false);
    });
  }

  useEffect(() => { if (user) loadData(); }, [user]);

  async function handleAction(action: 'validee' | 'refusee') {
    setActionLoading(true);
    const res = await fetch('/api/admin/demandes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: params.id, action, commentaire }),
    });
    if (res.ok) router.push('/dashboard/admin/demandes');
    else { alert('Erreur'); setActionLoading(false); }
  }

  async function marquerPayee(echeanceId: string) {
    await fetch('/api/admin/echeancier', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: echeanceId }),
    });
    loadData();
  }

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!demande) return <div className="text-center py-16"><p className="text-gray-500">Demande non trouvée</p></div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard/admin/demandes" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" />Retour
      </Link>

      <Card className="mb-6">
        <CardHeader><CardTitle>Informations employé</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div><p className="text-gray-500">Nom</p><p className="font-medium">{demande.employe_prenom} {demande.employe_nom}</p></div>
            <div><p className="text-gray-500">Matricule</p><p className="font-medium">{demande.employe_matricule || '-'}</p></div>
            <div><p className="text-gray-500">Département</p><p className="font-medium">{demande.employe_departement || '-'}</p></div>
            <div><p className="text-gray-500">Salaire net</p><p className="font-medium">{formatMontant(demande.employe_salaire || 0)}</p></div>
            <div><p className="text-gray-500">Plafond</p><p className="font-medium">{formatMontant(demande.employe_plafond || 0)}</p></div>
            <div><p className="text-gray-500">Email</p><p className="font-medium">{demande.employe_email}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Demande</CardTitle>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUT_COLORS[demande.statut]}`}>{STATUT_LABELS[demande.statut]}</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-gray-500">Type</p><p className="font-medium">{TYPE_LABELS[demande.type]}</p></div>
            <div><p className="text-gray-500">Date</p><p className="font-medium">{formatDate(demande.created_at)}</p></div>
            <div><p className="text-gray-500">Montant</p><p className="font-bold text-lg text-blue-600">{formatMontant(demande.montant)}</p></div>
            <div><p className="text-gray-500">Mensualités</p><p className="font-medium">{demande.nombre_mensualites} mois</p></div>
            {demande.motif && <div className="col-span-2"><p className="text-gray-500">Motif</p><p className="font-medium">{demande.motif}</p></div>}
          </div>
        </CardContent>
      </Card>

      {demande.statut === 'en_attente' && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Traitement</CardTitle></CardHeader>
          <CardContent>
            <Textarea id="commentaire" label="Commentaire (optionnel)" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Commentaire pour l'employé..." rows={3} />
            <div className="flex gap-3 mt-4">
              <Button onClick={() => handleAction('validee')} loading={actionLoading} className="flex-1"><CheckCircle className="h-4 w-4 mr-2" />Valider</Button>
              <Button variant="danger" onClick={() => handleAction('refusee')} loading={actionLoading} className="flex-1"><XCircle className="h-4 w-4 mr-2" />Refuser</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {echeances.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Échéancier</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm"><thead><tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-medium text-gray-500">N°</th>
              <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">Montant</th>
              <th className="text-center py-3 px-2 font-medium text-gray-500">Statut</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500">Action</th>
            </tr></thead><tbody>
              {echeances.map((e) => (
                <tr key={e.id} className="border-b border-gray-100">
                  <td className="py-3 px-2">{e.numero}</td>
                  <td className="py-3 px-2">{formatDate(e.date_echeance)}</td>
                  <td className="py-3 px-2 text-right font-medium">{formatMontant(e.montant)}</td>
                  <td className="py-3 px-2 text-center"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ECHEANCE_STATUT_COLORS[e.statut]}`}>{ECHEANCE_STATUT_LABELS[e.statut]}</span></td>
                  <td className="py-3 px-2 text-right">{e.statut !== 'payee' && <button onClick={() => marquerPayee(e.id)} className="text-green-600 hover:underline text-xs">Marquer payée</button>}</td>
                </tr>
              ))}
            </tbody></table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
