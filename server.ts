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
    res.json({ status: 'ok', name: 'MMM-TempestWx', time: new Date().toISOString() });
  });

  // Tempest Observations Proxy
  app.get('/api/tempest/observations/:stationId', async (req, res) => {
    const { stationId } = req.params;
    const token = (req.query.token as string) || '';
    if (!stationId || !token) {
      return res.status(400).json({ error: 'Missing stationId or token' });
    }
    try {
      const url = `https://swd.weatherflow.com/swd/rest/observations/station/${encodeURIComponent(stationId)}?token=${encodeURIComponent(token)}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MMM-TempestWx/1.0',
        },
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: `WeatherFlow API responded with ${response.statusText}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error('[API Proxy] Error fetching Tempest observations:', err.message);
      res.status(502).json({ error: err.message });
    }
  });

  // Tempest Forecast Proxy
  app.get('/api/tempest/forecast/:stationId', async (req, res) => {
    const { stationId } = req.params;
    const token = (req.query.token as string) || '';
    if (!stationId || !token) {
      return res.status(400).json({ error: 'Missing stationId or token' });
    }
    try {
      const url = `https://swd.weatherflow.com/swd/rest/better_forecast?station_id=${encodeURIComponent(stationId)}&token=${encodeURIComponent(token)}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MMM-TempestWx/1.0',
        },
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: `WeatherFlow Forecast API responded with ${response.statusText}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error('[API Proxy] Error fetching Tempest forecast:', err.message);
      res.status(502).json({ error: err.message });
    }
  });

  // Tempest Station Metadata Proxy
  app.get('/api/tempest/stations/:stationId', async (req, res) => {
    const { stationId } = req.params;
    const token = (req.query.token as string) || '';
    if (!stationId || !token) {
      return res.status(400).json({ error: 'Missing stationId or token' });
    }
    try {
      const url = `https://swd.weatherflow.com/swd/rest/stations/${encodeURIComponent(stationId)}?token=${encodeURIComponent(token)}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'MMM-TempestWx/1.0',
        },
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: `WeatherFlow Stations API responded with ${response.statusText}` });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error('[API Proxy] Error fetching Tempest station metadata:', err.message);
      res.status(502).json({ error: err.message });
    }
  });

  // NOAA 7-Day Forecast Proxy
  app.get('/api/noaa/forecast', async (req, res) => {
    const lat = req.query.lat as string;
    const lon = req.query.lon as string;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat or lon query parameter' });
    }
    try {
      const pointUrl = `https://api.weather.gov/points/${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
      const pointRes = await fetch(pointUrl, {
        headers: {
          'User-Agent': 'MagicMirror-MMM-TempestWx (https://github.com, weather@tempestwx.local)',
          'Accept': 'application/geo+json',
        },
      });
      if (!pointRes.ok) {
        return res.status(pointRes.status).json({ error: `NOAA point lookup failed: ${pointRes.statusText}` });
      }
      const pointData = await pointRes.json();
      const forecastUrl = pointData?.properties?.forecast;
      if (!forecastUrl) {
        return res.status(404).json({ error: 'NOAA forecast URL not found for coordinates' });
      }

      const fcRes = await fetch(forecastUrl, {
        headers: {
          'User-Agent': 'MagicMirror-MMM-TempestWx (https://github.com, weather@tempestwx.local)',
          'Accept': 'application/geo+json',
        },
      });
      if (!fcRes.ok) {
        return res.status(fcRes.status).json({ error: `NOAA forecast fetch failed: ${fcRes.statusText}` });
      }
      const fcData = await fcRes.json();
      res.json(fcData);
    } catch (err: any) {
      console.error('[API Proxy] NOAA forecast error:', err.message);
      res.status(502).json({ error: err.message });
    }
  });

  // NOAA Active Weather Alerts Proxy
  app.get('/api/noaa/alerts', async (req, res) => {
    const lat = req.query.lat as string;
    const lon = req.query.lon as string;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat or lon query parameter' });
    }
    try {
      const alertsUrl = `https://api.weather.gov/alerts/active?point=${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
      const alertsRes = await fetch(alertsUrl, {
        headers: {
          'User-Agent': 'MagicMirror-MMM-TempestWx (https://github.com, weather@tempestwx.local)',
          'Accept': 'application/geo+json',
        },
      });
      if (!alertsRes.ok) {
        return res.status(alertsRes.status).json({ error: `NOAA alerts fetch failed: ${alertsRes.statusText}` });
      }
      const alertsData = await alertsRes.json();
      res.json(alertsData);
    } catch (err: any) {
      console.error('[API Proxy] NOAA alerts error:', err.message);
      res.status(502).json({ error: err.message });
    }
  });

  // Vite middleware in dev or static files in prod
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
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`MMM-TempestWx server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
