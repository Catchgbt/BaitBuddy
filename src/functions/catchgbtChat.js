import { api } from '@/api/frontendClient.js';
// `options` (optional) wird an den ApiClient durchgereicht, u. a. für ein
// `signal` zum Abbrechen des laufenden Requests beim Unmount.
export const catchgbtChat = (data, options) => api.post('/api/ai/chat', data, options);
export default catchgbtChat;
