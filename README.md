# HR Crédit - Application de Gestion des Avances sur Salaire

Application RH légère pour le marché tunisien, permettant la gestion des demandes d'avances sur salaire et de crédits salariés internes.

## Stack technique

- **Frontend** : Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + RLS + API REST)
- **Hébergement** : Vercel (frontend) + Supabase Cloud (backend)
- **Coût MVP** : 0€ (free tiers)

## Fonctionnalités MVP

### Côté employé
- Connexion sécurisée
- Soumission de demande d'avance/crédit
- Choix du montant et du nombre de mensualités
- Consultation du statut des demandes
- Consultation de l'encours et de la capacité de crédit
- Visualisation de l'échéancier de remboursement
- Historique des demandes

### Côté administrateur (Ali)
- Tableau de bord avec statistiques globales
- Liste et filtrage des demandes
- Validation / refus manuel avec commentaire
- Gestion de l'échéancier (marquer les échéances payées)
- Gestion des employés (salaire, plafond crédit)
- Export CSV (demandes, échéances, employés)
- Journalisation des actions (audit log)

## Installation

### Prérequis
- Node.js 18+
- Un compte Supabase (gratuit sur https://supabase.com)

### 1. Configuration Supabase

1. Créez un nouveau projet sur [supabase.com](https://supabase.com)
2. Allez dans **SQL Editor** et exécutez le fichier `supabase/migrations/001_initial_schema.sql`
3. Dans **Authentication > Settings**, activez l'inscription par email
4. Notez votre **Project URL** et **anon key** (Settings > API)

### 2. Configuration locale

```bash
# Cloner le projet
git clone <repo-url>
cd Hr-app-for-Tn

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.local.example .env.local
# Éditez .env.local avec vos clés Supabase

# Lancer en développement
npm run dev
```

L'application sera accessible sur http://localhost:3000

### 3. Créer le premier administrateur

1. Inscrivez-vous normalement via l'interface
2. Dans Supabase Dashboard > Table Editor > profiles, modifiez le `role` de votre utilisateur à `admin`
3. Configurez aussi les `salaire_net` et `plafond_credit` des employés

### 4. Déploiement sur Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Configurer les variables d'environnement dans le dashboard Vercel :
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Structure du projet

```
src/
├── app/
│   ├── auth/login/page.tsx           # Connexion
│   ├── auth/register/page.tsx        # Inscription
│   ├── dashboard/
│   │   ├── page.tsx                  # Dashboard employé
│   │   ├── layout.tsx                # Layout avec sidebar
│   │   ├── demandes/page.tsx         # Historique demandes
│   │   ├── demandes/nouvelle/page.tsx # Nouvelle demande
│   │   ├── demandes/[id]/page.tsx    # Détail demande
│   │   └── admin/
│   │       ├── page.tsx              # Dashboard admin
│   │       ├── demandes/page.tsx     # Gestion demandes
│   │       ├── demandes/[id]/page.tsx # Traitement demande
│   │       ├── employes/page.tsx     # Gestion employés
│   │       ├── echeancier/page.tsx   # Échéancier global
│   │       └── export/page.tsx       # Export CSV
├── components/ui/                    # Composants UI réutilisables
├── hooks/useAuth.ts                  # Hook d'authentification
├── lib/supabase/                     # Clients Supabase
├── lib/utils.ts                      # Utilitaires et calculs métier
└── types/index.ts                    # Types TypeScript
supabase/
└── migrations/001_initial_schema.sql # Schéma complet de la DB
```

## Modèle de données

- **profiles** : Utilisateurs (nom, prénom, salaire, plafond crédit, rôle)
- **demandes** : Demandes d'avances/crédits (montant, mensualités, statut)
- **echeances** : Échéancier de remboursement
- **parametres** : Configuration globale
- **audit_logs** : Journalisation des actions

## Règles métier

- Montant demandé ≤ capacité de crédit restante
- Mensualité ≤ 30% du salaire net
- Maximum 12 mensualités (configurable)
- Plafond de crédit par défaut : 3 000 TND
- Devise : Dinar tunisien (TND, 3 décimales / millimes)

## Licence

Propriétaire - Usage interne uniquement.
