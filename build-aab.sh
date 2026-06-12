#!/bin/bash

# BaitBuddy AAB Build Script
# Dieser Script erstellt eine production-ready AAB-Datei für PlayStore

set -e

echo "🚀 BaitBuddy AAB Build-Prozess gestartet..."
echo "================================================"

# Farben für Ausgabe
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Schritt 1: Frontend-Build
echo -e "${BLUE}📦 Schritt 1: Frontend-Build (Vite)${NC}"
npm run build
echo -e "${GREEN}✓ Frontend erfolgreich gebaut${NC}\n"

# Schritt 2: Überprüfung der Keystore-Datei
echo -e "${BLUE}🔐 Schritt 2: Überprüfung der Keystore-Datei${NC}"
if [ -f "android/keystore.properties" ]; then
    echo -e "${GREEN}✓ Keystore-Properties vorhanden${NC}"
else
    echo -e "${YELLOW}⚠ Warnung: android/keystore.properties nicht gefunden${NC}"
    echo "  Bitte stelle sicher, dass die Keystore-Datei konfiguriert ist"
    exit 1
fi
echo ""

# Schritt 3: Android AAB Build
echo -e "${BLUE}🏗️  Schritt 3: Android AAB Build${NC}"
cd android

# Gradle-Wrapper überprüfen
if [ ! -f "gradlew" ]; then
    echo "❌ gradlew nicht gefunden. Bitte führe 'gradlew --version' aus."
    exit 1
fi

# Bundle erstellen
./gradlew bundleRelease

cd ..
echo -e "${GREEN}✓ AAB erfolgreich erstellt${NC}\n"

# Schritt 4: Output-Pfad anzeigen
AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"
echo -e "${BLUE}📁 Schritt 4: Überprüfung der AAB-Datei${NC}"
if [ -f "$AAB_PATH" ]; then
    SIZE=$(du -h "$AAB_PATH" | cut -f1)
    echo -e "${GREEN}✓ AAB-Datei erfolgreich erstellt${NC}"
    echo "  Pfad: $AAB_PATH"
    echo "  Größe: $SIZE"
else
    echo -e "${YELLOW}❌ AAB-Datei nicht gefunden${NC}"
    exit 1
fi
echo ""

# Schritt 5: Erfolgreiche Completion
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ AAB-Build erfolgreich abgeschlossen!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "📤 Nächste Schritte:"
echo "1. Datei hochladen zu Google Play Console"
echo "2. App-Details überprüfen (Screenshots, Beschreibung)"
echo "3. Release in Production starten"
echo ""
echo "📚 Weitere Info: siehe AAB_BUILD_GUIDE.md"
