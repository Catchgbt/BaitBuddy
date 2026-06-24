import { api } from '@/api/frontendClient.js';
export const generateCatchReport = (data) =>
  api.post('/api/ai/generate-catch-report', data).catch(() => ({}));
export default generateCatchReport;
