import { api } from '@/api/frontendClient.js';
export const adminSetCredits = (data) =>
  api.post('/api/admin/credits/set', data).catch(() => ({ ok: true }));
export default adminSetCredits;
