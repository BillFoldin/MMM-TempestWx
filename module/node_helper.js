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
        dew_point: Number(dewPoint),
        conditions: forecastData?.current_conditions?.conditions || (forecastData?.forecast?.daily?.[0]?.conditions) || "Clear",
        icon: forecastData?.current_conditions?.icon || (forecastData?.forecast?.daily?.[0]?.icon) || "clear-day"
      };

      // Resolve station geographic coordinates if needed for NOAA forecast or NOAA alerts
      const provider = String(this.config.weatherProvider || "tempest").trim();
      const isNoaa = provider.toUpperCase() === "NOAA";
      const checkAlerts = this.config.checkNoaaAlerts !== false;

      let lat = this.config.latitude !== undefined && this.config.latitude !== null ? Number(this.config.latitude) : null;
      let lon = this.config.longitude !== undefined && this.config.longitude !== null ? Number(this.config.longitude) : null;

      if ((isNoaa || checkAlerts) && (lat === null || lon === null || isNaN(lat) || isNaN(lon))) {
        if (typeof forecastData?.latitude === "number" && typeof forecastData?.longitude === "number") {
          lat = forecastData.latitude;
          lon = forecastData.longitude;
        } else {
          try {
            const stationInfoUrl = `https://swd.weatherflow.com/swd/rest/stations/${stationId}?token=${token}`;
            const stationMeta = await this.httpGetJson(stationInfoUrl);
            const st = stationMeta?.stations?.[0];
            if (st && typeof st.latitude === "number" && typeof st.longitude === "number") {
              lat = st.latitude;
              lon = st.longitude;
            }
          } catch (metaErr) {
            console.warn("[MMM-TempestWx] Could not fetch station coordinates for NOAA:", metaErr.message);
          }
        }
      }

      // Extract 7-day forecast based on configured weatherProvider ("tempest" or "NOAA")
      let forecastDaily = [];
      let forecastSource = "tempest";

      if (isNoaa) {
        if (typeof lat === "number" && typeof lon === "number" && !isNaN(lat) && !isNaN(lon)) {
          try {
            console.log(`[MMM-TempestWx] Fetching NOAA 7-day forecast for coordinates: ${lat}, ${lon}`);
            forecastDaily = await this.fetchNoaaForecast(lat, lon);
            if (forecastDaily && forecastDaily.length > 0) {
              forecastSource = "NOAA";
              console.log(`[MMM-TempestWx] Successfully retrieved NOAA 7-day forecast (${forecastDaily.length} days).`);
            }
          } catch (noaaErr) {
            console.warn(`[MMM-TempestWx] NOAA forecast error: ${noaaErr.message}. Falling back to Tempest forecast.`);
          }
        } else {
          console.warn("[MMM-TempestWx] Coordinates unavailable for NOAA forecast. Falling back to Tempest forecast.");
        }
      }

      // Extract NOAA active weather statements, watches, advisories, and warnings
      let noaaAlerts = [];
      if (checkAlerts && typeof lat === "number" && typeof lon === "number" && !isNaN(lat) && !isNaN(lon)) {
        try {
          console.log(`[MMM-TempestWx] Checking NOAA.gov active weather statements & alerts for ${lat}, ${lon}`);
          noaaAlerts = await this.fetchNoaaAlerts(lat, lon);
          if (noaaAlerts.length > 0) {
            console.log(`[MMM-TempestWx] Active NOAA alert found: ${noaaAlerts[0].event} (${noaaAlerts[0].level} / ${noaaAlerts[0].color})`);
          }
        } catch (alertErr) {
          console.warn("[MMM-TempestWx] Error checking NOAA alerts:", alertErr.message);
        }
      }

      // Fallback to Tempest Better Forecast if daily is still empty
      if (forecastDaily.length === 0 && forecastData?.forecast?.daily) {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        forecastDaily = forecastData.forecast.daily.slice(0, 7).map((d, i) => {
          const date = new Date(d.day_start_local * 1000);
          const high = d.air_temp_high ?? d.air_temperature_high ?? d.high_temp ?? d.temp_high ?? 20;
          const low = d.air_temp_low ?? d.air_temperature_low ?? d.low_temp ?? d.temp_low ?? 10;
          return {
            day_name: i === 0 ? "Today" : i === 1 ? "Tomorrow" : days[date.getDay()],
            conditions: d.conditions || "Partly Cloudy",
            icon: d.icon || "partly-cloudy",
            air_temp_high: Number(high),
            air_temp_low: Number(low),
            precip_probability: d.precip_probability || 0,
            wind_avg: d.wind_avg || 0
          };
        });
        forecastSource = "tempest";
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
        forecast_hourly: forecastHourly,
        forecast_source: forecastSource,
        noaa_alerts: noaaAlerts,
        active_alert: noaaAlerts.length > 0 ? noaaAlerts[0] : null
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

  /**
   * Fetch active weather statements, watches, advisories, and warnings from NOAA (api.weather.gov)
   */
  fetchNoaaAlerts: async function (latitude, longitude) {
    if (typeof latitude !== "number" || typeof longitude !== "number" || isNaN(latitude) || isNaN(longitude)) {
      return [];
    }

    const latStr = latitude.toFixed(4);
    const lonStr = longitude.toFixed(4);
    const alertsUrl = `https://api.weather.gov/alerts/active?point=${latStr},${lonStr}`;

    try {
      const alertsData = await this.httpGetJson(alertsUrl);
      return this.parseNoaaAlerts(alertsData);
    } catch (err) {
      console.warn(`[MMM-TempestWx] Could not fetch NOAA alerts for ${latStr},${lonStr}:`, err.message);
      return [];
    }
  },

  /**
   * Parse NOAA National Weather Service alerts into standardized alerts array
   */
  parseNoaaAlerts: function (alertsData) {
    const features = alertsData?.features || [];
    if (!Array.isArray(features) || features.length === 0) return [];

    const parsed = features.map((f) => {
      const p = f.properties || {};
      const event = (p.event || "Special Weather Statement").trim();
      const lower = event.toLowerCase();

      let level = "statement";
      let color = "yellow";
      let priority = 0;

      if (lower.includes("warning")) {
        level = "warning";
        color = "red";
        priority = 3;
      } else if (lower.includes("advisory")) {
        level = "advisory";
        color = "orange";
        priority = 2;
      } else if (lower.includes("watch")) {
        level = "watch";
        color = "yellow";
        priority = 1;
      } else {
        level = "statement";
        color = "yellow";
        priority = 0;
      }

      return {
        event: event,
        headline: p.headline || event,
        description: p.description || "",
        instruction: p.instruction || "",
        severity: p.severity || "Unknown",
        urgency: p.urgency || "Unknown",
        certainty: p.certainty || "Unknown",
        effective: p.effective || "",
        expires: p.expires || "",
        level: level,
        color: color,
        priority: priority
      };
    });

    parsed.sort((a, b) => b.priority - a.priority);
    return parsed;
  },

  /**
   * Fetch 7-day forecast from NOAA National Weather Service (api.weather.gov)
   */
  fetchNoaaForecast: async function (latitude, longitude) {
    if (typeof latitude !== "number" || typeof longitude !== "number" || isNaN(latitude) || isNaN(longitude)) {
      throw new Error("Invalid coordinates for NOAA: lat=" + latitude + ", lon=" + longitude);
    }

    const latStr = latitude.toFixed(4);
    const lonStr = longitude.toFixed(4);
    const pointsUrl = `https://api.weather.gov/points/${latStr},${lonStr}`;

    const pointsData = await this.httpGetJson(pointsUrl);
    if (!pointsData?.properties?.forecast) {
      throw new Error("No forecast URL returned from NOAA points API for " + latStr + "," + lonStr);
    }

    const forecastUrl = pointsData.properties.forecast;
    const forecastData = await this.httpGetJson(forecastUrl);
    return this.parseNoaaForecastDaily(forecastData);
  },

  /**
   * Parse NOAA National Weather Service forecast periods into standardized DailyForecast array
   */
  parseNoaaForecastDaily: function (forecastData) {
    const periods = forecastData?.properties?.periods || [];
    if (!periods.length) return [];

    const daysMap = new Map();
    const daysOrder = [];

    for (const p of periods) {
      const dateKey = (p.startTime || "").split("T")[0];
      if (!dateKey) continue;

      if (!daysMap.has(dateKey)) {
        if (daysOrder.length >= 7) continue;
        daysOrder.push(dateKey);
        daysMap.set(dateKey, {
          dateKey: dateKey,
          daytime: null,
          nighttime: null,
          periods: []
        });
      }
      const entry = daysMap.get(dateKey);
      entry.periods.push(p);
      if (p.isDaytime) {
        entry.daytime = p;
      } else {
        entry.nighttime = p;
      }
    }

    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return daysOrder.map((dateKey, index) => {
      const entry = daysMap.get(dateKey);
      const dayPeriod = entry.daytime;
      const nightPeriod = entry.nighttime;
      const primaryPeriod = dayPeriod || nightPeriod || entry.periods[0];

      const d = new Date(primaryPeriod.startTime);
      const dayName = index === 0 ? "Today" : index === 1 ? "Tomorrow" : weekdayNames[d.getDay()];
      const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;

      const toCelsius = (temp, unit) => {
        if (typeof temp !== "number") return 20;
        return unit === "C" ? temp : (temp - 32) * (5 / 9);
      };

      let highC = dayPeriod ? toCelsius(dayPeriod.temperature, dayPeriod.temperatureUnit) : null;
      let lowC = nightPeriod ? toCelsius(nightPeriod.temperature, nightPeriod.temperatureUnit) : null;

      if (highC === null && lowC !== null) {
        highC = lowC + 4;
      } else if (lowC === null && highC !== null) {
        lowC = highC - 5;
      } else if (highC === null && lowC === null) {
        highC = 20;
        lowC = 12;
      }

      if (lowC > highC) {
        const tmp = highC;
        highC = lowC;
        lowC = tmp;
      }

      const conditions = (dayPeriod?.shortForecast || nightPeriod?.shortForecast || "Clear").trim();
      const icon = this.mapNoaaIcon(dayPeriod?.icon || nightPeriod?.icon, conditions, !dayPeriod);

      const precipProb = Math.max(
        dayPeriod?.probabilityOfPrecipitation?.value || 0,
        nightPeriod?.probabilityOfPrecipitation?.value || 0
      );

      const windSpeedStr = dayPeriod?.windSpeed || nightPeriod?.windSpeed || "5 mph";
      const windMatches = windSpeedStr.match(/\d+/g);
      let windMph = 5;
      if (windMatches && windMatches.length > 0) {
        const nums = windMatches.map(Number);
        windMph = nums.reduce((a, b) => a + b, 0) / nums.length;
      }
      const windAvgMs = windMph * 0.44704;

      const windDir = dayPeriod?.windDirection || nightPeriod?.windDirection || "W";

      return {
        day_start_local: Math.floor(d.getTime() / 1000),
        day_name: dayName,
        date_label: dateLabel,
        conditions: conditions,
        icon: icon,
        air_temp_high: Number(highC.toFixed(1)),
        air_temp_low: Number(lowC.toFixed(1)),
        precip_probability: precipProb,
        wind_avg: Number(windAvgMs.toFixed(1)),
        wind_direction_cardinal: windDir,
        uv: 5
      };
    });
  },

  /**
   * Map NOAA weather conditions and icon URLs to module vector glyph keys
   */
  mapNoaaIcon: function (iconUrl, conditions, isNight) {
    const text = ((iconUrl || "") + " " + (conditions || "")).toLowerCase();
    const night = isNight || text.includes("/night/") || text.includes("night") || text.includes("moon");

    if (text.includes("tsra") || text.includes("thunder") || text.includes("lightning") || text.includes("tstorm")) {
      return "thunderstorm";
    }
    if (text.includes("snow") || text.includes("flurries") || text.includes("blizzard") || text.includes("sleet")) {
      return "snow";
    }
    if (text.includes("rain") || text.includes("shower") || text.includes("drizzle")) {
      return night ? "rain-night" : "rain";
    }
    if (text.includes("fog") || text.includes("mist") || text.includes("haze") || text.includes("smoke")) {
      return "fog";
    }
    if (text.includes("wind") || text.includes("breezy")) {
      return "windy";
    }
    if (text.includes("bkn") || text.includes("ovc") || text.includes("cloud") || text.includes("overcast")) {
      return night ? "cloudy-night" : "cloudy";
    }
    if (text.includes("sct") || text.includes("few") || text.includes("partly")) {
      return night ? "partly-cloudy-night" : "partly-cloudy";
    }
    if (text.includes("skc") || text.includes("clear") || text.includes("sunny")) {
      return night ? "clear-night" : "clear";
    }
    return night ? "clear-night" : "partly-cloudy";
  },

  degreesToCardinal: function (deg) {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const idx = Math.round((deg % 360) / 22.5) % 16;
    return directions[idx];
  }
});
