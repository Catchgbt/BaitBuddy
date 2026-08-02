import { api } from '@/api/frontendClient.js';

// Bewusst OHNE .catch(() => null): der stille Fallback liess beide Aufrufer
// (BathymetricMapCard, BathymetricCrowdsourcing) in ihren Erfolgspfad laufen
// und eine Erfolgsmeldung anzeigen, obwohl gar nichts passiert ist. Fehler
// muessen den Aufrufer erreichen, damit der Nutzer eine ehrliche Rueckmeldung
// bekommt.
export const generateBathymetricMap = (data) =>
  api.post('/api/water/bathymetric-map', data);

export default generateBathymetricMap;
