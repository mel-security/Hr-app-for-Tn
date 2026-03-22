# HR Crédit — Gestion des Avances sur Salaire

Application RH pour le marché tunisien permettant aux employés de soumettre des demandes d'avances sur salaire et de crédits internes, et aux administrateurs de les gérer (validation, échéancier, remboursement).

## Présentation générale

### Objectif

Digitaliser le processus d'avance sur salaire au sein de l'entreprise :
- L'**employé** soumet une demande, choisit le montant et le nombre de mensualités, puis suit l'état de son remboursement.
- L'**administrateur** valide ou refuse les demandes, gère l'échéancier, et exporte les données.

### Fonctionnalités

| Fonctionnalité | Employé | Admin |
|----------------|:-------:|:-----:|
| Connexion / inscription sécurisée | ✓ | ✓ |
| Tableau de bord avec statistiques | ✓ | ✓ |
| Soumission de demande (avance ou crédit) | ✓ | — |
| Choix du montant et des mensualités | ✓ | — |
| Suivi du statut des demandes | ✓ | ✓ |
| Consultation encours / capacité de crédit | ✓ | — |
| Visualisation de l'échéancier | ✓ | ✓ |
| Historique complet des demandes | ✓ | ✓ |
| Validation / refus avec commentaire | — | ✓ |
| Marquer les échéances payées | — | ✓ |
| Gestion des employés (salaire, plafond) | — | ✓ |
| Export CSV (demandes, échéances, employés) | — | ✓ |
| Audit log (journalisation des actions) | — | ✓ |

### Règles métier

- Montant demandé ≤ capacité de crédit restante
- Mensualité ≤ 30 % du salaire net
- Maximum 12 mensualités (configurable)
- Plafond de crédit par défaut : 3 000 TND
- Devise : Dinar tunisien (TND, 3 décimales / millimes)

### Statuts et types

| Élément          | Valeurs possibles                                           |
|------------------|-------------------------------------------------------------|
| Rôle utilisateur | `employe`, `admin`                                          |
| Type de demande  | `avance`, `credit`                                          |
| Statut demande   | `en_attente`, `validee`, `refusee`, `annulee`, `remboursee` |
| Statut échéance  | `a_venir`, `payee`, `en_retard`                             |

### Modèle de données

| Table        | Description                                                        |
|--------------|--------------------------------------------------------------------|
| `profiles`   | Utilisateurs (nom, prénom, email, salaire net, plafond crédit, rôle) |
| `demandes`   | Demandes d'avances/crédits (montant, mensualités, statut, motif)   |
| `echeances`  | Échéancier de remboursement (date, montant, statut)                |
| `parametres` | Configuration globale (plafond par défaut, max mensualités, etc.)  |
| `audit_logs` | Journalisation des actions admin                                   |

---

## Comparaison des modes de déploiement

L'application est disponible en **deux versions** avec des architectures différentes :

| Critère | Hybrid (Vercel + Supabase) | Self-Hosted (VPS) |
|---------|---------------------------|-------------------|
| **Hébergement** | Vercel (frontend) + Supabase Cloud (backend) | Tout sur un seul VPS |
| **Base de données** | Supabase (PostgreSQL managé + RLS) | PostgreSQL 16 local (Docker) |
| **Authentification** | Supabase Auth (email/password) | JWT + bcrypt (local, aucun service tiers) |
| **API** | Supabase REST API auto-générée | API Routes Next.js intégrées |
| **SSL/HTTPS** | Automatique (Vercel + Supabase) | Let's Encrypt + Certbot |
| **Reverse proxy** | Géré par Vercel | Nginx (rate limiting, headers sécurité, HSTS) |
| **Backups** | Automatiques (Supabase) | pg_dump quotidien via cron |
| **Hardening serveur** | N/A (services managés) | UFW, Fail2ban, SSH hardening, auto-updates |
| **Coût** | 0 € (free tiers) | 3–8 €/mois (VPS) |
| **Scalabilité** | Élevée (infra managée) | Limitée au VPS |
| **Souveraineté des données** | Données chez Supabase (AWS) | 100 % sur votre serveur |
| **Maintenance** | Minimale | Vous gérez le serveur |
| **Mise en place** | ~10 min | ~30 min |
| **Idéal pour** | Prototypage, petites équipes, démarrage rapide | Entreprises exigeant le contrôle total des données |

