#!/bin/bash

#############################################
# Script de backup automatique MongoDB
# Usage: ./scripts/backup-mongodb.sh
#############################################

set -e

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/mongodb"
RETENTION_DAYS=7

# Charger les variables d'environnement
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Créer le dossier de backup
mkdir -p "$BACKUP_DIR"

echo "🔄 Début du backup MongoDB..."
echo "📅 Date: $TIMESTAMP"

# Effectuer le backup avec mongodump
if command -v mongodump &> /dev/null; then
  BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP"
  
  mongodump \
    --uri="$MONGO_URI" \
    --db="$MONGO_DB_NAME" \
    --out="$BACKUP_FILE" \
    --gzip
  
  echo "✅ Backup créé: $BACKUP_FILE"
  
  # Créer une archive tar.gz
  cd "$BACKUP_DIR"
  tar -czf "backup_$TIMESTAMP.tar.gz" "backup_$TIMESTAMP"
  rm -rf "backup_$TIMESTAMP"
  cd - > /dev/null
  
  echo "📦 Archive créée: backup_$TIMESTAMP.tar.gz"
  
  # Nettoyer les anciens backups
  find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
  echo "🧹 Backups de plus de $RETENTION_DAYS jours supprimés"
  
  # Afficher la taille du backup
  BACKUP_SIZE=$(du -h "$BACKUP_DIR/backup_$TIMESTAMP.tar.gz" | cut -f1)
  echo "💾 Taille du backup: $BACKUP_SIZE"
  
  echo "🎉 Backup terminé avec succès!"
else
  echo "❌ Erreur: mongodump n'est pas installé"
  echo "   Installation: https://www.mongodb.com/try/download/database-tools"
  exit 1
fi
