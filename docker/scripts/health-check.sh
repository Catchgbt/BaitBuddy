#!/bin/bash
# Health Check Script für Production-Deployment
# Prüft alle kritischen Komponenten

set -e

echo "🏥 BaitBuddy Health Check"
echo "=========================="
echo ""

DOCKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DOCKER_DIR"

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

check_status=0

# ============================================================================
# 1. Docker Container Status
# ============================================================================
echo "${BLUE}1️⃣  Docker Container Status${NC}"

REQUIRED_CONTAINERS=(
    "baitbuddy-db"
    "baitbuddy-kong"
    "baitbuddy-backend"
    "baitbuddy-nginx-reverse-proxy"
    "baitbuddy-certbot"
)

for container in "${REQUIRED_CONTAINERS[@]}"; do
    if docker ps --filter "name=$container" --format "{{.Names}}" | grep -q "$container"; then
        status=$(docker inspect -f '{{.State.Running}}' "$container")
        if [ "$status" = "true" ]; then
            echo -e "${GREEN}✅ $container${NC}"
        else
            echo -e "${RED}❌ $container (nicht am Laufen)${NC}"
            check_status=1
        fi
    else
        echo -e "${RED}❌ $container (nicht vorhanden)${NC}"
        check_status=1
    fi
done

echo ""

# ============================================================================
# 2. Health Endpoints
# ============================================================================
echo "${BLUE}2️⃣  Health Endpoints${NC}"

# Lokal
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend /health (lokal)${NC}"
else
    echo -e "${RED}❌ Backend /health (lokal)${NC}"
    check_status=1
fi

# Nginx Proxy
if curl -s -k http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx Reverse Proxy /health${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx Reverse Proxy /health (SSL-Fehler OK beim Setup)${NC}"
fi

# Remote (falls Domain erreichbar)
DOMAIN="catchgbt.com"
if curl -s -k https://$DOMAIN/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Remote https://$DOMAIN/api/health${NC}"
else
    echo -e "${YELLOW}⚠️  Remote https://$DOMAIN/api/health (DNS Propagation?)${NC}"
fi

echo ""

# ============================================================================
# 3. Datenbank-Verbindung
# ============================================================================
echo "${BLUE}3️⃣  Datenbank-Verbindung${NC}"

if docker exec baitbuddy-db psql -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL erreichbar${NC}"
else
    echo -e "${RED}❌ PostgreSQL nicht erreichbar${NC}"
    check_status=1
fi

echo ""

# ============================================================================
# 4. SSL/TLS Zertifikat
# ============================================================================
echo "${BLUE}4️⃣  SSL/TLS Zertifikat${NC}"

if [ -f "$DOCKER_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}✅ Zertifikat vorhanden${NC}"

    # Prüfe Ablaufdatum
    expiry=$(openssl x509 -enddate -noout -in "$DOCKER_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" 2>/dev/null | cut -d= -f2)
    echo "   Gültig bis: $expiry"

    # Warnung wenn bald ablauft
    expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || date -j -f "%b %d %T %Z %Y" "$expiry" +%s 2>/dev/null || echo 0)
    now_epoch=$(date +%s)
    days_left=$(( ($expiry_epoch - $now_epoch) / 86400 ))

    if [ $days_left -lt 30 ]; then
        echo -e "${YELLOW}⚠️  Zertifikat läuft bald ab! ($days_left Tage)${NC}"
    elif [ $days_left -lt 0 ]; then
        echo -e "${RED}❌ Zertifikat ist abgelaufen!${NC}"
        check_status=1
    else
        echo -e "${GREEN}   $days_left Tage verbleibend${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Zertifikat nicht vorhanden (noch nicht beantragt?)${NC}"
fi

echo ""

# ============================================================================
# 5. DNS Resolution
# ============================================================================
echo "${BLUE}5️⃣  DNS Resolution${NC}"

if dig +short "$DOMAIN" @8.8.8.8 > /dev/null 2>&1; then
    resolved_ip=$(dig +short "$DOMAIN" @8.8.8.8 | tail -1)
    echo -e "${GREEN}✅ DNS aufgelöst: $DOMAIN → $resolved_ip${NC}"

    # Prüfe ob es die öffentliche IP ist
    public_ip=$(curl -s https://ifconfig.me 2>/dev/null || echo "UNKNOWN")
    if [ "$resolved_ip" = "$public_ip" ]; then
        echo -e "${GREEN}   Passt mit öffentlicher IP: $public_ip${NC}"
    else
        echo -e "${YELLOW}⚠️  IP unterscheidet sich (öffentlich: $public_ip)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  DNS nicht aufgelöst (noch Propagation?)${NC}"
fi

echo ""

# ============================================================================
# 6. Logs auf Fehler prüfen
# ============================================================================
echo "${BLUE}6️⃣  Logs auf Fehler prüfen${NC}"

error_count=0
for container in "${REQUIRED_CONTAINERS[@]}"; do
    if docker ps -a --filter "name=$container" --format "{{.Names}}" | grep -q "$container"; then
        errors=$(docker logs "$container" 2>&1 | grep -i "error" | wc -l)
        if [ $errors -gt 0 ]; then
            echo -e "${YELLOW}⚠️  $container: $errors ERROR-Einträge in Logs${NC}"
            error_count=$((error_count + $errors))
        fi
    fi
done

if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}✅ Keine ERROR-Einträge in Logs${NC}"
else
    echo -e "${YELLOW}⚠️  Insgesamt $error_count ERROR-Einträge${NC}"
fi

echo ""

# ============================================================================
# 7. Performance-Metriken
# ============================================================================
echo "${BLUE}7️⃣  Performance-Metriken${NC}"

docker stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.CPUPerc}}" 2>/dev/null || echo "   (Docker stats nicht verfügbar)"

echo ""

# ============================================================================
# Summary
# ============================================================================
echo "${BLUE}Summary${NC}"
echo "========"

if [ $check_status -eq 0 ]; then
    echo -e "${GREEN}✅ Alle Checks bestanden!${NC}"
    echo ""
    echo "📊 Test-Befehle:"
    echo "  curl http://localhost:3000/health"
    echo "  curl https://catchgbt.com/api/health"
    echo "  docker-compose ps"
    echo "  docker logs baitbuddy-backend -f"
else
    echo -e "${RED}❌ Einige Checks fehlgeschlagen${NC}"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  docker-compose logs baitbuddy-backend"
    echo "  docker-compose logs baitbuddy-nginx-reverse-proxy"
    echo "  nslookup catchgbt.com"
fi

exit $check_status
