#!/bin/bash
# Production Setup Script für BaitBuddy Docker
# Erstellt Verzeichnisse, Zertifikate, und .env

set -e

echo "🚀 BaitBuddy Production Setup"
echo "=================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$DOCKER_DIR")"

cd "$DOCKER_DIR"

# ============================================================================
# 1. Prüfe Voraussetzungen
# ============================================================================
echo ""
echo "1️⃣  Prüfe Voraussetzungen..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker nicht installiert"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose nicht installiert"
    exit 1
fi

echo "✅ Docker & Docker Compose vorhanden"

# ============================================================================
# 2. Erstelle Verzeichnisse
# ============================================================================
echo ""
echo "2️⃣  Erstelle Verzeichnisse..."

mkdir -p certbot/conf certbot/www
mkdir -p logs
touch logs/docker.log

echo "✅ Verzeichnisse erstellt"

# ============================================================================
# 3. Kopiere .env
# ============================================================================
echo ""
echo "3️⃣  Konfiguriere .env..."

if [ ! -f .env ]; then
    echo "Kopiere .env.example → .env"
    cp .env.example .env
    echo ""
    echo "⚠️  WICHTIG: Öffne .env und setze diese Secrets:"
    echo "   - POSTGRES_PASSWORD (32+ Zeichen)"
    echo "   - JWT_SECRET (zufällig generiert)"
    echo "   - CRON_SECRET (zufällig generiert)"
    echo "   - ANTHROPIC_API_KEY (sk-ant-xxx)"
    echo ""
    echo "Danach: nano .env"
    exit 1
else
    echo "✅ .env existiert bereits"
fi

# ============================================================================
# 4. Generiere Supabase Keys (falls nicht in .env)
# ============================================================================
echo ""
echo "4️⃣  Prüfe Supabase Keys..."

if grep -q "ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.change_me" .env; then
    echo "⚠️  ANON_KEY und SERVICE_ROLE_KEY müssen generiert werden"
    echo "Führe aus: cd .. && node scripts/generate-keys.mjs"
    echo "Kopiere die Ausgabe in .env"
    exit 1
else
    echo "✅ Supabase Keys scheinen konfiguriert"
fi

# ============================================================================
# 5. Hole deine öffentliche IP
# ============================================================================
echo ""
echo "5️⃣  Notwendige Informationen..."

PUBLIC_IP=$(curl -s https://ifconfig.me 2>/dev/null || echo "UNKNOWN")
echo "Deine öffentliche IP: $PUBLIC_IP"
echo "   (Trage dies in IONOS DNS A-Records ein)"

echo ""
echo "Lokale IP (für Router Port-Forwarding):"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    hostname -I | awk '{print $1}'
elif [[ "$OSTYPE" == "darwin"* ]]; then
    ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}'
else
    echo "Windows: ipconfig (suche nach 192.168.1.x)"
fi

# ============================================================================
# 6. Prüfe Ports
# ============================================================================
echo ""
echo "6️⃣  Prüfe Ports..."

if lsof -Pi :80 -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo "⚠️  Port 80 ist bereits belegt"
    echo "   (Brauchen für Let's Encrypt Zertifikat-Beantragung)"
fi

if lsof -Pi :443 -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo "⚠️  Port 443 ist bereits belegt"
fi

if ! lsof -Pi :3000 -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo "✅ Port 3000 ist frei"
fi

# ============================================================================
# 7. Baue Docker Images
# ============================================================================
echo ""
echo "7️⃣  Baue Docker Images (Kann 5-10 Min dauern)..."

if docker-compose build > logs/docker.log 2>&1; then
    echo "✅ Images gebaut"
else
    echo "❌ Build fehlgeschlagen. Logs:"
    tail -20 logs/docker.log
    exit 1
fi

# ============================================================================
# 8. Summary
# ============================================================================
echo ""
echo "✅ Setup abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo ""
echo "1. Beantrage Let's Encrypt Zertifikat:"
echo "   docker run --rm -it -p 80:80 \\"
echo "     -v \"\$(pwd)/certbot/conf:/etc/letsencrypt\" \\"
echo "     -v \"\$(pwd)/certbot/www:/var/www/certbot\" \\"
echo "     certbot/certbot certonly \\"
echo "     --standalone \\"
echo "     -d catchgbt.com \\"
echo "     -d www.catchgbt.com \\"
echo "     --agree-tos \\"
echo "     --email deine@email.de"
echo ""
echo "2. Starte Docker:"
echo "   docker-compose up -d"
echo ""
echo "3. Konfiguriere Router (Fritz!Box):"
echo "   Port 80 → 3000 (TCP)"
echo "   Port 443 → 3000 (TCP)"
echo ""
echo "4. Aktualisiere DNS bei IONOS:"
echo "   A-Record: @ = $PUBLIC_IP"
echo "   A-Record: www = $PUBLIC_IP"
echo ""
echo "5. Prüfe ob alles läuft:"
echo "   curl https://catchgbt.com/api/health"
echo ""
echo "Dokumentation: docs/PRODUCTION_SETUP.md"
echo ""
