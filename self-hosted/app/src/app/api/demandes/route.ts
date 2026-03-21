import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getMany, getOne, query } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// GET /api/demandes — liste des demandes de l'employé connecté
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const statut = searchParams.get('statut');

  let sql = `SELECT * FROM demandes WHERE employe_id = $1`;
  const params: any[] = [user.id];

  if (statut && statut !== 'tous') {
    sql += ` AND statut = $2`;
    params.push(statut);
  }

  sql += ` ORDER BY created_at DESC`;

  const demandes = await getMany(sql, params);
  return NextResponse.json({ demandes });
}

// POST /api/demandes — créer une nouvelle demande
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const { type, montant, motif, nombre_mensualites } = body;

    if (!type || !montant || !nombre_mensualites) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const montantNum = parseFloat(montant);
    const nbMens = parseInt(nombre_mensualites);

    if (montantNum <= 0) {
      return NextResponse.json({ error: 'Le montant doit être supérieur à 0' }, { status: 400 });
    }
    if (nbMens < 1 || nbMens > 24) {
      return NextResponse.json({ error: 'Nombre de mensualités invalide' }, { status: 400 });
    }

    // Vérifier la capacité de crédit
    const cap = await getOne<{ result: number }>(
      'SELECT get_capacite_credit($1) as result', [user.id]
    );
    const capacite = Number(cap?.result || 0);

    if (montantNum > capacite) {
      return NextResponse.json({
        error: `Montant dépasse la capacité de crédit (${capacite} TND)`,
      }, { status: 400 });
    }

    // Vérifier 30% du salaire
    const profile = await getOne<{ salaire_net: number }>(
      'SELECT salaire_net FROM users WHERE id = $1', [user.id]
    );
    const salaire = Number(profile?.salaire_net || 0);
    if (salaire > 0) {
      const mensualite = Math.ceil((montantNum / nbMens) * 1000) / 1000;
      const maxMensualite = salaire * 0.3;
      if (mensualite > maxMensualite) {
        return NextResponse.json({
          error: `La mensualité dépasse 30% du salaire net. Augmentez le nombre de mensualités.`,
        }, { status: 400 });
      }
    }

    const mensualite = Math.ceil((montantNum / nbMens) * 1000) / 1000;

    const demande = await getOne(
      `INSERT INTO demandes (employe_id, type, montant, motif, nombre_mensualites, mensualite)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.id, type, montantNum, motif || null, nbMens, mensualite]
    );

    await logAudit({
      userId: user.id,
      action: 'creation_demande',
      entite: 'demande',
      entiteId: demande?.id,
      details: { type, montant: montantNum, nombre_mensualites: nbMens },
    });

    return NextResponse.json({ demande }, { status: 201 });
  } catch (error) {
    console.error('Create demande error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
