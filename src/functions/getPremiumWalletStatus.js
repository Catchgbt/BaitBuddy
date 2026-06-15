import { api } from '@/api/frontendClient.js';
export const getPremiumWalletStatus = () => api.get('/api/premium/status').catch(() => ({}));
export default getPremiumWalletStatus;
