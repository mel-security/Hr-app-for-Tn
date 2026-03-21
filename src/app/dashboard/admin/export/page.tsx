'use client';

import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { useState } from 'react';

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminExportPage() {
  const { profile, isAdmin } = useAuth();
  const supabase = createClient();
  const [loading, setLoading] = useState('');

  async function exportDemandes() {
    setLoading('demandes');
    const { data } = await supabase
      .from('demandes')
      .select('*, employe:profiles!employe_id(nom, prenom, email, matricule)')
      .order('created_at', { ascending: false });

    if (data) {
      const rows = data.map((d: any) => ({
        date: d.created_at,
        employe_nom: `${d.employe?.prenom} ${d.employe?.nom}`,
        employe_email: d.employe?.email,
        matricule: d.employe?.matricule || '',
        type: d.type,
        montant: d.montant,
        nombre_mensualites: d.nombre_mensualites,
        mensualite: d.mensualite || '',
        statut: d.statut,
        motif: d.motif || '',
        commentaire_admin: d.commentaire_admin || '',
        date_traitement: d.date_traitement || '',
      }));
      downloadCSV(convertToCSV(rows), `demandes_${new Date().toISOString().split('T')[0]}.csv`);
    }
    setLoading('');
  }

  async function exportEcheances() {
    setLoading('echeances');
    const { data } = await supabase
      .from('echeances')
      .select('*, employe:profiles!employe_id(nom, prenom, email, matricule)')
      .order('date_echeance', { ascending: true });

    if (data) {
      const rows = data.map((e: any) => ({
        date_echeance: e.date_echeance,
        employe_nom: `${e.employe?.prenom} ${e.employe?.nom}`,
        employe_email: e.employe?.email,
        matricule: e.employe?.matricule || '',
        numero: e.numero,
        montant: e.montant,
        statut: e.statut,
        date_paiement: e.date_paiement || '',
      }));
      downloadCSV(convertToCSV(rows), `echeances_${new Date().toISOString().split('T')[0]}.csv`);
    }
    setLoading('');
  }

  async function exportEmployes() {
    setLoading('employes');
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'employe')
      .order('nom', { ascending: true });

    if (data) {
      const rows = data.map((p) => ({
        nom: p.nom,
        prenom: p.prenom,
        email: p.email,
        matricule: p.matricule || '',
        departement: p.departement || '',
        poste: p.poste || '',
        salaire_net: p.salaire_net,
        plafond_credit: p.plafond_credit,
        actif: p.actif ? 'Oui' : 'Non',
        date_embauche: p.date_embauche || '',
      }));
      downloadCSV(convertToCSV(rows), `employes_${new Date().toISOString().split('T')[0]}.csv`);
    }
    setLoading('');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Export des données</h1>
        <p className="text-gray-500 mt-1">Téléchargez les données au format CSV</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Demandes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Export complet de toutes les demandes d&apos;avances et crédits avec les informations des employés.
            </p>
            <Button
              onClick={exportDemandes}
              loading={loading === 'demandes'}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter les demandes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Échéances</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Export de toutes les échéances de remboursement avec statuts et dates de paiement.
            </p>
            <Button
              onClick={exportEcheances}
              loading={loading === 'echeances'}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter les échéances
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              Export de la liste des employés avec salaires et plafonds de crédit.
            </p>
            <Button
              onClick={exportEmployes}
              loading={loading === 'employes'}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter les employés
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
