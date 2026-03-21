export type Role = 'employe' | 'admin';
export type TypeDemande = 'avance' | 'credit';
export type StatutDemande = 'en_attente' | 'validee' | 'refusee' | 'annulee' | 'remboursee';
export type StatutEcheance = 'a_venir' | 'payee' | 'en_retard';

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  matricule: string | null;
  departement: string | null;
  poste: string | null;
  salaire_net: number;
  plafond_credit: number;
  role: Role;
  actif: boolean;
  telephone: string | null;
  date_embauche: string | null;
  created_at: string;
  updated_at: string;
}

export interface Demande {
  id: string;
  employe_id: string;
  type: TypeDemande;
  montant: number;
  motif: string | null;
  nombre_mensualites: number;
  mensualite: number | null;
  statut: StatutDemande;
  commentaire_admin: string | null;
  traite_par: string | null;
  date_traitement: string | null;
  date_debut_remboursement: string | null;
  created_at: string;
  updated_at: string;
  employe_nom?: string;
  employe_prenom?: string;
  employe_email?: string;
  employe_matricule?: string;
}

export interface Echeance {
  id: string;
  demande_id: string;
  employe_id: string;
  numero: number;
  montant: number;
  date_echeance: string;
  statut: StatutEcheance;
  date_paiement: string | null;
  created_at: string;
  employe_nom?: string;
  employe_prenom?: string;
}

export const STATUT_LABELS: Record<StatutDemande, string> = {
  en_attente: 'En attente',
  validee: 'Validée',
  refusee: 'Refusée',
  annulee: 'Annulée',
  remboursee: 'Remboursée',
};

export const STATUT_COLORS: Record<StatutDemande, string> = {
  en_attente: 'bg-yellow-100 text-yellow-800',
  validee: 'bg-green-100 text-green-800',
  refusee: 'bg-red-100 text-red-800',
  annulee: 'bg-gray-100 text-gray-800',
  remboursee: 'bg-blue-100 text-blue-800',
};

export const TYPE_LABELS: Record<TypeDemande, string> = {
  avance: 'Avance sur salaire',
  credit: 'Crédit salarié',
};

export const ECHEANCE_STATUT_LABELS: Record<StatutEcheance, string> = {
  a_venir: 'À venir',
  payee: 'Payée',
  en_retard: 'En retard',
};

export const ECHEANCE_STATUT_COLORS: Record<StatutEcheance, string> = {
  a_venir: 'bg-gray-100 text-gray-700',
  payee: 'bg-green-100 text-green-700',
  en_retard: 'bg-red-100 text-red-700',
};
