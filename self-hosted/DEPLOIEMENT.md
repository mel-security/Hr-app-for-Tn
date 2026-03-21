# HR Crédit — Guide de Déploiement VPS (Self-Hosted)

## Architecture

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

## Prérequis

| Élément | Minimum | Recommandé |
|---------|---------|------------|
| **OS** | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| **vCPU** | 1 | 2 |
| **RAM** | 1 Go | 2 Go |
| **Disque** | 20 Go SSD | 40 Go SSD |
| **IP** | 1 IP publique fixe | Idem |
| **Domaine** | 1 nom de domaine | Idem |

**Coût estimé** : 3-8 €/mois selon le fournisseur (Hetzner, OVH, Contabo, DigitalOcean).

## Déploiement en 5 minutes

### 1. Préparer le fichier de configuration

```bash
# Sur votre machine locale, cloner le repo
git clone <repo-url>
cd Hr-app-for-Tn/self-hosted

# Copier et éditer la configuration
cp config.env.example config.env
nano config.env
```

**Variables obligatoires à changer** :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DOMAIN` | Votre nom de domaine | `credit.entreprise.tn` |
| `VPS_IP` | IP publique du VPS | `197.0.xxx.xxx` |
| `POSTGRES_PASSWORD` | Mot de passe BDD | `openssl rand -base64 32` |
| `JWT_SECRET` | Clé secrète JWT | `openssl rand -hex 64` |
| `ADMIN_EMAIL` | Email admin (Ali) | `ali@entreprise.tn` |
| `ADMIN_PASSWORD` | Mot de passe admin | Mot de passe fort |
| `SSH_PORT` | Port SSH personnalisé | `2222` |
| `DEPLOY_USER` | Utilisateur non-root | `deployer` |
| `LETSENCRYPT_EMAIL` | Email pour SSL | `admin@entreprise.tn` |

**Générer les secrets** :
```bash
# Mot de passe PostgreSQL
openssl rand -base64 32

# Clé JWT
openssl rand -hex 64
```

### 2. Configurer le DNS

Chez votre registrar DNS, créez un enregistrement A :

```
credit.entreprise.tn  →  A  →  IP_DU_VPS
```

**Important** : Le DNS doit être propagé AVANT le déploiement (nécessaire pour le certificat SSL).

### 3. Transférer les fichiers sur le VPS

```bash
# Copier tout le dossier self-hosted sur le VPS
scp -r self-hosted/ root@IP_DU_VPS:/tmp/hr-credit/
```

### 4. Exécuter le script de déploiement

```bash
# Se connecter au VPS
ssh root@IP_DU_VPS

# Lancer le déploiement
cd /tmp/hr-credit
chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh
```

Le script va automatiquement :
1. Mettre à jour le système
2. Configurer le hardening (SSH, firewall, fail2ban)
3. Installer Docker et Docker Compose
4. Builder l'application
5. Démarrer PostgreSQL + App + Nginx
6. Obtenir le certificat SSL Let's Encrypt
7. Créer le compte administrateur (Ali)
8. Configurer les backups quotidiens

### 5. Se connecter

Ouvrez `https://credit.entreprise.tn` et connectez-vous avec les identifiants admin définis dans `config.env`.

---

## Ce que fait le script deploy.sh

### Hardening système

| Action | Détail |
|--------|--------|
| **SSH** | Port personnalisé, root par clé uniquement, max 3 tentatives |
| **Firewall (UFW)** | Seuls les ports SSH, 80, 443 sont ouverts |
| **Fail2ban** | Ban 2h après 3 échecs SSH |
| **Sysctl** | Protection anti-spoofing, désactivation redirections ICMP |
| **Auto-updates** | Mises à jour de sécurité automatiques quotidiennes |
| **Logs** | Rotation automatique sur 14 jours |
| **Docker** | Logs limités à 10 Mo × 3 fichiers par conteneur |

### Nginx

| Fonctionnalité | Détail |
|----------------|--------|
| **Reverse proxy** | Vers Next.js sur le port 3000 |
| **SSL/TLS** | Let's Encrypt avec renouvellement auto |
| **HSTS** | Activé |
| **Rate limiting** | 5 req/min sur /login, 30 req/min sur /api |
| **Headers sécurité** | X-Frame-Options, X-Content-Type-Options, CSP |
| **Gzip** | Compression activée |
| **Cache** | Assets statiques (_next/static) en cache 1 an |

### Backups

- **Fréquence** : Quotidienne (configurable via `BACKUP_CRON_HOUR`)
- **Format** : SQL compressé gzip
- **Rétention** : 30 jours (configurable)
- **Emplacement** : `/opt/hr-credit/backups/`

### Crons automatiques

| Cron | Fréquence | Action |
|------|-----------|--------|
| Échéances en retard | Tous les jours 6h | Marque les échéances dépassées |
| Sessions expirées | Toutes les heures | Nettoie les sessions JWT expirées |
| Backup BDD | Tous les jours 2h | Dump PostgreSQL compressé |
| Renouvellement SSL | Toutes les 12h | Certbot renew |

