import { api } from '@/api/frontendClient.js';
export const textToSpeech = (data) => api.post('/api/ai/tts', data);
export default textToSpeech;
