import { defineConfig } from 'vite';

// Simple plugin: fetches NHL data server-side, serves it at /api/games
function nhlPlugin() {
  return {
    name: 'nhl-api',
    configureServer(server) {
      server.middlewares.use('/api/games', async (req, res) => {
        try {
          const d = new Date();
          const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
          const url = `https://api-web.nhle.com/v1/schedule/${dateStr}`;
          const response = await fetch(url);
          const data = await response.json();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (e) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [nhlPlugin()],
});
