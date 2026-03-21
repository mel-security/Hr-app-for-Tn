import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getOne, getMany } from '@/lib/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const [enAttente, validees, refusees, totalEmployes] = await Promise.all([
    getOne<{ count: string }>('SELECT COUNT(*) as count FROM demandes WHERE statut = $1', ['en_attente']),
    getOne<{ count: string }>('SELECT COUNT(*) as count FROM demandes WHERE statut = $1', ['validee']),
    getOne<{ count: string }>('SELECT COUNT(*) as count FROM demandes WHERE statut = $1', ['refusee']),
    getOne<{ count: string }>("SELECT COUNT(*) as count FROM users WHERE role = 'employe' AND actif = true"),
  ]);

  // Encours global
  const encoursResult = await getOne<{ total: string }>(
    "SELECT COALESCE(SUM(montant), 0) as total FROM echeances WHERE statut IN ('a_venir', 'en_retard')"
  );

  // Échéances en retard
  const enRetard = await getOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM echeances WHERE statut = 'en_retard'"
  );

  // À recouvrer ce mois
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const recouvrer = await getOne<{ total: string }>(
    `SELECT COALESCE(SUM(montant), 0) as total FROM echeances
     WHERE date_echeance >= $1 AND date_echeance <= $2
     AND statut IN ('a_venir', 'en_retard')`,
    [startOfMonth, endOfMonth]
  );

  return NextResponse.json({
    stats: {
      total_demandes_en_attente: parseInt(enAttente?.count || '0'),
      total_demandes_validees: parseInt(validees?.count || '0'),
      total_demandes_refusees: parseInt(refusees?.count || '0'),
      encours_global: parseFloat(encoursResult?.total || '0'),
      montant_a_recouvrer: parseFloat(recouvrer?.total || '0'),
      echeances_en_retard: parseInt(enRetard?.count || '0'),
      total_employes: parseInt(totalEmployes?.count || '0'),
    },
  });
}
