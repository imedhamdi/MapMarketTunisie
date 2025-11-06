#!/bin/bash

###############################################
# Script de test de sécurité du monitoring
# Valide que les endpoints sont correctement protégés
###############################################

set -e

API_URL="${API_URL:-http://localhost:4000}"
VALID_TOKEN="${MONITORING_TOKEN:-dev-monitoring-token-change-in-production}"

echo "🧪 Tests de sécurité du monitoring API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
PASSED=0
FAILED=0

# Fonction de test
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    local extra_args="$4"
    
    echo -n "  ➤ $name ... "
    
    # Utiliser eval pour interpréter correctement les arguments
    if [ -n "$extra_args" ]; then
        http_code=$(eval curl -s -o /dev/null -w "%{http_code}" $extra_args "$url")
    else
        http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    fi
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $http_code)"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "1️⃣  Endpoints publics (doivent rester accessibles)"
echo ""
test_endpoint "GET /health sans auth" "$API_URL/health" 200
test_endpoint "GET /ready sans auth" "$API_URL/ready" 200
echo ""

echo "2️⃣  Endpoint /metrics SANS token (doit échouer)"
echo ""
test_endpoint "GET /metrics sans token" "$API_URL/metrics" 401
test_endpoint "GET /metrics avec mauvais token" "$API_URL/metrics" 403 '-H "X-Monitoring-Token: wrong-token"'
echo ""

echo "3️⃣  Endpoint /metrics AVEC token (doit réussir)"
echo ""
test_endpoint "GET /metrics avec header token" "$API_URL/metrics" 200 '-H "X-Monitoring-Token: '"$VALID_TOKEN"'"'
test_endpoint "GET /metrics avec query param" "$API_URL/metrics?token=$VALID_TOKEN" 200
echo ""

echo "4️⃣  Vérification du contenu des réponses"
echo ""

# Test contenu /metrics avec token valide
echo -n "  ➤ /metrics retourne des métriques valides ... "
response=$(curl -s -H "X-Monitoring-Token: $VALID_TOKEN" "$API_URL/metrics")
if echo "$response" | jq -e '.data.memory' > /dev/null 2>&1 && \
   echo "$response" | jq -e '.data.uptime' > /dev/null 2>&1 && \
   echo "$response" | jq -e '.data.process' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "     Response: $response"
    FAILED=$((FAILED + 1))
fi

# Test que /metrics sans token ne fuit pas d'info
echo -n "  ➤ /metrics sans token ne fuite pas d'info sensible ... "
response=$(curl -s "$API_URL/metrics")
if echo "$response" | jq -e '.data.memory' > /dev/null 2>&1; then
    echo -e "${RED}✗ FAIL${NC} (Données sensibles exposées!)"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Résumé
TOTAL=$((PASSED + FAILED))
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Tous les tests sont passés!${NC} ($PASSED/$TOTAL)"
    echo ""
    echo "✅ La sécurité du monitoring est correctement configurée."
    exit 0
else
    echo -e "${RED}✗ Certains tests ont échoué${NC} ($FAILED/$TOTAL échoués)"
    echo ""
    echo "⚠️  Vérifiez la configuration de sécurité du monitoring."
    exit 1
fi
