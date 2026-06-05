import { api } from '@/api/frontendClient.js';
export const catchgbtChat = (data) => api.post('/api/ai/chat', data);
export default catchgbtChat;
