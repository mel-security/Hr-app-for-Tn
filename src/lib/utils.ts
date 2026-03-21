import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMontant(montant: number): string {
  return new Intl.NumberFormat('fr-TN', {
    style: 'currency',
    currency: 'TND',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(montant);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('fr-TN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateShort(date: string): string {
  return new Intl.DateTimeFormat('fr-TN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

export function calculerMensualite(montant: number, nbMensualites: number): number {
  return Math.ceil((montant / nbMensualites) * 1000) / 1000;
}

export function genererEcheancier(
  montant: number,
  nbMensualites: number,
  dateDebut: Date
): { numero: number; montant: number; date_echeance: string }[] {
  const mensualite = calculerMensualite(montant, nbMensualites);
  const echeances = [];
  let resteAPayer = montant;

  for (let i = 1; i <= nbMensualites; i++) {
    const dateEcheance = new Date(dateDebut);
    dateEcheance.setMonth(dateEcheance.getMonth() + i);

    const montantEcheance = i === nbMensualites ? resteAPayer : mensualite;
    resteAPayer -= montantEcheance;

    echeances.push({
      numero: i,
      montant: Math.round(montantEcheance * 1000) / 1000,
      date_echeance: dateEcheance.toISOString().split('T')[0],
    });
  }

  return echeances;
}
