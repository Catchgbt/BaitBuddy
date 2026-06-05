import { api } from '@/api/frontendClient.js';
export const getEventLeaderboard = (data) =>
  api.get(`/api/events/${data?.event_id}/leaderboard`).catch(() => []);
export default getEventLeaderboard;
