import { api } from '@/api/frontendClient.js';
export const adminResetWallet = (data) =>
  api.post('/api/admin/wallet/reset', data).catch(() => ({ ok: true }));
export default adminResetWallet;
