#!/bin/bash
# ================================================================
# HR CRÉDIT - Script de déploiement VPS complet
# ================================================================
# Ce script configure une VM Ubuntu 22.04+ depuis zéro :
#   1. Hardening système (SSH, firewall, fail2ban, etc.)
#   2. Installation des dépendances (Docker, Docker Compose)
#   3. Configuration de l'application
#   4. Démarrage des services
#   5. Génération des certificats SSL
#   6. Création du compte admin
#
# Usage:
#   chmod +x deploy.sh
#   sudo ./deploy.sh
#
# Prérequis:
#   - Ubuntu 22.04 LTS (ou 24.04)
#   - Accès root
#   - config.env rempli avec vos valeurs
# ================================================================

set -euo pipefail

# ======================== COULEURS ==============================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ======================== VÉRIFICATIONS =========================
if [ "$EUID" -ne 0 ]; then
    log_error "Ce script doit être exécuté en tant que root (sudo ./deploy.sh)"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="${PROJECT_DIR}/config.env"

if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Fichier config.env non trouvé dans ${PROJECT_DIR}"
    log_error "Copiez config.env.example vers config.env et remplissez les valeurs."
    exit 1
fi

source "$CONFIG_FILE"

# Vérifier les variables obligatoires
REQUIRED_VARS=(DOMAIN POSTGRES_PASSWORD JWT_SECRET ADMIN_EMAIL ADMIN_PASSWORD SSH_PORT DEPLOY_USER LETSENCRYPT_EMAIL)
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ] || [[ "${!var}" == *"CHANGEZ_MOI"* ]] || [[ "${!var}" == "YOUR_"* ]]; then
        log_error "Variable ${var} non configurée dans config.env"
        exit 1
    fi
done

echo ""
echo "================================================================"
echo "   HR CRÉDIT - Déploiement VPS"
echo "================================================================"
echo ""
echo "  Domaine:        ${DOMAIN}"
echo "  Port SSH:       ${SSH_PORT}"
echo "  Utilisateur:    ${DEPLOY_USER}"
echo "  Admin email:    ${ADMIN_EMAIL}"
echo "  Timezone:       ${TIMEZONE}"
echo ""
echo "================================================================"
echo ""
read -p "Continuer ? (o/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Oo]$ ]]; then
    exit 0
fi

# ================================================================
# ÉTAPE 1 : MISE À JOUR SYSTÈME
# ================================================================
log_info "=== ÉTAPE 1/8 : Mise à jour du système ==="

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    curl wget gnupg lsb-release ca-certificates \
    ufw fail2ban unattended-upgrades apt-listchanges \
    logrotate htop net-tools jq

log_ok "Système mis à jour"

# ================================================================
# ÉTAPE 2 : HARDENING SYSTÈME
# ================================================================
log_info "=== ÉTAPE 2/8 : Hardening système ==="

# --- Timezone ---
timedatectl set-timezone "${TIMEZONE}"
log_ok "Timezone: ${TIMEZONE}"

# --- Créer l'utilisateur de déploiement ---
if ! id "${DEPLOY_USER}" &>/dev/null; then
    useradd -m -s /bin/bash -G sudo "${DEPLOY_USER}"
    log_ok "Utilisateur ${DEPLOY_USER} créé"
fi

# --- Configuration SSH ---
SSH_CONFIG="/etc/ssh/sshd_config"
cp "$SSH_CONFIG" "${SSH_CONFIG}.backup.$(date +%Y%m%d)"

# Port SSH personnalisé
sed -i "s/^#\?Port .*/Port ${SSH_PORT}/" "$SSH_CONFIG"

# Désactiver le login root par mot de passe
sed -i "s/^#\?PermitRootLogin .*/PermitRootLogin prohibit-password/" "$SSH_CONFIG"

# Désactiver l'authentification par mot de passe (clé SSH uniquement)
# Commenté par défaut — décommenter quand la clé SSH est en place
# sed -i "s/^#\?PasswordAuthentication .*/PasswordAuthentication no/" "$SSH_CONFIG"

# Paramètres de sécurité SSH
cat >> "$SSH_CONFIG" << 'SSHEOF'

