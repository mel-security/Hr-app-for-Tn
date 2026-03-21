import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getMany, getOne, query } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { genererEcheancier } from '@/lib/utils';

// GET /api/admin/demandes — toutes les demandes (admin)
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statut = searchParams.get('statut');
  const demandeId = searchParams.get('id');

  // Détail d'une demande
  if (demandeId) {
    const demande = await getOne(
      `SELECT d.*, u.nom as employe_nom, u.prenom as employe_prenom,
              u.email as employe_email, u.matricule as employe_matricule,
              u.salaire_net as employe_salaire, u.plafond_credit as employe_plafond,
              u.departement as employe_departement
       FROM demandes d JOIN users u ON d.employe_id = u.id
       WHERE d.id = $1`,
      [demandeId]
    );

    const echeances = await getMany(
      'SELECT * FROM echeances WHERE demande_id = $1 ORDER BY numero',
      [demandeId]
    );

    return NextResponse.json({ demande, echeances });
  }

  let sql = `
    SELECT d.*, u.nom as employe_nom, u.prenom as employe_prenom,
           u.email as employe_email, u.matricule as employe_matricule
    FROM demandes d JOIN users u ON d.employe_id = u.id
  `;
  const params: any[] = [];

  if (statut && statut !== 'tous') {
    sql += ` WHERE d.statut = $1`;
    params.push(statut);
  }

  sql += ` ORDER BY d.created_at DESC`;

  const demandes = await getMany(sql, params);
  return NextResponse.json({ demandes });
}

// PATCH /api/admin/demandes — valider ou refuser une demande
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const { id, action, commentaire } = await request.json();

    if (!id || !action || !['validee', 'refusee'].includes(action)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }

    // Vérifier que la demande est en attente
    const demande = await getOne<{
      id: string;
      employe_id: string;
      montant: number;
      nombre_mensualites: number;
      statut: string;
    }>(
      'SELECT id, employe_id, montant, nombre_mensualites, statut FROM demandes WHERE id = $1',
      [id]
    );

    if (!demande) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }
    if (demande.statut !== 'en_attente') {
      return NextResponse.json({ error: 'Cette demande a déjà été traitée' }, { status: 400 });
    }

    const updateData: any = {
      statut: action,
      commentaire_admin: commentaire || null,
      traite_par: user.id,
      date_traitement: new Date().toISOString(),
    };

    if (action === 'validee') {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      updateData.date_debut_remboursement = nextMonth.toISOString().split('T')[0];
    }

    await query(
      `UPDATE demandes SET statut = $1, commentaire_admin = $2, traite_par = $3,
       date_traitement = $4, date_debut_remboursement = $5
       WHERE id = $6`,
      [
        updateData.statut, updateData.commentaire_admin, updateData.traite_par,
        updateData.date_traitement, updateData.date_debut_remboursement || null, id,
      ]
    );

    // Créer les échéances si validation
    if (action === 'validee') {
      const echeancierData = genererEcheancier(
        Number(demande.montant),
        demande.nombre_mensualites,
        new Date()
      );

      for (const e of echeancierData) {
        await query(
          `INSERT INTO echeances (demande_id, employe_id, numero, montant, date_echeance)
           VALUES ($1, $2, $3, $4, $5)`,
          [demande.id, demande.employe_id, e.numero, e.montant, e.date_echeance]
        );
      }
    }

    await logAudit({
      userId: user.id,
      action: action === 'validee' ? 'validation_demande' : 'refus_demande',
      entite: 'demande',
      entiteId: id,
      details: { montant: demande.montant, commentaire },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin demande action error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
