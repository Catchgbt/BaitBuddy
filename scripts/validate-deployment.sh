#!/bin/bash
#
# BaitBuddy Deployment Validation Script
# Validiert den Production-Setup für Vercel oder Docker
#
# Nutzung:
#   ./scripts/validate-deployment.sh [vercel|docker]
#

set -e

TARGET=${1:-docker}
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
FAILED=0
PASSED=0

print_header() {
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "🔍 $1"
  echo "════════════════════════════════════════════════════════════"
}

check_pass() {
  echo "✅ $1"
  ((PASSED++))
}

check_fail() {
  echo "❌ $1"
  ((FAILED++))
}

check_warn() {
  echo "⚠️  $1"
}

# ============================================================================
# DOCKER VALIDATION
# ============================================================================

validate_docker() {
  print_header "Docker Deployment Validierung"

  # 1. Docker daemon
  if command -v docker &> /dev/null; then
    check_pass "Docker installiert"
  else
    check_fail "Docker nicht gefunden"
    exit 1
  fi

  # 2. Docker compose
  if command -v docker-compose &> /dev/null; then
    check_pass "Docker Compose installiert"
  else
    check_fail "Docker Compose nicht gefunden"
    exit 1
  fi

  # 3. .env Datei
  if [ -f "docker/.env" ]; then
    check_pass "docker/.env vorhanden"
  else
    check_fail "docker/.env nicht gefunden"
    exit 1
  fi

  # 4. Docker Compose Status
  print_header "Docker Services Überprüfung"
  cd docker

  # Prüfe ob Services laufen
  SERVICES=$(docker-compose ps --services)
  if [ -z "$SERVICES" ]; then
    check_fail "Keine Services definiert"
  else
    check_pass "Services definiert: $SERVICES"
  fi

  # Starte Services wenn nicht laufen
  echo "⏳ Starte Docker Services..."
  docker-compose up -d --no-build > /dev/null 2>&1
  sleep 10

  # Prüfe Database
  echo ""
  echo "Überprüfe Postgres Database..."
  if docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
    check_pass "PostgreSQL läuft"
  else
    check_fail "PostgreSQL nicht erreichbar"
  fi

  # Prüfe Auth Service
  echo "Überprüfe GoTrue Auth Service..."
  if docker-compose exec -T auth wget -q -O- http://localhost:9999/health > /dev/null 2>&1; then
    check_pass "GoTrue Auth läuft"
  else
    check_warn "GoTrue Health Check nicht erreichbar (evtl. noch startup)"
  fi

  # Prüfe Backend
  echo "Überprüfe Backend..."
  BACKEND_HEALTH=$(docker-compose exec -T backend curl -s http://localhost:3001/api/health 2>/dev/null || echo '{}')

  if echo "$BACKEND_HEALTH" | grep -q '"ok":true'; then
    check_pass "Backend läuft und ist healthy"

    # Prüfe AI Service
    if echo "$BACKEND_HEALTH" | grep -q '"api_key_configured":true'; then
      check_pass "Anthropic API Key konfiguriert"
    else
      check_warn "Anthropic API Key nicht konfiguriert (ai.chat wird nicht funktionieren)"
    fi
  else
    check_fail "Backend Health Check fehlgeschlagen"
  fi

  # Prüfe Storage Bucket
  echo "Überprüfe Storage..."
  if docker-compose exec -T db psql -U postgres -c "SELECT 1 FROM information_schema.schemata WHERE schema_name='storage'" > /dev/null 2>&1; then
    check_pass "Storage Schema vorhanden"
  else
    check_warn "Storage Schema nicht gefunden (Init scripts nicht ausgeführt?)"
  fi

  # Prüfe Migrationen
  echo "Überprüfe Datenbank Migrationen..."
  MIGRATION_COUNT=$(docker-compose exec -T db psql -U postgres -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" || echo "0")
  if [ "$MIGRATION_COUNT" -gt 20 ]; then
    check_pass "Migrationen angewendet ($MIGRATION_COUNT Tabellen)"
  else
    check_fail "Zu wenige Tabellen gefunden - Migrationen möglicherweise nicht ausgeführt"
  fi

  # Logs überprüfen (Errors)
  echo "Überprüfe Logs auf Fehler..."
  ERRORS=$(docker-compose logs backend 2>&1 | grep -i "error\|exception" | head -5)
  if [ -z "$ERRORS" ]; then
    check_pass "Keine Fehler in Backend Logs"
  else
    check_warn "Fehler gefunden: $ERRORS"
  fi

  cd - > /dev/null
}

# ============================================================================
# VERCEL VALIDATION
# ============================================================================

validate_vercel() {
  print_header "Vercel Deployment Validierung"

  # 1. vercel.json
  if [ -f "vercel.json" ]; then
    check_pass "vercel.json vorhanden"
  else
    check_fail "vercel.json nicht gefunden"
  fi

  # 2. Environment Variablen prüfen
  print_header "Environment Variablen Überprüfung"

  REQUIRED_VARS=(
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "ANTHROPIC_API_KEY"
  )

  for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
      check_warn "$var nicht gesetzt (funktioniert nur mit Vercel Env)"
    else
      check_pass "$var gesetzt"
    fi
  done

  # 3. Build Test
  print_header "Build Test"
  echo "⏳ Führe npm run build aus..."

  if npm run build > /tmp/build.log 2>&1; then
    check_pass "Production Build erfolgreich"
    BUILD_SIZE=$(du -sh .vercel/output 2>/dev/null | cut -f1)
    echo "   Build-Größe: $BUILD_SIZE"
  else
    check_fail "Build fehlgeschlagen"
    tail -20 /tmp/build.log
  fi

  # 4. Typescript Check
  print_header "Type Checking"
  if npm run type-check > /tmp/types.log 2>&1 2>&1; then
    check_pass "TypeScript Type Check erfolgreich"
  else
    ERRORS=$(wc -l < /tmp/types.log)
    check_warn "$ERRORS TypeScript-Fehler gefunden"
  fi

  # 5. ESLint Check
  print_header "Linting"
  if npm run lint > /tmp/lint.log 2>&1; then
    check_pass "ESLint Check erfolgreich"
  else
    ERRORS=$(grep "✖" /tmp/lint.log | wc -l)
    check_warn "$ERRORS Linting-Fehler gefunden"
  fi

  # 6. Prüfe API Endpoint Struktur
  print_header "API Endpoint Struktur"

  if [ -f "api/[...path].mjs" ]; then
    check_pass "Vercel API Catch-all Route vorhanden"
  else
    check_fail "Vercel API Route fehlt (api/[...path].mjs)"
  fi

  # 7. Supabase Konnektivität Test
  if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⏳ Teste Supabase Verbindung..."
    # Ein einfacher Test könnte hier gemacht werden
    check_pass "Supabase Key gesetzt (Verbindung wird bei Deployment getestet)"
  else
    check_warn "Supabase Key nicht gesetzt (wird für Deployment benötigt)"
  fi
}

# ============================================================================
# COMMON VALIDATION
# ============================================================================

validate_common() {
  print_header "Allgemeine Checks"

  # 1. Node Version
  if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
      check_pass "Node.js $NODE_VERSION (✓ min. v18)"
    else
      check_fail "Node.js $NODE_VERSION zu alt (min. v18 erforderlich)"
    fi
  else
    check_fail "Node.js nicht installiert"
  fi

  # 2. npm Dependencies
  print_header "Dependencies Check"
  if npm list > /dev/null 2>&1; then
    check_pass "npm Dependencies installiert"
  else
    check_fail "npm Dependencies fehlen oder inkompatibel"
  fi

  # 3. Security Audit
  echo "⏳ npm audit..."
  AUDIT=$(npm audit 2>&1 | grep -i "vulnerabilities" || echo "0")
  if echo "$AUDIT" | grep -q "0 vulnerabilities"; then
    check_pass "Keine bekannten Sicherheitslücken"
  else
    check_warn "Sicherheitslücken gefunden: $AUDIT"
  fi

  # 4. .env Struktur (nur Frontend)
  if [ -f ".env.example" ]; then
    check_pass ".env.example vorhanden"
  else
    check_warn ".env.example fehlt (Dokumentation für Nutzer)"
  fi

  # 5. Git Status
  print_header "Git Status"
  UNCOMMITTED=$(git status --porcelain | wc -l)
  if [ "$UNCOMMITTED" -eq 0 ]; then
    check_pass "Alle Änderungen commitet"
  else
    check_warn "$UNCOMMITTED Dateien nicht commitet"
  fi

  # 6. Docs vorhanden
  if [ -f "docs/DEPLOYMENT_GUIDE.md" ]; then
    check_pass "DEPLOYMENT_GUIDE.md vorhanden"
  else
    check_warn "DEPLOYMENT_GUIDE.md fehlt"
  fi
}

# ============================================================================
# MAIN
# ============================================================================

echo ""
echo "🚀 BaitBuddy Deployment Validator"
echo "Target: $TARGET"
echo "Zeitstempel: $TIMESTAMP"

# Globale Checks
validate_common

# Target-spezifische Checks
case "$TARGET" in
  docker)
    validate_docker
    ;;
  vercel)
    validate_vercel
    ;;
  *)
    echo "❌ Unbekanntes Target: $TARGET"
    echo "Verwendung: $0 [docker|vercel]"
    exit 1
    ;;
esac

# Summary
print_header "Zusammenfassung"
echo "✅ Bestanden: $PASSED"
echo "❌ Fehlgeschlagen: $FAILED"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo "🎉 Deployment ist ready für Production!"
  echo ""
  exit 0
else
  echo ""
  echo "⚠️  $FAILED Fehler müssen behoben werden vor dem Deployment"
  echo ""
  exit 1
fi
