import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Built-in Node.js API call for Tempest Weather Station observations
  app.get('/api/tempest/observations/:stationId', async (req, res) => {
    const { stationId } = req.params;
    const token = (req.query.token as string) || process.env.TEMPEST_API_TOKEN || '';

    if (!token) {
      return res.status(400).json({ error: 'Token parameter is required for Tempest API.' });
    }

    try {
      const url = `https://swd.weatherflow.com/id/observations/station/${encodeURIComponent(stationId)}?token=${encodeURIComponent(token)}`;
      // Built-in Node.js fetch
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MagicMirror-MMM-TempestWx/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `WeatherFlow API responded with ${response.status}: ${errorText || response.statusText}`,
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal error fetching observations' });
    }
  });

  // Built-in Node.js API call for Tempest 7-day & hourly forecast
  app.get('/api/tempest/forecast/:stationId', async (req, res) => {
    const { stationId } = req.params;
    const token = (req.query.token as string) || process.env.TEMPEST_API_TOKEN || '';

    if (!token) {
      return res.status(400).json({ error: 'Token parameter is required for Tempest API.' });
    }

    try {
      const url = `https://swd.weatherflow.com/id/better_forecast?station_id=${encodeURIComponent(stationId)}&token=${encodeURIComponent(token)}`;
      // Built-in Node.js fetch
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MagicMirror-MMM-TempestWx/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          error: `WeatherFlow API responded with ${response.status}: ${errorText || response.statusText}`,
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal error fetching forecast' });
    }
  });

  // In development, hook into Vite middlewares
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dist assets
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`TempestWx server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
