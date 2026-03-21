-- =============================================
-- HR Credit App - Initial Database Schema
-- Application RH de gestion des avances sur salaire
-- Marché: Tunisie
-- =============================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Table: profiles (extension de auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  matricule TEXT UNIQUE, -- numéro employé
  departement TEXT,
  poste TEXT,
  salaire_net NUMERIC(10,3) NOT NULL DEFAULT 0, -- en TND (3 décimales pour millimes)
  plafond_credit NUMERIC(10,3) NOT NULL DEFAULT 0, -- montant max autorisé
  role TEXT NOT NULL DEFAULT 'employe' CHECK (role IN ('employe', 'admin')),
  actif BOOLEAN NOT NULL DEFAULT true,
  telephone TEXT,
  date_embauche DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Table: demandes (demandes d'avance/crédit)
-- =============================================
CREATE TYPE type_demande AS ENUM ('avance', 'credit');
CREATE TYPE statut_demande AS ENUM ('en_attente', 'validee', 'refusee', 'annulee', 'remboursee');

CREATE TABLE demandes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type type_demande NOT NULL DEFAULT 'avance',
  montant NUMERIC(10,3) NOT NULL CHECK (montant > 0),
  motif TEXT,
  nombre_mensualites INTEGER NOT NULL DEFAULT 1 CHECK (nombre_mensualites >= 1 AND nombre_mensualites <= 24),
  mensualite NUMERIC(10,3), -- calculé: montant / nombre_mensualites
  statut statut_demande NOT NULL DEFAULT 'en_attente',
  commentaire_admin TEXT,
  traite_par UUID REFERENCES profiles(id),
  date_traitement TIMESTAMPTZ,
  date_debut_remboursement DATE, -- mois de début du remboursement
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Table: echeances (échéancier de remboursement)
-- =============================================
CREATE TYPE statut_echeance AS ENUM ('a_venir', 'payee', 'en_retard');

CREATE TABLE echeances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demande_id UUID NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
  employe_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL, -- numéro de l'échéance (1, 2, 3...)
  montant NUMERIC(10,3) NOT NULL,
  date_echeance DATE NOT NULL,
  statut statut_echeance NOT NULL DEFAULT 'a_venir',
  date_paiement DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Table: parametres (configuration globale)
-- =============================================
CREATE TABLE parametres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cle TEXT UNIQUE NOT NULL,
  valeur TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Paramètres par défaut
INSERT INTO parametres (cle, valeur, description) VALUES
  ('plafond_credit_defaut', '3000.000', 'Plafond de crédit par défaut en TND'),
  ('nombre_mensualites_max', '12', 'Nombre maximum de mensualités'),
  ('pourcentage_max_salaire', '30', 'Pourcentage maximum du salaire pour les mensualités');

-- =============================================
-- Table: audit_logs (journalisation des actions)
-- =============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entite TEXT NOT NULL, -- 'demande', 'echeance', 'profil', etc.
  entite_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Index pour performance
-- =============================================
CREATE INDEX idx_demandes_employe ON demandes(employe_id);
CREATE INDEX idx_demandes_statut ON demandes(statut);
CREATE INDEX idx_demandes_created ON demandes(created_at DESC);
CREATE INDEX idx_echeances_demande ON echeances(demande_id);
CREATE INDEX idx_echeances_employe ON echeances(employe_id);
CREATE INDEX idx_echeances_date ON echeances(date_echeance);
CREATE INDEX idx_echeances_statut ON echeances(statut);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entite ON audit_logs(entite, entite_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE echeances ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametres ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: un employé voit son profil, un admin voit tout
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Demandes: un employé voit ses demandes, un admin voit tout
CREATE POLICY "demandes_select_own" ON demandes
  FOR SELECT USING (
    employe_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "demandes_insert_own" ON demandes
  FOR INSERT WITH CHECK (employe_id = auth.uid());

CREATE POLICY "demandes_update_admin" ON demandes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Echeances: un employé voit ses échéances, un admin voit tout
CREATE POLICY "echeances_select_own" ON echeances
  FOR SELECT USING (
    employe_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "echeances_update_admin" ON echeances
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "echeances_insert_admin" ON echeances
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Parametres: lecture pour tous, écriture admin
CREATE POLICY "parametres_select_all" ON parametres
  FOR SELECT USING (true);

CREATE POLICY "parametres_admin" ON parametres
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Audit logs: admin uniquement
CREATE POLICY "audit_logs_admin" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- =============================================
-- Functions
-- =============================================

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER demandes_updated_at
  BEFORE UPDATE ON demandes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Fonction: calculer l'encours d'un employé
CREATE OR REPLACE FUNCTION get_encours_employe(p_employe_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(e.montant)
     FROM echeances e
     JOIN demandes d ON e.demande_id = d.id
     WHERE e.employe_id = p_employe_id
       AND d.statut = 'validee'
       AND e.statut IN ('a_venir', 'en_retard')),
    0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: calculer la capacité de crédit restante
CREATE OR REPLACE FUNCTION get_capacite_credit(p_employe_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_plafond NUMERIC;
  v_encours NUMERIC;
BEGIN
  SELECT plafond_credit INTO v_plafond FROM profiles WHERE id = p_employe_id;
  v_encours := get_encours_employe(p_employe_id);
  RETURN GREATEST(v_plafond - v_encours, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: créer le profil après inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nom, prenom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employe')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