### Stack technique par version

| Composant | Hybrid | Self-Hosted |
|-----------|--------|-------------|
| Framework | Next.js 14 (App Router) + TypeScript | Idem |
| Styles | Tailwind CSS | Idem |
| Icônes | Lucide React | Idem |
| Utilitaires | date-fns, clsx, tailwind-merge | Idem |
| Client BDD | `@supabase/ssr` + `@supabase/supabase-js` | `pg` (node-postgres) |
| Auth | Supabase Auth | `jsonwebtoken` + `bcrypt` |
| Conteneurisation | Docker (optionnel, pour dev) | Docker + Docker Compose (requis) |

---

## Version Hybrid (Vercel + Supabase)

### Prérequis

- Node.js 18+
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit, pour le déploiement)

### 1. Configuration Supabase

1. Créez un nouveau projet sur [supabase.com](https://supabase.com)
2. Allez dans **SQL Editor** et exécutez le fichier `supabase/migrations/001_initial_schema.sql`
3. Dans **Authentication > Settings**, activez l'inscription par email
4. Notez votre **Project URL** et **anon key** (Settings > API)

### 2. Installation locale

```bash
git clone <repo-url>
cd Hr-app-for-Tn

npm install

cp .env.local.example .env.local
# Éditez .env.local :
#   NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-clé-anon

npm run dev
```

L'application sera accessible sur http://localhost:3000

### 3. Créer le premier administrateur

1. Inscrivez-vous via l'interface
2. Dans Supabase Dashboard > **Table Editor** > `profiles`, changez le champ `role` à `admin`
3. Configurez `salaire_net` et `plafond_credit` pour chaque employé

### 4. Déployer sur Vercel

```bash
npm i -g vercel
vercel
```

Configurez les variables d'environnement dans le dashboard Vercel :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement (port 3000) |
| `npm run build` | Build de production |
| `npm run start` | Démarrer le serveur de production |
| `npm run lint` | Linter ESLint |

### Structure du projet (Hybrid)

```
Hr-app-for-Tn/
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # Layout racine
│   │   ├── page.tsx                       # Page d'accueil (redirection)
│   │   ├── globals.css                    # Styles globaux
│   │   ├── auth/
│   │   │   ├── login/page.tsx             # Connexion
│   │   │   └── register/page.tsx          # Inscription
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
│   │   ├── layout/sidebar.tsx             # Sidebar de navigation
│   │   └── ui/                            # Composants UI réutilisables
│   │       ├── badge.tsx, button.tsx, card.tsx
│   │       ├── input.tsx, select.tsx, textarea.tsx
│   │       └── stat-card.tsx
│   ├── hooks/useAuth.ts                   # Hook d'authentification
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                  # Client Supabase (navigateur)
│   │   │   ├── server.ts                  # Client Supabase (serveur)
│   │   │   └── middleware.ts              # Gestion de session
│   │   └── utils.ts                       # Utilitaires (formatMontant, calculerMensualite…)
│   ├── middleware.ts                      # Protection des routes
│   └── types/index.ts                     # Types TypeScript
├── supabase/migrations/
│   └── 001_initial_schema.sql             # Schéma complet (tables, RLS, fonctions, index)
├── .env.local.example                     # Template des variables d'environnement
├── Dockerfile                             # Image Docker (dev optionnel)
├── docker-compose.yml                     # Docker Compose (dev optionnel)
└── package.json
```

### FAQ — Version Hybrid

**Q : Combien d'employés sont supportés avec le free tier Supabase ?**
R : Le free tier Supabase supporte 500 Mo de stockage et 50 000 lignes. Largement suffisant pour une PME de quelques dizaines à centaines d'employés.

**Q : Comment ajouter un nouvel employé ?**
R : L'employé s'inscrit lui-même via la page d'inscription. L'admin peut ensuite configurer son `salaire_net` et `plafond_credit` dans la gestion des employés.

**Q : Comment passer un employé en admin ?**
R : Dans Supabase Dashboard > Table Editor > `profiles`, modifiez le champ `role` à `admin`.

**Q : Où sont stockées les données ?**
R : Sur les serveurs Supabase (AWS). Pour un contrôle total des données, utilisez la version self-hosted.

**Q : Puis-je utiliser Docker en local pour le développement ?**
R : Oui, un `Dockerfile` et un `docker-compose.yml` sont fournis à la racine du projet pour lancer l'app via Docker en développement.

---

## Version Self-Hosted (VPS)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        VPS Ubuntu                        │
│                                                          │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │  Nginx   │──▶│  Next.js App │──▶│   PostgreSQL 16   │ │
│  │  :80/443 │   │    :3000     │   │      :5432        │ │
│  └──────────┘   └──────────────┘   └──────────────────┘ │
│       │                                     │            │
│  ┌──────────┐                      ┌────────────────┐   │
│  │ Certbot  │                      │  Backup (cron) │   │
│  │ SSL auto │                      │  pg_dump daily  │   │
│  └──────────┘                      └────────────────┘   │
│                                                          │
│  Firewall UFW : 80, 443, SSH (port custom)               │
│  Fail2ban : protection brute-force                       │
│  Mises à jour sécurité : automatiques                    │
└─────────────────────────────────────────────────────────┘
```

### Prérequis

| Élément | Minimum | Recommandé |
|---------|---------|------------|
| **OS** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| **vCPU** | 1 | 2 |
| **RAM** | 1 Go | 2 Go |
| **Disque** | 20 Go SSD | 40 Go SSD |
| **IP** | 1 IP publique fixe | Idem |
| **Domaine** | 1 nom de domaine | Idem |

**Coût estimé** : 3–8 €/mois (Hetzner, OVH, Contabo, DigitalOcean).

### Déploiement en 5 étapes

#### 1. Configurer

```bash
git clone <repo-url>
cd Hr-app-for-Tn/self-hosted

cp config.env.example config.env
nano config.env
```

Variables obligatoires :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DOMAIN` | Nom de domaine | `credit.entreprise.tn` |
| `VPS_IP` | IP publique du VPS | `197.0.xxx.xxx` |
| `POSTGRES_PASSWORD` | Mot de passe BDD | `openssl rand -base64 32` |
| `JWT_SECRET` | Clé secrète JWT | `openssl rand -hex 64` |
| `ADMIN_EMAIL` | Email admin | `ali@entreprise.tn` |
| `ADMIN_PASSWORD` | Mot de passe admin | Mot de passe fort |
| `SSH_PORT` | Port SSH personnalisé | `2222` |
| `DEPLOY_USER` | Utilisateur non-root | `deployer` |
| `LETSENCRYPT_EMAIL` | Email pour SSL | `admin@entreprise.tn` |

#### 2. Configurer le DNS

Créez un enregistrement A chez votre registrar :

```
credit.entreprise.tn  →  A  →  IP_DU_VPS
```

Le DNS doit être propagé **avant** le déploiement (nécessaire pour le certificat SSL).

#### 3. Transférer sur le VPS

```bash
scp -r self-hosted/ root@IP_DU_VPS:/tmp/hr-credit/
```

#### 4. Exécuter le script de déploiement

```bash
ssh root@IP_DU_VPS
cd /tmp/hr-credit
chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh
```

Le script automatise : mise à jour système, hardening (SSH, UFW, Fail2ban), installation Docker, build de l'app, démarrage de la stack, certificat SSL, création du compte admin, et configuration des backups.

#### 5. Se connecter

Ouvrez `https://credit.entreprise.tn` et connectez-vous avec les identifiants admin définis dans `config.env`.

### Sécurité intégrée

| Couche | Mesure |
|--------|--------|
| **SSH** | Port personnalisé, root par clé uniquement, max 3 tentatives |
| **Firewall (UFW)** | Seuls SSH, 80 et 443 ouverts |
| **Fail2ban** | Ban 2h après 3 échecs SSH |
| **Nginx** | Rate limiting (5 req/min login, 30 req/min API), HSTS, headers sécurité |
| **SSL** | Let's Encrypt avec renouvellement automatique |
| **Sysctl** | Anti-spoofing, désactivation redirections ICMP |
| **OS** | Mises à jour de sécurité automatiques quotidiennes |
| **Docker** | Logs limités (10 Mo × 3 fichiers par conteneur) |

### Backups et crons

| Tâche | Fréquence | Description |
|-------|-----------|-------------|
| Backup BDD | Tous les jours 2h | pg_dump compressé, rétention 30 jours |
| Échéances en retard | Tous les jours 6h | Marque les échéances dépassées |
| Sessions expirées | Toutes les heures | Nettoie les sessions JWT expirées |
| Renouvellement SSL | Toutes les 12h | Certbot renew |

### Commandes utiles

```bash
cd /opt/hr-credit

# État des services
docker compose ps

# Logs en temps réel
docker compose logs -f app

# Redémarrer un service
docker compose restart app

# Accéder à PostgreSQL
docker exec -it hr-credit-db psql -U hr_credit_user -d hr_credit

# Backup manuel
docker exec hr-credit-db pg_dump -U hr_credit_user hr_credit | gzip > backup_manual.sql.gz

# Restaurer un backup
gunzip -c backup_file.sql.gz | docker exec -i hr-credit-db psql -U hr_credit_user -d hr_credit

# Mise à jour de l'app
git pull origin main && docker compose build app && docker compose up -d app
```

### Structure du projet (Self-Hosted)

```
self-hosted/
├── config.env.example          # Template de configuration
├── docker-compose.yml          # Orchestration : PostgreSQL + App + Nginx + Certbot + Backup
├── DEPLOIEMENT.md              # Guide de déploiement détaillé
├── app/                        # Application Next.js (API routes intégrées)
│   ├── Dockerfile
│   ├── src/
│   │   ├── app/                # Pages (auth, dashboard, admin)
│   │   ├── components/         # Composants UI
│   │   ├── hooks/              # Hook useAuth
│   │   ├── lib/
│   │   │   ├── db.ts           # Connexion PostgreSQL directe
│   │   │   ├── auth.ts         # JWT + bcrypt
│   │   │   ├── audit.ts        # Journalisation
│   │   │   └── utils.ts        # Calculs métier
│   │   └── types/
│   └── package.json
├── db/init.sql                 # Schéma PostgreSQL complet
├── nginx/
│   ├── nginx.conf              # Configuration globale
│   └── conf.d/app.conf         # Vhost de l'application
└── scripts/
    ├── deploy.sh               # Script de déploiement complet
    ├── seed-admin.sh           # Création du compte admin
    ├── seed.sql                # Données initiales
    └── backup.sh               # Script de backup quotidien
```

### FAQ — Version Self-Hosted

**Q : Dois-je connaître Docker pour utiliser cette version ?**
R : Non, le script `deploy.sh` gère tout automatiquement. Des connaissances Docker sont utiles uniquement pour le dépannage.

**Q : Comment mettre à jour l'application ?**
R : `git pull` puis `docker compose build app && docker compose up -d app` depuis `/opt/hr-credit`.

**Q : Où sont stockés les backups ?**
R : Dans `/opt/hr-credit/backups/`, rétention de 30 jours par défaut.

**Q : Comment changer le certificat SSL ?**
R : Le renouvellement est automatique. Pour forcer : `docker compose run --rm certbot certbot renew --force-renewal && docker compose restart nginx`.

**Q : L'application ne démarre pas, que faire ?**
R : Vérifiez les logs : `docker compose logs app`. Si c'est un problème de connexion BDD : `docker compose logs postgres`.

**Q : Comment vérifier que le serveur est sécurisé ?**
R : Vérifiez : `ufw status` (firewall), `fail2ban-client status sshd` (protection brute-force), `docker compose ps` (services actifs).

**Q : Puis-je migrer de la version Hybrid vers Self-Hosted ?**
R : Oui. Exportez vos données depuis Supabase (Dashboard > Table Editor > Export CSV), puis importez-les dans PostgreSQL local via `psql`.

---

## Licence

Propriétaire — Usage interne uniquement.
