-- =============================================
-- HR CRÉDIT - Schema PostgreSQL (Self-Hosted)
-- Version locale sans dépendance Supabase
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- Table: users (authentification locale)
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  matricule TEXT UNIQUE,
  departement TEXT,
  poste TEXT,
  salaire_net NUMERIC(10,3) NOT NULL DEFAULT 0,
  plafond_credit NUMERIC(10,3) NOT NULL DEFAULT 3000.000,
  role TEXT NOT NULL DEFAULT 'employe' CHECK (role IN ('employe', 'admin')),
  actif BOOLEAN NOT NULL DEFAULT true,
  telephone TEXT,
  date_embauche DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Types enum
-- =============================================
CREATE TYPE type_demande AS ENUM ('avance', 'credit');
CREATE TYPE statut_demande AS ENUM ('en_attente', 'validee', 'refusee', 'annulee', 'remboursee');
CREATE TYPE statut_echeance AS ENUM ('a_venir', 'payee', 'en_retard');

-- =============================================
-- Table: demandes
-- =============================================
CREATE TABLE demandes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employe_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type type_demande NOT NULL DEFAULT 'avance',
  montant NUMERIC(10,3) NOT NULL CHECK (montant > 0),
  motif TEXT,
  nombre_mensualites INTEGER NOT NULL DEFAULT 1 CHECK (nombre_mensualites >= 1 AND nombre_mensualites <= 24),
  mensualite NUMERIC(10,3),
  statut statut_demande NOT NULL DEFAULT 'en_attente',
  commentaire_admin TEXT,
  traite_par UUID REFERENCES users(id),
  date_traitement TIMESTAMPTZ,
  date_debut_remboursement DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Table: echeances
-- =============================================
CREATE TABLE echeances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  demande_id UUID NOT NULL REFERENCES demandes(id) ON DELETE CASCADE,
  employe_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  montant NUMERIC(10,3) NOT NULL,
  date_echeance DATE NOT NULL,
  statut statut_echeance NOT NULL DEFAULT 'a_venir',
  date_paiement DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Table: parametres
-- =============================================
CREATE TABLE parametres (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cle TEXT UNIQUE NOT NULL,
  valeur TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO parametres (cle, valeur, description) VALUES
  ('plafond_credit_defaut', '3000.000', 'Plafond de crédit par défaut en TND'),
  ('nombre_mensualites_max', '12', 'Nombre maximum de mensualités'),
  ('pourcentage_max_salaire', '30', 'Pourcentage maximum du salaire pour les mensualités');

-- =============================================
-- Table: audit_logs
-- =============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entite TEXT NOT NULL,
  entite_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Table: sessions (gestion des tokens)
-- =============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Index
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
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- =============================================
-- Functions
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER demandes_updated_at
  BEFORE UPDATE ON demandes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Encours d'un employé
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
$$ LANGUAGE plpgsql;

-- Capacité de crédit restante
CREATE OR REPLACE FUNCTION get_capacite_credit(p_employe_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_plafond NUMERIC;
  v_encours NUMERIC;
BEGIN
  SELECT plafond_credit INTO v_plafond FROM users WHERE id = p_employe_id;
  v_encours := get_encours_employe(p_employe_id);
  RETURN GREATEST(v_plafond - v_encours, 0);
END;
$$ LANGUAGE plpgsql;

-- Nettoyage automatique des sessions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Marquer les échéances en retard
CREATE OR REPLACE FUNCTION mark_overdue_echeances()
RETURNS void AS $$
BEGIN
  UPDATE echeances
  SET statut = 'en_retard'
  WHERE statut = 'a_venir'
    AND date_echeance < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Vérifier si toutes les échéances d'une demande sont payées → marquer remboursée
CREATE OR REPLACE FUNCTION check_demande_remboursee()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  IF NEW.statut = 'payee' THEN
    SELECT COUNT(*) INTO v_remaining
    FROM echeances
    WHERE demande_id = NEW.demande_id
      AND statut != 'payee';

    IF v_remaining = 0 THEN
      UPDATE demandes SET statut = 'remboursee' WHERE id = NEW.demande_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER echeance_payee_check
  AFTER UPDATE ON echeances
  FOR EACH ROW EXECUTE FUNCTION check_demande_remboursee();