---

## Commandes utiles

### Gestion des services

```bash
cd /opt/hr-credit

# Voir l'état des services
docker compose ps

# Voir les logs en temps réel
docker compose logs -f
docker compose logs -f app        # logs app uniquement
docker compose logs -f postgres   # logs BDD uniquement

# Redémarrer un service
docker compose restart app
docker compose restart nginx

# Arrêter / Démarrer tout
docker compose down
docker compose up -d
```

### Base de données

```bash
# Accéder à PostgreSQL
docker exec -it hr-credit-db psql -U hr_credit_user -d hr_credit

# Backup manuel
docker exec hr-credit-db pg_dump -U hr_credit_user hr_credit | gzip > backup_manual.sql.gz

# Restaurer un backup
gunzip -c backup_file.sql.gz | docker exec -i hr-credit-db psql -U hr_credit_user -d hr_credit
```

### Mise à jour de l'application

```bash
cd /opt/hr-credit

# Récupérer la dernière version
git pull origin main
# Ou copier les fichiers manuellement

# Rebuild et redémarrer
docker compose build app
docker compose up -d app
```

### SSL

```bash
# Vérifier le certificat
docker compose exec certbot certbot certificates

# Forcer le renouvellement
docker compose run --rm certbot certbot renew --force-renewal
docker compose restart nginx
```

---

## Structure des fichiers

```
self-hosted/
├── config.env                  # ← VOTRE CONFIGURATION (ne pas commiter)
├── config.env.example          # Template de configuration
├── docker-compose.yml          # Orchestration Docker
├── DEPLOIEMENT.md              # Ce fichier
│
├── app/                        # Application Next.js
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── app/                # Pages (auth, dashboard, admin)
│   │   ├── components/         # Composants UI
│   │   ├── hooks/              # Hook useAuth
│   │   ├── lib/
│   │   │   ├── db.ts           # Connexion PostgreSQL directe
│   │   │   ├── auth.ts         # JWT + bcrypt (local)
│   │   │   ├── audit.ts        # Journalisation
│   │   │   └── utils.ts        # Calculs métier
│   │   └── types/              # Types TypeScript
│   └── ...
│
├── db/
│   └── init.sql                # Schema PostgreSQL complet
│
├── nginx/
│   ├── nginx.conf              # Configuration globale Nginx
│   └── conf.d/app.conf         # Vhost de l'application
│
└── scripts/
    ├── deploy.sh               # Script de déploiement complet
    ├── seed-admin.sh           # Créer le compte admin
    ├── seed.sql                # Données initiales
    └── backup.sh               # Script de backup quotidien
```

## Dépendances

**Zéro service cloud.** Tout fonctionne sur votre VPS :

| Composant | Technologie | Rôle |
|-----------|-------------|------|
| Frontend + API | Next.js 14 + TypeScript | Application monolithique |
| Base de données | PostgreSQL 16 | Stockage des données |
| Auth | JWT + bcrypt (local) | Authentification sans service tiers |
| Reverse proxy | Nginx | SSL, rate limiting, headers sécurité |
| SSL | Let's Encrypt + Certbot | Certificats HTTPS gratuits |
| Backups | pg_dump + cron | Sauvegarde quotidienne |
| Conteneurisation | Docker + Docker Compose | Isolation et reproductibilité |

## Dépannage

### L'application ne démarre pas

```bash
docker compose logs app
# Vérifier la connexion à PostgreSQL
docker exec hr-credit-app wget -qO- http://localhost:3000/
```

### PostgreSQL refuse les connexions

```bash
docker compose logs postgres
# Vérifier que le conteneur est healthy
docker inspect hr-credit-db | jq '.[0].State.Health'
```

### Certificat SSL non généré

```bash
# Vérifier que le DNS pointe vers le serveur
dig +short credit.entreprise.tn

# Vérifier que le port 80 est ouvert
curl -I http://credit.entreprise.tn/.well-known/acme-challenge/test

# Relancer la génération
docker compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot -d credit.entreprise.tn
```

### Échéances non marquées en retard

```bash
# Exécuter manuellement
docker exec hr-credit-db psql -U hr_credit_user -d hr_credit -c "SELECT mark_overdue_echeances();"
```

## Sécurité

### Checklist post-déploiement

- [ ] Changer le mot de passe admin après la première connexion
- [ ] Configurer une clé SSH pour l'utilisateur `deployer`
- [ ] Désactiver `PasswordAuthentication` dans `/etc/ssh/sshd_config`
- [ ] Vérifier que seuls les ports SSH, 80, 443 sont ouverts (`ufw status`)
- [ ] Vérifier que fail2ban fonctionne (`fail2ban-client status sshd`)
- [ ] Tester un backup et sa restauration
- [ ] Configurer une alerte de monitoring (UptimeRobot, Hetrixtools, etc.)
