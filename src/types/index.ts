// Types principaux de l'application HR Credit

export type Role = 'employe' | 'admin';
export type TypeDemande = 'avance' | 'credit';
export type StatutDemande = 'en_attente' | 'validee' | 'refusee' | 'annulee' | 'remboursee';
export type StatutEcheance = 'a_venir' | 'payee' | 'en_retard';

export interface Profile {
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
  // Joined
  employe?: Profile;
  echeances?: Echeance[];
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
}

export interface Parametre {
  id: string;
  cle: string;
  valeur: string;
  description: string | null;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entite: string;
  entite_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface DashboardStats {
  encours: number;
  capacite_restante: number;
  mensualites_restantes: number;
  prochaine_mensualite: number;
  prochaine_echeance_date: string | null;
  demandes_en_attente: number;
  total_demandes: number;
}

export interface AdminStats {
  total_demandes_en_attente: number;
  total_demandes_validees: number;
  total_demandes_refusees: number;
  encours_global: number;
  montant_a_recouvrer: number;
  echeances_en_retard: number;
  total_employes: number;
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
