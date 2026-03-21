import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('hr_credit_session')?.value;
  const { pathname } = request.nextUrl;

  // Pages protégées
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Pages auth quand déjà connecté
  if (pathname.startsWith('/auth') && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Racine
  if (pathname === '/') {
    return NextResponse.redirect(new URL(token ? '/dashboard' : '/auth/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
