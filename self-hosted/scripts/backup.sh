#!/bin/bash
# ==============================================
# HR CRÉDIT - Script de backup PostgreSQL
# Exécuté quotidiennement par le conteneur backup
# ==============================================

set -euo pipefail

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="hr_credit_${DATE}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

echo "[$(date)] Démarrage du backup..."

# Dump compressé
pg_dump -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}" | gzip > "${BACKUP_DIR}/${FILENAME}"

# Vérification
if [ -f "${BACKUP_DIR}/${FILENAME}" ]; then
    SIZE=$(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)
    echo "[$(date)] Backup réussi: ${FILENAME} (${SIZE})"
else
    echo "[$(date)] ERREUR: Backup échoué!"
    exit 1
fi

# Nettoyage des anciens backups
echo "[$(date)] Nettoyage des backups de plus de ${RETENTION_DAYS} jours..."
find "${BACKUP_DIR}" -name "hr_credit_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

REMAINING=$(ls -1 "${BACKUP_DIR}"/hr_credit_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] ${REMAINING} backup(s) conservé(s)."
echo "[$(date)] Backup terminé."
