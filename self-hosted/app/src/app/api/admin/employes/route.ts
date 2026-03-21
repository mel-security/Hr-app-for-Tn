import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getMany, query } from '@/lib/db';

// GET /api/admin/employes
export async function GET() {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const employes = await getMany(
    `SELECT id, email, nom, prenom, matricule, departement, poste,
            salaire_net, plafond_credit, actif, telephone, date_embauche, created_at
     FROM users WHERE role = 'employe' ORDER BY nom ASC`
  );

  return NextResponse.json({ employes });
}

// PATCH /api/admin/employes — modifier un employé
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const { id, salaire_net, plafond_credit, matricule, departement } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID employé requis' }, { status: 400 });
    }

    await query(
      `UPDATE users SET salaire_net = $1, plafond_credit = $2, matricule = $3, departement = $4
       WHERE id = $5 AND role = 'employe'`,
      [
        parseFloat(salaire_net) || 0,
        parseFloat(plafond_credit) || 0,
        matricule || null,
        departement || null,
        id,
      ]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Update employe error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
