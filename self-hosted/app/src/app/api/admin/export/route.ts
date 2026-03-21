import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getMany } from '@/lib/db';

function toCSV(data: Record<string, any>[]): string {
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

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  let csv = '';
  let filename = '';

  if (type === 'demandes') {
    const data = await getMany(
      `SELECT d.created_at as date, u.prenom || ' ' || u.nom as employe,
              u.email, u.matricule, d.type, d.montant, d.nombre_mensualites,
              d.mensualite, d.statut, d.motif, d.commentaire_admin, d.date_traitement
       FROM demandes d JOIN users u ON d.employe_id = u.id
       ORDER BY d.created_at DESC`
    );
    csv = toCSV(data);
    filename = `demandes_${new Date().toISOString().split('T')[0]}.csv`;
  } else if (type === 'echeances') {
    const data = await getMany(
      `SELECT e.date_echeance, u.prenom || ' ' || u.nom as employe,
              u.email, u.matricule, e.numero, e.montant, e.statut, e.date_paiement
       FROM echeances e JOIN users u ON e.employe_id = u.id
       ORDER BY e.date_echeance ASC`
    );
    csv = toCSV(data);
    filename = `echeances_${new Date().toISOString().split('T')[0]}.csv`;
  } else if (type === 'employes') {
    const data = await getMany(
      `SELECT nom, prenom, email, matricule, departement, poste,
              salaire_net, plafond_credit, actif, date_embauche
       FROM users WHERE role = 'employe' ORDER BY nom ASC`
    );
    csv = toCSV(data);
    filename = `employes_${new Date().toISOString().split('T')[0]}.csv`;
  } else {
    return NextResponse.json({ error: 'Type d\'export invalide' }, { status: 400 });
  }

  const BOM = '\uFEFF';
  return new NextResponse(BOM + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
