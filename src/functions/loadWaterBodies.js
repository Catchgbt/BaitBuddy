import { api } from '@/api/frontendClient.js';
export const loadWaterBodies = (data) =>
  api.get('/api/fishing/hotspots').catch(() => []);
export default loadWaterBodies;
