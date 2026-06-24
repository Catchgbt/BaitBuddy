import { api } from '@/api/frontendClient.js';
export const premiumStatus = () => api.get('/api/premium/status').catch(() => ({}));
export default premiumStatus;
