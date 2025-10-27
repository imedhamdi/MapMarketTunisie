#!/bin/bash

###############################################
# Script de validation de l'externalisation
# Vérifie que tout fonctionne correctement
###############################################

set -e

API_URL="${API_URL:-http://localhost:4000}"

echo "🧪 Validation de l'externalisation des scripts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# Fonction de test
check() {
    local name="$1"
    local command="$2"
    
    echo -n "  ➤ $name ... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "1️⃣  Vérification des fichiers"
echo ""
check "app.js existe" "test -f public/js/app.js"
check "profile-modal.js existe" "test -f public/js/profile-modal.js"
check "app.js n'est pas vide" "test -s public/js/app.js"
check "profile-modal.js n'est pas vide" "test -s public/js/profile-modal.js"
echo ""

echo "2️⃣  Vérification de l'HTML"
echo ""
check "HTML charge app.js" "curl -s $API_URL | grep -q 'src=\"./js/app.js\"'"
check "HTML charge profile-modal.js" "curl -s $API_URL | grep -q 'src=\"./js/profile-modal.js\"'"
check "Pas de <script> inline massif" "! curl -s $API_URL | grep -q 'const cityPos ='"
check "HTML réduit (<2000 lignes)" "test \$(curl -s $API_URL | wc -l) -lt 2000"
echo ""

echo "3️⃣  Vérification CSP"
echo ""
check "CSP script-src sans 'unsafe-inline'" "curl -s $API_URL | grep 'script-src' | grep -q \"'self' https://unpkg.com\" && ! curl -s $API_URL | grep 'script-src' | grep -q 'unsafe-inline'"
echo ""

echo "4️⃣  Vérification console.log"
echo ""
CONSOLE_COUNT_APP=$(grep -c "console\.log\|console\.debug\|console\.warn" public/js/app.js 2>/dev/null || echo "0")
CONSOLE_COUNT_PROFILE=$(grep -c "console\.log\|console\.debug\|console\.warn" public/js/profile-modal.js 2>/dev/null || echo "0")

if [ "$CONSOLE_COUNT_APP" -eq 0 ] && [ "$CONSOLE_COUNT_PROFILE" -eq 0 ]; then
    echo -e "  ➤ Aucun console.log/debug/warn ... ${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "  ➤ Aucun console.log/debug/warn ... ${YELLOW}! WARN${NC}"
    echo "     app.js: $CONSOLE_COUNT_APP, profile-modal.js: $CONSOLE_COUNT_PROFILE"
    echo "     (console.error conservés pour le debugging)"
fi
echo ""

echo "5️⃣  Vérification accessibilité des fichiers"
echo ""
check "app.js accessible" "curl -s -o /dev/null -w '%{http_code}' $API_URL/js/app.js | grep -q '^200$'"
check "profile-modal.js accessible" "curl -s -o /dev/null -w '%{http_code}' $API_URL/js/profile-modal.js | grep -q '^200$'"
echo ""

echo "6️⃣  Statistiques"
echo ""
HTML_SIZE=$(curl -s $API_URL | wc -c)
HTML_LINES=$(curl -s $API_URL | wc -l)
APP_SIZE=$(stat -f%z public/js/app.js 2>/dev/null || stat -c%s public/js/app.js)
PROFILE_SIZE=$(stat -f%z public/js/profile-modal.js 2>/dev/null || stat -c%s public/js/profile-modal.js)

HTML_KB=$((HTML_SIZE / 1024))
APP_KB=$((APP_SIZE / 1024))
PROFILE_KB=$((PROFILE_SIZE / 1024))

echo "  📄 index.html: ${HTML_LINES} lignes, ${HTML_KB} KB"
echo "  📜 app.js: ${APP_KB} KB"
echo "  📜 profile-modal.js: ${PROFILE_KB} KB"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL=$((PASSED + FAILED))
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les tests sont passés!${NC} ($PASSED/$TOTAL)"
    echo ""
    echo "🎉 L'externalisation est réussie!"
    echo ""
    echo "Prochaines étapes :"
    echo "  1. Tester dans le navigateur"
    echo "  2. Vérifier que les fonctionnalités marchent"
    echo "  3. Inspecter la console (aucun console.log ne devrait apparaître)"
    exit 0
else
    echo -e "${RED}❌ Certains tests ont échoué${NC} ($FAILED/$TOTAL échoués)"
    echo ""
    echo "⚠️  Corrigez les erreurs ci-dessus"
    exit 1
fi
