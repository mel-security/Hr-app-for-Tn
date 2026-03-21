import { NextRequest, NextResponse } from 'next/server';
import { getOne } from '@/lib/db';
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const user = await getOne<{
      id: string;
      email: string;
      password_hash: string;
      nom: string;
      prenom: string;
      role: string;
      actif: boolean;
    }>(
      'SELECT id, email, password_hash, nom, prenom, role, actif FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (!user) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    if (!user.actif) {
      return NextResponse.json({ error: 'Compte désactivé' }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await logAudit({
        userId: user.id,
        action: 'login_failed',
        entite: 'auth',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      });
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 });
    }

    const token = await createToken({
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role as 'employe' | 'admin',
    });

    setAuthCookie(token);

    await logAudit({
      userId: user.id,
      action: 'login_success',
      entite: 'auth',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
