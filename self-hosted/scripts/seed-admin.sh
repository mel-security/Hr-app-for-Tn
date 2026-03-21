#!/bin/bash
# ==============================================
# HR CRÉDIT - Créer le compte administrateur
# À exécuter après le premier démarrage
# ==============================================

set -euo pipefail

# Charger la config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../config.env"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERREUR: config.env non trouvé"
    exit 1
fi

source "$CONFIG_FILE"

echo "========================================"
echo " HR CRÉDIT - Création du compte admin"
echo "========================================"
echo ""
echo " Email:  ${ADMIN_EMAIL}"
echo " Nom:    ${ADMIN_PRENOM} ${ADMIN_NOM}"
echo ""

# Hasher le mot de passe avec le conteneur app
HASH=$(docker exec hr-credit-app node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('${ADMIN_PASSWORD}', 12).then(h => console.log(h));
")

if [ -z "$HASH" ]; then
    echo "ERREUR: Impossible de hasher le mot de passe"
    exit 1
fi

# Insérer l'admin dans la base
docker exec hr-credit-db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "
INSERT INTO users (email, password_hash, nom, prenom, role, salaire_net, plafond_credit)
VALUES (
    '${ADMIN_EMAIL}',
    '${HASH}',
    '${ADMIN_NOM}',
    '${ADMIN_PRENOM}',
    'admin',
    0,
    0
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = 'admin';
"

echo ""
echo "Compte admin créé avec succès!"
echo "Connectez-vous sur https://${DOMAIN} avec:"
echo "  Email: ${ADMIN_EMAIL}"
echo "  Mot de passe: (celui défini dans config.env)"
echo ""
