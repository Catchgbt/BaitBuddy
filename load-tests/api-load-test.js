// k6-Last-Test für die BaitBuddy-API (Masterplan Phase 3: Last- und Chaos-Tests).
//
// Simuliert Hunderte gleichzeitige Nutzer mit Ramp-up, Halten, Spike und
// Ramp-down und prüft Statuscode + Antwortzeit. Zielt bewusst auf öffentliche,
// idempotente Lese-Endpunkte (kein Auth, keine Mutation, keine LLM-Kosten):
//   - GET /api/health          — günstiger Healthcheck (kein DB-Hit)
//   - GET /api/community/posts  — DB-gestützter Read (paginiert)
//
// Ausführen (k6 muss installiert sein: https://k6.io/docs/get-started/installation/):
//   k6 run load-tests/api-load-test.js
//   BASE_URL=https://bait-buddy.vercel.app k6 run load-tests/api-load-test.js
//
// Hinweis: Nur gegen eine EIGENE Umgebung (lokal/Staging) laufen lassen, für die
// eine Lasttest-Freigabe vorliegt — nicht gegen fremde Produktion.

import http from 'k6/http';
import { sleep, check } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Eigene Fehlerrate für schnelles Sichten im Summary.
const errorRate = new Rate('failed_requests');

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp-up auf 100 VUs
    { duration: '3m', target: 100 },  // Last halten
    { duration: '30s', target: 500 }, // Spike auf 500 VUs
    { duration: '1m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    // Weniger als 1% fehlgeschlagene Requests über den gesamten Lauf.
    http_req_failed: ['rate<0.01'],
    failed_requests: ['rate<0.01'],
    // 95. Perzentil der Antwortzeit unter 500ms (Ziel aus dem Masterplan).
    http_req_duration: ['p(95)<500'],
  },
};

const ENDPOINTS = [
  { name: 'health', url: `${BASE_URL}/api/health` },
  { name: 'community_posts', url: `${BASE_URL}/api/community/posts?limit=20` },
];

export default function () {
  for (const endpoint of ENDPOINTS) {
    const res = http.get(endpoint.url, { tags: { endpoint: endpoint.name } });
    const ok = check(res, {
      'Status ist 200': (r) => r.status === 200,
      'Antwortzeit < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(!ok);
  }
  sleep(1);
}
