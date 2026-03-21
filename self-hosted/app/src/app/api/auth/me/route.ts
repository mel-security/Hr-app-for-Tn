import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getOne } from '@/lib/db';

export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await getOne(
    `SELECT id, email, nom, prenom, matricule, departement, poste,
            salaire_net, plafond_credit, role, actif, telephone, date_embauche,
            created_at, updated_at
     FROM users WHERE id = $1`,
    [authUser.id]
  );

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Charger encours et capacité
  const encours = await getOne<{ result: number }>(
    'SELECT get_encours_employe($1) as result', [user.id]
  );
  const capacite = await getOne<{ result: number }>(
    'SELECT get_capacite_credit($1) as result', [user.id]
  );

  return NextResponse.json({
    user: {
      ...user,
      encours: Number(encours?.result || 0),
      capacite: Number(capacite?.result || 0),
    },
  });
}
