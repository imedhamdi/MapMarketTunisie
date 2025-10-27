#!/bin/bash

###############################################
# Vérification de la correction changePassword
# S'assure que le code est correct
###############################################

set -e

echo "🔍 Vérification de la correction changePassword"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASSED=0
FAILED=0

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

echo "1️⃣  Vérification du code"
echo ""

# Vérifier qu'il n'y a plus de référence à bcryptjs
check "Pas de bcryptjs dans user.controller" "! grep -q 'bcryptjs' src/controllers/user.controller.js"

# Vérifier l'import de userService
check "Import de userService présent" "grep -q 'import.*userService' src/controllers/user.controller.js"

# Vérifier l'utilisation de userService.changePassword
check "Utilise userService.changePassword" "grep -q 'userService.changePassword' src/controllers/user.controller.js"

# Vérifier que le controller se charge sans erreur
check "Controller chargeable" "node -e \"import('./src/controllers/user.controller.js').then(() => process.exit(0)).catch(() => process.exit(1))\""

echo ""
echo "2️⃣  Vérification des tests"
echo ""

# Vérifier que le fichier de test existe
check "Fichier de test existe" "test -f tests/integration/changePassword.test.js"

# Vérifier que le fichier de test n'est pas vide
check "Fichier de test non vide" "test -s tests/integration/changePassword.test.js"

# Compter les scénarios de test
TEST_COUNT=$(grep -c "it('.*" tests/integration/changePassword.test.js || echo "0")
check "Au moins 10 tests ($TEST_COUNT trouvés)" "test $TEST_COUNT -ge 10"

echo ""
echo "3️⃣  Vérification des dépendances"
echo ""

# Vérifier que mocha est installé
check "mocha installé" "npm list mocha --depth=0"

# Vérifier que chai est installé
check "chai installé" "npm list chai --depth=0"

# Vérifier que supertest est installé
check "supertest installé" "npm list supertest --depth=0"

echo ""
echo "4️⃣  Vérification des scripts npm"
echo ""

# Vérifier que le script test existe
check "Script 'test' configuré" "grep -q '\"test\":' package.json"

# Vérifier que le script test:changePassword existe
check "Script 'test:changePassword' configuré" "grep -q '\"test:changePassword\":' package.json"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL=$((PASSED + FAILED))
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Toutes les vérifications sont passées!${NC} ($PASSED/$TOTAL)"
    echo ""
    echo "🎉 La correction est complète et valide!"
    echo ""
    echo "Pour exécuter les tests :"
    echo "  npm run test:changePassword"
    exit 0
else
    echo -e "${RED}❌ Certaines vérifications ont échoué${NC} ($FAILED/$TOTAL échoués)"
    echo ""
    echo "⚠️  Vérifiez les erreurs ci-dessus"
    exit 1
fi
