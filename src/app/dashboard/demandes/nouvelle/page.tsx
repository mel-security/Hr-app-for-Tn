'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { calculerMensualite, formatMontant } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TypeDemande } from '@/types';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NouvelleDemandePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [type, setType] = useState<TypeDemande>('avance');
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');
  const [nbMensualites, setNbMensualites] = useState('1');
  const [capacite, setCapacite] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    loadCapacite();
  }, [profile]);

  async function loadCapacite() {
    if (!profile) return;
    const { data } = await supabase.rpc('get_capacite_credit', {
      p_employe_id: profile.id,
    });
    setCapacite(data || 0);
  }

  const montantNum = parseFloat(montant) || 0;
  const nbMensNum = parseInt(nbMensualites) || 1;
  const mensualite = montantNum > 0 ? calculerMensualite(montantNum, nbMensNum) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (montantNum <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }

    if (montantNum > capacite) {
      setError(`Le montant dépasse votre capacité de crédit (${formatMontant(capacite)})`);
      return;
    }

    // Vérifier que la mensualité ne dépasse pas 30% du salaire
    if (profile && profile.salaire_net > 0) {
      const maxMensualite = profile.salaire_net * 0.3;
      if (mensualite > maxMensualite) {
        setError(`La mensualité (${formatMontant(mensualite)}) dépasse 30% de votre salaire net (${formatMontant(maxMensualite)}). Augmentez le nombre de mensualités.`);
        return;
      }
    }

    setLoading(true);

    const { error: insertError } = await supabase.from('demandes').insert({
      employe_id: profile!.id,
      type,
      montant: montantNum,
      motif: motif || null,
      nombre_mensualites: nbMensNum,
      mensualite,
    });

    if (insertError) {
      setError('Erreur lors de la soumission. Veuillez réessayer.');
      setLoading(false);
      return;
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      user_id: profile!.id,
      action: 'creation_demande',
      entite: 'demande',
      details: { type, montant: montantNum, nombre_mensualites: nbMensNum },
    });

    router.push('/dashboard/demandes');
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Retour au tableau de bord
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Nouvelle demande</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              Votre capacité de crédit disponible :{' '}
              <span className="font-bold">{formatMontant(capacite)}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Select
              id="type"
              label="Type de demande"
              value={type}
              onChange={(e) => setType(e.target.value as TypeDemande)}
            >
              <option value="avance">Avance sur salaire</option>
              <option value="credit">Crédit salarié</option>
            </Select>

            <Input
              id="montant"
              label="Montant demandé (TND)"
              type="number"
              step="0.001"
              min="0"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="Ex: 500.000"
              required
            />

            <Select
              id="mensualites"
              label="Nombre de mensualités"
              value={nbMensualites}
              onChange={(e) => setNbMensualites(e.target.value)}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'mois' : 'mois'}
                </option>
              ))}
            </Select>

            <Textarea
              id="motif"
              label="Motif (optionnel)"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Décrivez le motif de votre demande..."
              rows={3}
            />

            {/* Récapitulatif */}
            {montantNum > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Récapitulatif</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">Montant total :</span>
                  <span className="font-medium text-right">{formatMontant(montantNum)}</span>
                  <span className="text-gray-500">Nombre de mensualités :</span>
                  <span className="font-medium text-right">{nbMensNum}</span>
                  <span className="text-gray-500">Mensualité estimée :</span>
                  <span className="font-bold text-right text-blue-600">{formatMontant(mensualite)}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading} className="flex-1">
                Soumettre la demande
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
