@echo off
REM BaitBuddy AAB Build Script für Windows
REM Dieser Script erstellt eine production-ready AAB-Datei für PlayStore

setlocal enabledelayedexpansion

echo.
echo 🚀 BaitBuddy AAB Build-Prozess gestartet...
echo ================================================
echo.

REM Schritt 1: Frontend-Build
echo 📦 Schritt 1: Frontend-Build (Vite)
call npm run build
if errorlevel 1 (
    echo ❌ Frontend-Build fehlgeschlagen
    exit /b 1
)
echo ✓ Frontend erfolgreich gebaut
echo.

REM Schritt 2: Überprüfung der Keystore-Datei
echo 🔐 Schritt 2: Überprüfung der Keystore-Datei
if exist "android\keystore.properties" (
    echo ✓ Keystore-Properties vorhanden
) else (
    echo ⚠ Warnung: android\keystore.properties nicht gefunden
    echo   Bitte stelle sicher, dass die Keystore-Datei konfiguriert ist
    exit /b 1
)
echo.

REM Schritt 3: Android AAB Build
echo 🏗️ Schritt 3: Android AAB Build
cd android

if not exist "gradlew.bat" (
    echo ❌ gradlew.bat nicht gefunden
    exit /b 1
)

call gradlew.bat bundleRelease
if errorlevel 1 (
    echo ❌ AAB-Build fehlgeschlagen
    exit /b 1
)

cd ..
echo ✓ AAB erfolgreich erstellt
echo.

REM Schritt 4: Output-Pfad anzeigen
echo 📁 Schritt 4: Überprüfung der AAB-Datei
if exist "android\app\build\outputs\bundle\release\app-release.aab" (
    for %%A in (android\app\build\outputs\bundle\release\app-release.aab) do set SIZE=%%~zA
    echo ✓ AAB-Datei erfolgreich erstellt
    echo   Pfad: android\app\build\outputs\bundle\release\app-release.aab
    echo   Größe: !SIZE! bytes
) else (
    echo ❌ AAB-Datei nicht gefunden
    exit /b 1
)
echo.

REM Schritt 5: Erfolgreiche Completion
echo ================================================
echo ✓ AAB-Build erfolgreich abgeschlossen!
echo ================================================
echo.
echo 📤 Nächste Schritte:
echo 1. Datei hochladen zu Google Play Console
echo 2. App-Details überprüfen (Screenshots, Beschreibung)
echo 3. Release in Production starten
echo.
echo 📚 Weitere Info: siehe AAB_BUILD_GUIDE.md
echo.

endlocal
