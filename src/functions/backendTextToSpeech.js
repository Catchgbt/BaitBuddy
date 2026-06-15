import { api } from '@/api/frontendClient.js';
export const backendTextToSpeech = (data) => api.post('/api/ai/tts', data);
export default backendTextToSpeech;
