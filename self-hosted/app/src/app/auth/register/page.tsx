'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nom, prenom }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Erreur lors de l\'inscription');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">HR Crédit</h1>
          <p className="text-gray-500 mt-2">Gestion des avances sur salaire</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Créer un compte</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input id="prenom" label="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ali" required />
              <Input id="nom" label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ben Salah" required />
            </div>
            <Input id="email" label="Adresse email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@entreprise.tn" required />
            <Input id="password" label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 caractères" required minLength={6} />
            {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
            <Button type="submit" loading={loading} className="w-full">Créer mon compte</Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="text-blue-600 hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
