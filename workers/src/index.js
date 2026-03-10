import { handleGetPlayer, handleSetName } from './api/player.js';
import { handleSubmitStats } from './api/stats.js';
import { handleGetLeaderboard, handleGetGlobalLeaderboard } from './api/leaderboard.js';
import { handleCreateRoom, handleJoinRoom, handleMatchmake, handleWebSocket } from './api/room.js';
import { corsHeaders } from './utils/auth.js';

export { GameRoom } from './do/GameRoom.js';
export { GameLobby } from './do/GameLobby.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get('Origin');

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (path.startsWith('/ws/')) {
      return handleWebSocket(request, env, path);
    }

    try {
      if (path === '/api/player' && method === 'GET') {
        return handleGetPlayer(request, env);
      }
      if (path === '/api/player/name' && method === 'POST') {
        return handleSetName(request, env);
      }
      if (path === '/api/stats' && method === 'POST') {
        return handleSubmitStats(request, env);
      }
      if (path === '/api/leaderboard/global' && method === 'GET') {
        return handleGetGlobalLeaderboard(request, env);
      }
      if (path.startsWith('/api/leaderboard/') && method === 'GET') {
        const gameSlug = path.replace('/api/leaderboard/', '');
        return handleGetLeaderboard(request, env, gameSlug);
      }
      if (path === '/api/room/create' && method === 'POST') {
        return handleCreateRoom(request, env);
      }
      if (path === '/api/room/join' && method === 'POST') {
        return handleJoinRoom(request, env);
      }
      if (path.startsWith('/api/matchmake/') && method === 'POST') {
        const gameSlug = path.replace('/api/matchmake/', '');
        return handleMatchmake(request, env, gameSlug);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders(origin) });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }
  },
};
