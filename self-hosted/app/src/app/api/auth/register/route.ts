import { NextRequest, NextResponse } from 'next/server';
import { getOne, query } from '@/lib/db';
import { hashPassword, createToken, setAuthCookie } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const { email, password, nom, prenom } = await request.json();

    if (!email || !password || !nom || !prenom) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
    }

    const emailNorm = email.toLowerCase().trim();

    const existing = await getOne('SELECT id FROM users WHERE email = $1', [emailNorm]);
    if (existing) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const plafond = parseFloat(process.env.PLAFOND_CREDIT_DEFAUT || '3000');

    const result = await getOne<{ id: string; email: string; nom: string; prenom: string; role: string }>(
      `INSERT INTO users (email, password_hash, nom, prenom, plafond_credit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, nom, prenom, role`,
      [emailNorm, passwordHash, nom.trim(), prenom.trim(), plafond]
    );

    if (!result) {
      return NextResponse.json({ error: 'Erreur lors de la création du compte' }, { status: 500 });
    }

    const token = await createToken({
      id: result.id,
      email: result.email,
      nom: result.nom,
      prenom: result.prenom,
      role: result.role as 'employe' | 'admin',
    });

    setAuthCookie(token);

    await logAudit({
      userId: result.id,
      action: 'register',
      entite: 'auth',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ user: result }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
