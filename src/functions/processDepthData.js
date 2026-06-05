import { api } from '@/api/frontendClient.js';
export const processDepthData = (data) =>
  api.post('/api/water/bathymetry', data).catch(() => null);
export default processDepthData;
