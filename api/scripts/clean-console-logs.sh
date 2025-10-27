#!/bin/bash

###############################################
# Script de nettoyage des console.log
# Supprime tous les console.log/warn/error
# pour la production
###############################################

set -e

echo "🧹 Nettoyage des console.log..."

# Fichiers à nettoyer
FILES=(
    "public/js/app.js"
    "public/js/profile-modal.js"
)

TOTAL_REMOVED=0

for file in "${FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "⚠️  Fichier non trouvé: $file"
        continue
    fi
    
    # Compter avant
    BEFORE=$(grep -c "console\." "$file" 2>/dev/null || echo "0")
    
    # Supprimer les lignes avec console.log, console.warn, console.error
    # Garder console.error pour les vraies erreurs si nécessaire
    sed -i '/^\s*console\.log(/d' "$file"
    sed -i '/^\s*console\.warn(/d' "$file"
    sed -i '/^\s*console\.debug(/d' "$file"
    # Optionnel : garder console.error
    # sed -i '/^\s*console\.error(/d' "$file"
    
    # Compter après
    AFTER=$(grep -c "console\." "$file" 2>/dev/null || echo "0")
    REMOVED=$((BEFORE - AFTER))
    TOTAL_REMOVED=$((TOTAL_REMOVED + REMOVED))
    
    if [ $REMOVED -gt 0 ]; then
        echo "  ✓ $file: $REMOVED console.log supprimés ($BEFORE → $AFTER)"
    fi
done

echo ""
echo "✅ Nettoyage terminé: $TOTAL_REMOVED console.log supprimés au total"
