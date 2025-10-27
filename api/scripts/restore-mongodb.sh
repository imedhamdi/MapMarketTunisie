#!/bin/bash

#############################################
# Script de restauration MongoDB
# Usage: ./scripts/restore-mongodb.sh <backup_file>
# Exemple: ./scripts/restore-mongodb.sh backups/mongodb/backup_20241027_143000.tar.gz
#############################################

set -e

if [ -z "$1" ]; then
  echo "❌ Erreur: Veuillez spécifier le fichier de backup"
  echo "Usage: $0 <backup_file>"
  echo "Exemple: $0 backups/mongodb/backup_20241027_143000.tar.gz"
  exit 1
fi

BACKUP_FILE="$1"
TEMP_DIR="./backups/temp_restore"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Erreur: Le fichier $BACKUP_FILE n'existe pas"
  exit 1
fi

# Charger les variables d'environnement
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "⚠️  ATTENTION: Cette opération va ÉCRASER la base de données actuelle"
echo "📁 Fichier de backup: $BACKUP_FILE"
echo "🗄️  Base de données: $MONGO_DB_NAME"
read -p "Êtes-vous sûr de vouloir continuer? (oui/non): " -r
echo

if [[ ! $REPLY =~ ^[Oo][Uu][Ii]$ ]]; then
  echo "❌ Restauration annulée"
  exit 0
fi

echo "🔄 Début de la restauration..."

# Créer un dossier temporaire
mkdir -p "$TEMP_DIR"

# Extraire l'archive
echo "📦 Extraction de l'archive..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Trouver le dossier extrait
EXTRACTED_DIR=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)

if [ -z "$EXTRACTED_DIR" ]; then
  echo "❌ Erreur: Aucun dossier trouvé dans l'archive"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Effectuer la restauration avec mongorestore
if command -v mongorestore &> /dev/null; then
  mongorestore \
    --uri="$MONGO_URI" \
    --db="$MONGO_DB_NAME" \
    --drop \
    --gzip \
    "$EXTRACTED_DIR/$MONGO_DB_NAME"
  
  echo "✅ Restauration terminée avec succès!"
else
  echo "❌ Erreur: mongorestore n'est pas installé"
  echo "   Installation: https://www.mongodb.com/try/download/database-tools"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Nettoyer
rm -rf "$TEMP_DIR"
echo "🧹 Fichiers temporaires nettoyés"
echo "🎉 Restauration terminée!"
