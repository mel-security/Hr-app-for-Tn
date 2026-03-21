import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getMany, query } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// GET /api/admin/echeancier
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statut = searchParams.get('statut');

  let sql = `
    SELECT e.*, u.nom as employe_nom, u.prenom as employe_prenom
    FROM echeances e JOIN users u ON e.employe_id = u.id
  `;
  const params: any[] = [];

  if (statut && statut !== 'tous') {
    sql += ` WHERE e.statut = $1`;
    params.push(statut);
  }

  sql += ` ORDER BY e.date_echeance ASC`;

  const echeances = await getMany(sql, params);
  return NextResponse.json({ echeances });
}

// PATCH /api/admin/echeancier — marquer une échéance comme payée
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const { id } = await request.json();

    await query(
      `UPDATE echeances SET statut = 'payee', date_paiement = CURRENT_DATE WHERE id = $1`,
      [id]
    );

    await logAudit({
      userId: user.id,
      action: 'echeance_payee',
      entite: 'echeance',
      entiteId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Echeance update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
