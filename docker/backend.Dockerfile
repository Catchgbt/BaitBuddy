# BaitBuddy Backend (Express) — Build-Kontext ist das Repo-Root.
FROM node:22-alpine

# python3 + Netz-Libs fuer die Karten-Download-Skripte (backend/src/routes/maps.js
# spawnt scripts/download_bathymetry_*.py). wget fuer den Healthcheck.
RUN apk add --no-cache python3 py3-requests wget

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev --legacy-peer-deps

COPY backend ./backend
COPY scripts ./scripts

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node
WORKDIR /app/backend
CMD ["node", "src/server.js"]
