#!/bin/bash
# Start BaitBuddy lokal: Backend + Frontend

echo "🚀 Starte BaitBuddy lokal..."
echo ""

# Backend starten im Hintergrund
echo "📦 Starte Backend auf Port 3001..."
cd backend
npm run dev &
BACKEND_PID=$!
sleep 3

# Frontend starten im Vordergrund
echo "🎨 Starte Frontend auf Port 5173..."
cd ../
npm run dev

# Cleanup bei Beendigung
trap "kill $BACKEND_PID 2>/dev/null; exit" EXIT INT TERM
