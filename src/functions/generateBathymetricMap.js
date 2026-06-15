import { api } from '@/api/frontendClient.js';
export const generateBathymetricMap = (data) =>
  api.post('/api/water/bathymetric-map', data).catch(() => null);
export default generateBathymetricMap;
