/* MagicMirror²
 * Node Helper: MMM-TempestWx
 *
 * Fetches observations and forecast from WeatherFlow Tempest API.
 * Uses native built-in Node.js https / fetch standard functionality with ZERO npm dependencies!
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
const https = require("https");

module.exports = NodeHelper.create({
  start: function () {
    console.log("[MMM-TempestWx] Node helper started successfully.");
    this.config = null;
    this.pollTimer = null;
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "CONFIG") {
      console.log("[MMM-TempestWx] Received CONFIG from frontend. Station ID:", payload ? payload.stationId : "undefined");
      this.config = payload;
      this.fetchTempestData();

      // Clear any prior interval and start periodic polling
      if (this.pollTimer) clearInterval(this.pollTimer);
      const interval = Math.max(15000, this.config.updateInterval || 60000);
      this.pollTimer = setInterval(() => {
        this.fetchTempestData();
      }, interval);
    }
  },

  /**
   * Helper utilizing modern built-in fetch or Node.js https.get with native Promise
   */
  httpGetJson: async function (url) {
    if (typeof fetch === "function") {
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "MagicMirror-MMM-TempestWx/1.0"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    }

    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          "Accept": "application/json",
          "User-Agent": "MagicMirror-MMM-TempestWx/1.0"
        }
      };

      https.get(url, options, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }

        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (e) {
            reject(new Error("Failed to parse JSON response from Tempest API"));
          }
        });
      }).on("error", (err) => {
        reject(err);
      });
    });
  },

  /**
   * Fetch live observations and Better Forecast from WeatherFlow REST API
   */
  fetchTempestData: async function () {
    if (!this.config || !this.config.stationId || !this.config.token) {
      this.sendSocketNotification("TEMPEST_ERROR", "TempestWx: Missing stationId or token in config.js");
      return;
    }

    const stationId = String(this.config.stationId).trim();
    const token = String(this.config.token).trim();

    // WeatherFlow REST API base endpoint is /swd/rest/
    const obsUrl = `https://swd.weatherflow.com/swd/rest/observations/station/${stationId}?token=${token}`;
    const forecastUrl = `https://swd.weatherflow.com/swd/rest/better_forecast?station_id=${stationId}&token=${token}`;

    console.log(`[MMM-TempestWx] Fetching data for Station ID: ${stationId}`);

    try {
      // Parallel fetch using built-in Node.js https
      const [obsData, forecastData] = await Promise.all([
        this.httpGetJson(obsUrl),
        this.httpGetJson(forecastUrl).catch((err) => {
          console.warn("[MMM-TempestWx] Forecast API notice: " + err.message);
          return null;
        })
      ]);

      // WeatherFlow station endpoint returns an array of objects [ { air_temperature: ... } ]
      // WeatherFlow device endpoint returns an array of arrays [ [ timestamp, ..., air_temp ] ]
      const rawObs = obsData?.obs?.[0] || obsData?.obs || obsData;
      if (!rawObs) {
        throw new Error("No observation data returned for station " + stationId);
      }

      const isArr = Array.isArray(rawObs);
      const airTemp = isArr
        ? rawObs[7]
        : (rawObs.air_temperature ?? rawObs.air_temp ?? forecastData?.current_conditions?.air_temperature ?? 0);
      const relHumidity = isArr
        ? rawObs[8]
        : (rawObs.relative_humidity ?? rawObs.rh ?? forecastData?.current_conditions?.relative_humidity ?? 50);
      const pressure = isArr
        ? rawObs[6]
        : (rawObs.barometric_pressure ?? rawObs.station_pressure ?? rawObs.sea_level_pressure ?? forecastData?.current_conditions?.station_pressure ?? 1013.25);
      const windAvg = isArr
        ? rawObs[2]
        : (rawObs.wind_avg ?? rawObs.wind_speed ?? forecastData?.current_conditions?.wind_avg ?? 0);
      const windGust = isArr
        ? rawObs[3]
        : (rawObs.wind_gust ?? forecastData?.current_conditions?.wind_gust ?? windAvg);
      const windDir = isArr
        ? rawObs[4]
        : (rawObs.wind_direction ?? rawObs.wind_dir ?? forecastData?.current_conditions?.wind_direction ?? 0);
      const uv = isArr
        ? (rawObs[10] || 0)
        : (rawObs.uv ?? forecastData?.current_conditions?.uv ?? 0);
      const solarRad = isArr
        ? (rawObs[11] || 0)
        : (rawObs.solar_radiation ?? forecastData?.current_conditions?.solar_radiation ?? 0);
      const precip = isArr
        ? (rawObs[12] || 0)
        : (rawObs.precip_accum_local_day ?? rawObs.precip ?? 0);
      const lightningDist = isArr
        ? (rawObs[14] || 0)
        : (rawObs.lightning_strike_last_distance ?? rawObs.strike_distance ?? 0);
      const lightningCount = isArr
        ? (rawObs[15] || 0)
        : (rawObs.lightning_strike_count ?? rawObs.strike_count ?? 0);
      const battery = isArr
        ? (rawObs[16] || 2.8)
        : (rawObs.battery ?? 2.8);
      const dewPoint = rawObs.dew_point ?? (airTemp - ((100 - relHumidity) / 5));

      const observation = {
        station_id: stationId,
        station_name: obsData.station_name || "Tempest Station #" + stationId,
        air_temperature: Number(airTemp),
        relative_humidity: Number(relHumidity),
        barometric_pressure: Number(pressure),
        pressure_trend: "steady",
        wind_avg: Number(windAvg),
        wind_gust: Number(windGust),
        wind_direction: Number(windDir),
        wind_direction_cardinal: this.degreesToCardinal(Number(windDir)),
        solar_radiation: Number(solarRad),
        uv: Number(uv),
        precip_accum_local_day: Number(precip),
        lightning_strike_last_distance: Number(lightningDist),
        lightning_strike_count: Number(lightningCount),
        battery: Number(battery),
        feels_like: Number(forecastData?.current_conditions?.feels_like ?? airTemp),
        dew_point: Number(dewPoint)
      };

      // Extract 7-day forecast
      let forecastDaily = [];
      if (forecastData?.forecast?.daily) {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        forecastDaily = forecastData.forecast.daily.slice(0, 7).map((d, i) => {
          const date = new Date(d.day_start_local * 1000);
          const high = d.air_temp_high ?? d.air_temperature_high ?? d.high_temp ?? d.temp_high ?? 20;
          const low = d.air_temp_low ?? d.air_temperature_low ?? d.low_temp ?? d.temp_low ?? 10;
          return {
            day_name: i === 0 ? "Today" : i === 1 ? "Tomorrow" : days[date.getDay()],
            conditions: d.conditions || "Partly Cloudy",
            air_temp_high: Number(high),
            air_temp_low: Number(low),
            precip_probability: d.precip_probability || 0,
            wind_avg: d.wind_avg || 0
          };
        });
      }

      // Extract hourly wind and telemetry trends
      let forecastHourly = [];
      if (forecastData?.forecast?.hourly) {
        forecastHourly = forecastData.forecast.hourly.slice(0, 24).map((h) => {
          const d = new Date(h.time * 1000);
          const hrs = d.getHours();
          const hourLabel = hrs === 0 ? "12 AM" : hrs === 12 ? "12 PM" : hrs > 12 ? `${hrs - 12} PM` : `${hrs} AM`;
          const rawTemp = h.air_temperature ?? h.air_temp ?? h.temp ?? 20;
          const rawFeels = h.feels_like ?? rawTemp;
          return {
            hour_label: hourLabel,
            conditions: h.conditions || "Clear",
            air_temp: Number(rawTemp),
            feels_like: Number(rawFeels),
            relative_humidity: Number(h.relative_humidity ?? 50),
            wind_avg: Number(h.wind_avg ?? 0),
            wind_gust: Number(h.wind_gust ?? h.wind_avg ?? 0),
            wind_direction: Number(h.wind_direction ?? 0),
            wind_direction_cardinal: this.degreesToCardinal(h.wind_direction ?? 0),
            uv: Number(h.uv ?? 0),
            precip_accum: Number(h.precip ?? h.precip_accum ?? 0),
            precip_probability: Number(h.precip_probability ?? 0)
          };
        });
      }

      console.log("[MMM-TempestWx] Successfully retrieved observation for " + (obsData.station_name || "station " + stationId) + ". Temp: " + airTemp + " C (" + Math.round((Number(airTemp) * 9) / 5 + 32) + " F)");

      this.sendSocketNotification("TEMPEST_DATA", {
        station_id: stationId,
        station_name: obsData.station_name,
        observation: observation,
        forecast_daily: forecastDaily,
        forecast_hourly: forecastHourly
      });
    } catch (error) {
      console.error("[MMM-TempestWx] API fetch error:", error.message || error);
      let errStr = error.message || String(error);
      if (errStr.includes("404")) {
        errStr = `Station ID ${stationId} not found (HTTP 404). Make sure you are using your numerical Station ID from tempestwx.com/settings/stations, not a Device ID or serial number.`;
      } else if (errStr.includes("401")) {
        errStr = "Unauthorized (HTTP 401). Please check your Tempest Personal Access Token in tempestwx.com > Settings > Data Authorizations.";
      }
      this.sendSocketNotification("TEMPEST_ERROR", {
        message: errStr,
        url: obsUrl
      });
    }
  },

  degreesToCardinal: function (deg) {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const idx = Math.round((deg % 360) / 22.5) % 16;
    return directions[idx];
  }
});
