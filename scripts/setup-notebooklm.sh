#!/usr/bin/env bash
# Setup-Skript für notebooklm-py (https://github.com/teng-lin/notebooklm-py)
# Inoffizielle Python-API für Google NotebookLM
#
# Voraussetzungen: Python 3.10+ und uv (https://docs.astral.sh/uv/)
#
# HINWEIS: Chromium-Download benötigt Zugriff auf cdn.playwright.dev.
# In eingeschränkten Netzwerkumgebungen kann nur das Core-Paket installiert werden.

set -e

echo "==> notebooklm-py installieren..."

if command -v uv &>/dev/null; then
    # Mit Browser-Support (empfohlen, benötigt ~170 MB Chromium)
    uv tool install "notebooklm-py[browser]"
    echo "==> Playwright-Browser installieren..."
    uv tool run playwright install chromium || {
        echo "WARNUNG: Chromium konnte nicht heruntergeladen werden."
        echo "         Browser-Auth (notebooklm login) steht nicht zur Verfügung."
        echo "         Core-Funktionalität mit bestehender Session ist nutzbar."
    }
elif command -v pipx &>/dev/null; then
    pipx install "notebooklm-py[browser]"
    playwright install chromium
else
    pip install "notebooklm-py[browser]"
    playwright install chromium
fi

echo ""
echo "==> Installation abgeschlossen. Version:"
notebooklm --version

echo ""
echo "Nächste Schritte:"
echo "  notebooklm login     # Google-Konto verbinden"
echo "  notebooklm list      # Notebooks auflisten"
echo "  notebooklm --help    # Alle Befehle anzeigen"
