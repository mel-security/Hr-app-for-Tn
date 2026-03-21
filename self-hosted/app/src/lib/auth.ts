import { SignJWT, jwtVerify } from 'jose';
import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';
import { query, getOne } from './db';
import crypto from 'crypto';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');
const JWT_EXPIRY = parseInt(process.env.JWT_EXPIRY_HOURS || '24');
const COOKIE_NAME = 'hr_credit_session';

export interface AuthUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: 'employe' | 'admin';
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

export async function createToken(user: AuthUser): Promise<string> {
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    nom: user.nom,
    prenom: user.prenom,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY}h`)
    .sign(JWT_SECRET);

  // Stocker le hash du token en DB pour pouvoir l'invalider
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + JWT_EXPIRY * 60 * 60 * 1000);

  await query(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, tokenHash, expiresAt]
  );

  return token;
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Vérifier que la session existe encore en DB
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await getOne(
      'SELECT id FROM sessions WHERE token_hash = $1 AND expires_at > NOW()',
      [tokenHash]
    );

    if (!session) return null;

    return {
      id: payload.sub as string,
      email: payload.email as string,
      nom: payload.nom as string,
      prenom: payload.prenom as string,
      role: payload.role as 'employe' | 'admin',
    };
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function setAuthCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: JWT_EXPIRY * 60 * 60,
  });
}

export function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function invalidateSession(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
}

export async function invalidateAllSessions(userId: string) {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}