# --- HR Crédit hardening ---
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 60
AllowAgentForwarding no
AllowTcpForwarding no
X11Forwarding no
SSHEOF

systemctl restart sshd
log_ok "SSH configuré sur le port ${SSH_PORT}"

# --- Firewall (UFW) ---
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp" comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable
log_ok "Firewall activé (ports: ${SSH_PORT}, 80, 443)"

# --- Fail2ban ---
cat > /etc/fail2ban/jail.local << JAILEOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ${SSH_PORT}
maxretry = 3
bantime = 7200
JAILEOF

systemctl enable fail2ban
systemctl restart fail2ban
log_ok "Fail2ban configuré"

# --- Désactiver IPv6 si non utilisé ---
cat >> /etc/sysctl.conf << 'SYSCTLEOF'

# HR Crédit - Hardening réseau
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
SYSCTLEOF
sysctl -p > /dev/null 2>&1
log_ok "Hardening réseau appliqué"

# --- Mises à jour automatiques de sécurité ---
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'AUTOEOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
AUTOEOF

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'UNATTEOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
UNATTEOF
log_ok "Mises à jour automatiques de sécurité activées"

# --- Logrotate pour l'application ---
cat > /etc/logrotate.d/hr-credit << 'LOGEOF'
/opt/hr-credit/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 root root
}
LOGEOF
log_ok "Logrotate configuré"

# ================================================================
# ÉTAPE 3 : INSTALLATION DOCKER
# ================================================================
log_info "=== ÉTAPE 3/8 : Installation de Docker ==="

if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker "${DEPLOY_USER}"
    log_ok "Docker installé"
else
    log_ok "Docker déjà installé"
fi

# Docker Compose plugin
if ! docker compose version &> /dev/null; then
    apt-get install -y -qq docker-compose-plugin
    log_ok "Docker Compose plugin installé"
else
    log_ok "Docker Compose déjà installé"
fi

# Activer Docker au démarrage
systemctl enable docker
systemctl start docker

# Limiter les logs Docker
cat > /etc/docker/daemon.json << 'DOCKEREOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true
}
DOCKEREOF
systemctl restart docker
log_ok "Docker configuré avec limits de logs"

# ================================================================
# ÉTAPE 4 : PRÉPARATION DES RÉPERTOIRES
# ================================================================
log_info "=== ÉTAPE 4/8 : Préparation des répertoires ==="

INSTALL_DIR="/opt/hr-credit"
mkdir -p "${INSTALL_DIR}"
mkdir -p "${BACKUP_DIR:-/opt/hr-credit/backups}"
mkdir -p "${LOG_DIR:-/opt/hr-credit/logs}"

# Copier les fichiers du projet
cp -r "${PROJECT_DIR}/." "${INSTALL_DIR}/"

# Permissions
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${INSTALL_DIR}"
chmod 600 "${INSTALL_DIR}/config.env"
chmod +x "${INSTALL_DIR}/scripts/"*.sh

log_ok "Fichiers installés dans ${INSTALL_DIR}"

# ================================================================
# ÉTAPE 5 : BUILD ET DÉMARRAGE
# ================================================================
log_info "=== ÉTAPE 5/8 : Build et démarrage des services ==="

cd "${INSTALL_DIR}"

# Build de l'application
docker compose build --no-cache
log_ok "Build terminé"

# Démarrer PostgreSQL d'abord
docker compose up -d postgres
log_info "Attente de PostgreSQL..."
sleep 10

# Démarrer l'application
docker compose up -d app
log_info "Attente de l'application..."
sleep 10

log_ok "Services démarrés"

# ================================================================
# ÉTAPE 6 : CERTIFICAT SSL
# ================================================================
log_info "=== ÉTAPE 6/8 : Certificat SSL ==="

# Démarrer Nginx en mode HTTP uniquement d'abord
docker compose up -d nginx

# Obtenir le certificat Let's Encrypt
log_info "Obtention du certificat SSL pour ${DOMAIN}..."

docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "${LETSENCRYPT_EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN}" \
    || {
        log_warn "Impossible d'obtenir le certificat SSL."
        log_warn "Vérifiez que le domaine ${DOMAIN} pointe vers ce serveur."
        log_warn "L'application fonctionnera en HTTP en attendant."
    }

# Si le certificat existe, activer HTTPS dans Nginx
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"
if docker compose exec nginx test -f "${CERT_PATH}/fullchain.pem" 2>/dev/null; then
    # Activer la config SSL dans nginx
    sed -i "s|# server_name credit.entreprise.tn;|server_name ${DOMAIN};|" \
        "${INSTALL_DIR}/nginx/conf.d/app.conf"
    sed -i "s|# ssl_certificate /etc/letsencrypt/live/credit.entreprise.tn/fullchain.pem;|ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;|" \
        "${INSTALL_DIR}/nginx/conf.d/app.conf"
    sed -i "s|# ssl_certificate_key /etc/letsencrypt/live/credit.entreprise.tn/privkey.pem;|ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;|" \
        "${INSTALL_DIR}/nginx/conf.d/app.conf"

    docker compose restart nginx
    log_ok "SSL activé pour ${DOMAIN}"
else
    log_warn "SSL non activé — certificat non trouvé"
fi

# ================================================================
# ÉTAPE 7 : CRÉATION DU COMPTE ADMIN
# ================================================================
log_info "=== ÉTAPE 7/8 : Création du compte administrateur ==="

# Attendre que l'app soit prête
for i in {1..30}; do
    if docker exec hr-credit-app wget -q --spider http://localhost:3000/ 2>/dev/null; then
        break
    fi
    sleep 2
done

bash "${INSTALL_DIR}/scripts/seed-admin.sh" || log_warn "Création admin échouée — faites-le manuellement"

log_ok "Compte admin créé"

# ================================================================
# ÉTAPE 8 : DÉMARRAGE DU BACKUP
# ================================================================
log_info "=== ÉTAPE 8/8 : Configuration des backups ==="

docker compose up -d backup
log_ok "Backup quotidien configuré (${BACKUP_CRON_HOUR:-2}h00)"

# ================================================================
# CRON : Échéances en retard + nettoyage sessions
# ================================================================
cat > /etc/cron.d/hr-credit << CRONEOF
# Marquer les échéances en retard (tous les jours à 6h)
0 6 * * * root docker exec hr-credit-db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "SELECT mark_overdue_echeances();" > /dev/null 2>&1

# Nettoyer les sessions expirées (toutes les heures)
0 * * * * root docker exec hr-credit-db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "SELECT cleanup_expired_sessions();" > /dev/null 2>&1
CRONEOF
chmod 644 /etc/cron.d/hr-credit
log_ok "Crons configurés"

# ================================================================
# RÉSUMÉ FINAL
# ================================================================
echo ""
echo "================================================================"
echo -e "   ${GREEN}DÉPLOIEMENT TERMINÉ !${NC}"
echo "================================================================"
echo ""
echo "  Application:    https://${DOMAIN}"
echo "  Admin:          ${ADMIN_EMAIL}"
echo ""
echo "  Services Docker:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "  Répertoires:"
echo "    Application:  ${INSTALL_DIR}"
echo "    Backups:      ${BACKUP_DIR:-/opt/hr-credit/backups}"
echo "    Logs:         ${LOG_DIR:-/opt/hr-credit/logs}"
echo ""
echo "  SSH:            ssh -p ${SSH_PORT} ${DEPLOY_USER}@${VPS_IP}"
echo ""
echo "  Commandes utiles:"
echo "    cd ${INSTALL_DIR}"
echo "    docker compose logs -f          # Voir les logs"
echo "    docker compose restart app      # Redémarrer l'app"
echo "    docker compose down             # Arrêter tout"
echo "    docker compose up -d            # Démarrer tout"
echo "    ./scripts/backup.sh             # Backup manuel"
echo ""
echo "  IMPORTANT:"
echo "    - Changez le mot de passe admin après la 1ère connexion"
echo "    - Configurez la clé SSH pour ${DEPLOY_USER}"
echo "    - Puis désactivez PasswordAuthentication dans /etc/ssh/sshd_config"
echo ""
echo "================================================================"
