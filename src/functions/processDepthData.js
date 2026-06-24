import { api } from '@/api/frontendClient.js';
// Fehler werden bewusst NICHT verschluckt — der Aufrufer (DepthUploadPanel)
// fängt sie und zeigt die echte Fehlermeldung, statt faelschlich Erfolg.
export const processDepthData = (data) => api.post('/api/water/bathymetry', data);
export default processDepthData;
