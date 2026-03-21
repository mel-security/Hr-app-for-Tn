'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { formatMontant, formatDate, genererEcheancier } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { STATUT_LABELS, STATUT_COLORS, TYPE_LABELS } from '@/types';
import type { Demande, Echeance, Profile } from '@/types';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AdminDemandeDetailPage() {
  const { profile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [demande, setDemande] = useState<Demande & { employe: Profile } | null>(null);
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadDemande();
  }, [profile]);

  async function loadDemande() {
    const { data } = await supabase
      .from('demandes')
      .select('*, employe:profiles!employe_id(*)')
      .eq('id', params.id)
      .single();

    setDemande(data as any);

    if (data) {
      setCommentaire(data.commentaire_admin || '');

      const { data: ech } = await supabase
        .from('echeances')
        .select('*')
        .eq('demande_id', params.id)
        .order('numero', { ascending: true });
      setEcheances(ech || []);
    }

    setLoading(false);
  }

  async function handleAction(action: 'validee' | 'refusee') {
    if (!demande || !profile) return;
    setActionLoading(true);

    // Mettre à jour la demande
    const updateData: Record<string, unknown> = {
      statut: action,
      commentaire_admin: commentaire || null,
      traite_par: profile.id,
      date_traitement: new Date().toISOString(),
    };

    if (action === 'validee') {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      updateData.date_debut_remboursement = nextMonth.toISOString().split('T')[0];
    }

    const { error } = await supabase
      .from('demandes')
      .update(updateData)
      .eq('id', demande.id);

    if (error) {
      alert('Erreur lors du traitement');
      setActionLoading(false);
      return;
    }

    // Créer les échéances si validation
    if (action === 'validee') {
      const dateDebut = new Date();
      const echeancierData = genererEcheancier(
        demande.montant,
        demande.nombre_mensualites,
        dateDebut
      );

      const echeancesInsert = echeancierData.map((e) => ({
        demande_id: demande.id,
        employe_id: demande.employe_id,
        numero: e.numero,
        montant: e.montant,
        date_echeance: e.date_echeance,
        statut: 'a_venir' as const,
      }));

      await supabase.from('echeances').insert(echeancesInsert);
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: profile.id,
      action: action === 'validee' ? 'validation_demande' : 'refus_demande',
      entite: 'demande',
      entite_id: demande.id,
      details: {
        employe: `${demande.employe?.prenom} ${demande.employe?.nom}`,
        montant: demande.montant,
        commentaire: commentaire || null,
      },
    });

    router.push('/dashboard/admin/demandes');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!demande) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Demande non trouvée</p>
      </div>
    );
  }

  const echeanceStatutColors = {
    a_venir: 'bg-gray-100 text-gray-700',
    payee: 'bg-green-100 text-green-700',
    en_retard: 'bg-red-100 text-red-700',
  };

  const echeanceStatutLabels = {
    a_venir: 'À venir',
    payee: 'Payée',
    en_retard: 'En retard',
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/dashboard/admin/demandes"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Retour aux demandes
      </Link>

      {/* Info employé */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informations de l&apos;employé</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Nom complet</p>
              <p className="font-medium">{demande.employe?.prenom} {demande.employe?.nom}</p>
            </div>
            <div>
              <p className="text-gray-500">Matricule</p>
              <p className="font-medium">{demande.employe?.matricule || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Département</p>
              <p className="font-medium">{demande.employe?.departement || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Salaire net</p>
              <p className="font-medium">{formatMontant(demande.employe?.salaire_net || 0)}</p>
            </div>
            <div>
              <p className="text-gray-500">Plafond crédit</p>
              <p className="font-medium">{formatMontant(demande.employe?.plafond_credit || 0)}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium">{demande.employe?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Détail demande */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Détail de la demande</CardTitle>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUT_COLORS[demande.statut]}`}>
              {STATUT_LABELS[demande.statut]}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Type</p>
              <p className="font-medium">{TYPE_LABELS[demande.type]}</p>
            </div>
            <div>
              <p className="text-gray-500">Date de soumission</p>
              <p className="font-medium">{formatDate(demande.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-500">Montant demandé</p>
              <p className="font-bold text-lg text-blue-600">{formatMontant(demande.montant)}</p>
            </div>
            <div>
              <p className="text-gray-500">Mensualités</p>
              <p className="font-medium">{demande.nombre_mensualites} mois ({demande.mensualite ? formatMontant(demande.mensualite) : '-'}/mois)</p>
            </div>
            {demande.motif && (
              <div className="col-span-2">
                <p className="text-gray-500">Motif</p>
                <p className="font-medium">{demande.motif}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions admin */}
      {demande.statut === 'en_attente' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Traitement de la demande</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="commentaire"
              label="Commentaire (optionnel)"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Ajoutez un commentaire pour l'employé..."
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <Button
                onClick={() => handleAction('validee')}
                loading={actionLoading}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Valider la demande
              </Button>
              <Button
                variant="danger"
                onClick={() => handleAction('refusee')}
                loading={actionLoading}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Refuser la demande
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Échéancier */}
      {echeances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Échéancier de remboursement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">N°</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Date</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Montant</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-500">Statut</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {echeances.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100">
                      <td className="py-3 px-2">{e.numero}</td>
                      <td className="py-3 px-2">{formatDate(e.date_echeance)}</td>
                      <td className="py-3 px-2 text-right font-medium">{formatMontant(e.montant)}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${echeanceStatutColors[e.statut]}`}>
                          {echeanceStatutLabels[e.statut]}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        {e.statut !== 'payee' && (
                          <button
                            onClick={async () => {
                              await supabase
                                .from('echeances')
                                .update({ statut: 'payee', date_paiement: new Date().toISOString().split('T')[0] })
                                .eq('id', e.id);
                              loadDemande();
                            }}
                            className="text-green-600 hover:underline text-xs"
                          >
                            Marquer payée
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
