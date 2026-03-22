# HR Crédit - Application de Gestion des Avances sur Salaire

Application RH légère pour le marché tunisien, permettant la gestion des demandes d'avances sur salaire et de crédits salariés internes.

## Stack technique

- **Frontend** : Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + RLS + API REST)
- **Icônes** : Lucide React
- **Utilitaires** : date-fns, clsx, tailwind-merge
- **Hébergement** : Vercel (frontend) + Supabase Cloud (backend) — ou auto-hébergé sur VPS
- **Conteneurisation** : Docker + Docker Compose
- **Coût MVP** : 0 € (free tiers Vercel + Supabase)

## Fonctionnalités MVP

### Côté employé
- Connexion / inscription sécurisée (email + mot de passe)
- Soumission de demande d'avance ou de crédit
- Choix du montant et du nombre de mensualités
- Consultation du statut des demandes (en attente, validée, refusée, annulée, remboursée)
- Consultation de l'encours et de la capacité de crédit restante
- Visualisation de l'échéancier de remboursement
- Historique complet des demandes

### Côté administrateur
- Tableau de bord avec statistiques globales
- Liste et filtrage des demandes
- Validation / refus manuel avec commentaire
- Gestion de l'échéancier (marquer les échéances payées)
- Gestion des employés (salaire net, plafond crédit)
- Export CSV (demandes, échéances, employés)
- Journalisation des actions (audit log)

## Installation

### Prérequis
- Node.js 18+
- npm ou yarn
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
# Éditez .env.local avec vos clés Supabase :
#   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon

# Lancer en développement
npm run dev
```

L'application sera accessible sur http://localhost:3000

### 3. Créer le premier administrateur

1. Inscrivez-vous normalement via l'interface
2. Dans Supabase Dashboard > **Table Editor** > `profiles`, modifiez le champ `role` de votre utilisateur à `admin`
3. Configurez aussi les champs `salaire_net` et `plafond_credit` des employés

### 4. Déploiement

#### Option A — Vercel + Supabase Cloud (recommandé)

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Configurer les variables d'environnement dans le dashboard Vercel :
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### Option B — Auto-hébergé sur VPS (Docker)

Un déploiement auto-hébergé complet est disponible dans le dossier `self-hosted/`. Il inclut :
- PostgreSQL local (remplace Supabase Cloud)
- Next.js avec API routes intégrées
- Nginx en reverse proxy
- Scripts de déploiement et de seeding

```bash
# Depuis le dossier self-hosted/
cd self-hosted
docker-compose up -d
```

Consultez [`self-hosted/DEPLOIEMENT.md`](self-hosted/DEPLOIEMENT.md) pour le guide complet de déploiement VPS.

## Scripts disponibles

| Commande        | Description                         |
|-----------------|-------------------------------------|
| `npm run dev`   | Serveur de développement (port 3000)|
| `npm run build` | Build de production                 |
| `npm run start` | Démarrer le serveur de production   |
| `npm run lint`  | Linter ESLint                       |

## Structure du projet

```
Hr-app-for-Tn/
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # Layout racine
│   │   ├── page.tsx                       # Page d'accueil (redirection)
│   │   ├── globals.css                    # Styles globaux
│   │   ├── auth/
│   │   │   ├── login/page.tsx             # Page de connexion
│   │   │   └── register/page.tsx          # Page d'inscription
│   │   └── dashboard/
│   │       ├── layout.tsx                 # Layout avec sidebar
│   │       ├── page.tsx                   # Dashboard employé
│   │       ├── demandes/
│   │       │   ├── page.tsx               # Historique des demandes
│   │       │   ├── nouvelle/page.tsx      # Nouvelle demande
│   │       │   └── [id]/page.tsx          # Détail d'une demande
│   │       └── admin/
│   │           ├── page.tsx               # Dashboard admin
│   │           ├── demandes/page.tsx      # Gestion des demandes
│   │           ├── demandes/[id]/page.tsx # Traitement d'une demande
│   │           ├── employes/page.tsx      # Gestion des employés
│   │           ├── echeancier/page.tsx    # Échéancier global
│   │           └── export/page.tsx        # Export CSV
│   ├── components/
│   │   ├── layout/
│   │   │   └── sidebar.tsx                # Sidebar de navigation
│   │   └── ui/
│   │       ├── badge.tsx                  # Badge de statut
│   │       ├── button.tsx                 # Bouton
│   │       ├── card.tsx                   # Carte (Card, CardHeader, CardContent, CardTitle)
│   │       ├── input.tsx                  # Champ de saisie
│   │       ├── select.tsx                 # Liste déroulante
│   │       ├── stat-card.tsx              # Carte de statistique
│   │       └── textarea.tsx               # Zone de texte
│   ├── hooks/
│   │   └── useAuth.ts                     # Hook d'authentification (user, profile, isAdmin)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                  # Client Supabase (navigateur)
│   │   │   ├── server.ts                  # Client Supabase (serveur)
│   │   │   └── middleware.ts              # Gestion de session
│   │   └── utils.ts                       # Utilitaires (formatMontant, calculerMensualite, etc.)
│   ├── middleware.ts                      # Middleware Next.js (protection des routes)
│   └── types/
│       └── index.ts                       # Types TypeScript (Profile, Demande, Echeance, etc.)
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql         # Schéma complet de la base de données
├── self-hosted/                           # Déploiement auto-hébergé (VPS)
│   ├── app/                               # Application Next.js avec API routes
│   ├── db/init.sql                        # Initialisation PostgreSQL
│   ├── nginx/                             # Configuration Nginx
│   ├── scripts/                           # Scripts de déploiement et seeding
│   ├── docker-compose.yml                 # Stack Docker complète
│   └── DEPLOIEMENT.md                     # Guide de déploiement
├── Dockerfile                             # Image Docker de l'application
├── docker-compose.yml                     # Docker Compose (développement)
├── .env.local.example                     # Template des variables d'environnement
├── next.config.mjs                        # Configuration Next.js
├── tailwind.config.ts                     # Configuration Tailwind CSS
├── tsconfig.json                          # Configuration TypeScript
└── package.json                           # Dépendances et scripts
```

## Modèle de données

| Table          | Description                                              |
|----------------|----------------------------------------------------------|
| `profiles`     | Utilisateurs (nom, prénom, email, salaire net, plafond crédit, rôle) |
| `demandes`     | Demandes d'avances/crédits (montant, mensualités, statut, motif) |
| `echeances`    | Échéancier de remboursement (date, montant, statut)      |
| `parametres`   | Configuration globale (plafond par défaut, max mensualités, etc.) |
| `audit_logs`   | Journalisation des actions admin                         |

La base de données utilise **Row-Level Security (RLS)** pour garantir que chaque employé n'accède qu'à ses propres données, et inclut des fonctions SQL pour le calcul de l'encours et de la capacité de crédit.

## Règles métier

- Montant demandé ≤ capacité de crédit restante
- Mensualité ≤ 30 % du salaire net
- Maximum 12 mensualités (configurable via la table `parametres`)
- Plafond de crédit par défaut : 3 000 TND
- Devise : Dinar tunisien (TND, 3 décimales / millimes)

## Types et statuts

| Type          | Valeurs                                                       |
|---------------|---------------------------------------------------------------|
| Rôle          | `employe`, `admin`                                            |
| Type demande  | `avance`, `credit`                                            |
| Statut demande| `en_attente`, `validee`, `refusee`, `annulee`, `remboursee`   |
| Statut échéance| `a_venir`, `payee`, `en_retard`                              |

## Licence

Propriétaire — Usage interne uniquement.
