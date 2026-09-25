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
    const stationId = String(req.params.stationId || '').trim();
    const token = String((req.query.token as string) || process.env.TEMPEST_API_TOKEN || '').trim();

    if (!token) {
      return res.status(400).json({ error: 'Token parameter is required for Tempest API.' });
    }

    try {
      const url = `https://swd.weatherflow.com/swd/rest/observations/station/${stationId}?token=${token}`;
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
    const stationId = String(req.params.stationId || '').trim();
    const token = String((req.query.token as string) || process.env.TEMPEST_API_TOKEN || '').trim();

    if (!token) {
      return res.status(400).json({ error: 'Token parameter is required for Tempest API.' });
    }

    try {
      const url = `https://swd.weatherflow.com/swd/rest/better_forecast?station_id=${stationId}&token=${token}`;
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

  // Built-in Node.js API call for NOAA National Weather Service (api.weather.gov) 7-day forecast
  app.get('/api/noaa/forecast', async (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid lat and lon parameters are required for NOAA API.' });
    }

    try {
      const latStr = lat.toFixed(4);
      const lonStr = lon.toFixed(4);
      const pointsUrl = `https://api.weather.gov/points/${latStr},${lonStr}`;

      const pointsRes = await fetch(pointsUrl, {
        headers: {
          'Accept': 'application/geo+json, application/json',
          'User-Agent': 'MagicMirror-MMM-TempestWx/1.0 (https://github.com/BillFoldin/MMM-TempestWx)',
        },
      });

      if (!pointsRes.ok) {
        const errText = await pointsRes.text();
        return res.status(pointsRes.status).json({
          error: `NOAA Points API responded with ${pointsRes.status}: ${errText || pointsRes.statusText}`,
        });
      }

      const pointsData = await pointsRes.json();
      const forecastUrl = pointsData?.properties?.forecast;

      if (!forecastUrl) {
        return res.status(404).json({ error: 'No forecast endpoint available from NOAA for these coordinates.' });
      }

      const forecastRes = await fetch(forecastUrl, {
        headers: {
          'Accept': 'application/geo+json, application/json',
          'User-Agent': 'MagicMirror-MMM-TempestWx/1.0 (https://github.com/BillFoldin/MMM-TempestWx)',
        },
      });

      if (!forecastRes.ok) {
        const errText = await forecastRes.text();
        return res.status(forecastRes.status).json({
          error: `NOAA Forecast API responded with ${forecastRes.status}: ${errText || forecastRes.statusText}`,
        });
      }

      const forecastData = await forecastRes.json();
      res.json(forecastData);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal error fetching NOAA forecast' });
    }
  });

  // Built-in Node.js API call for NOAA National Weather Service (api.weather.gov) active alerts & statements
  app.get('/api/noaa/alerts', async (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid lat and lon parameters are required for NOAA alerts API.' });
    }

    try {
      const latStr = lat.toFixed(4);
      const lonStr = lon.toFixed(4);
      const alertsUrl = `https://api.weather.gov/alerts/active?point=${latStr},${lonStr}`;

      const alertsRes = await fetch(alertsUrl, {
        headers: {
          'Accept': 'application/geo+json, application/json',
          'User-Agent': 'MagicMirror-MMM-TempestWx/1.0 (https://github.com/BillFoldin/MMM-TempestWx)',
        },
      });

      if (!alertsRes.ok) {
        return res.json({ features: [] });
      }

      const alertsData = await alertsRes.json();
      res.json(alertsData);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal error fetching NOAA alerts' });
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
