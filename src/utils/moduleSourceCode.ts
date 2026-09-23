import { ModuleConfig } from '../types/tempest.ts';

export function getMmmTempestWxJs(): string {
  return `/* MagicMirror²
 * Module: MMM-TempestWx
 *
 * Minimalist weather station module for Tempest by WeatherFlow.
 * Uses built-in Node.js API calls, modern minimalist icons, and touch modal support.
 * MIT Licensed.
 */

Module.register("MMM-TempestWx", {
  defaults: {
    stationId: "",              // Your Tempest Station ID
    token: "",                  // Your Tempest Personal Use Token (from tempestwx.com)
    units: "imperial",          // "imperial" (°F, mph, inHg) or "metric" (°C, km/h, hPa)
    pressureUnit: "inHg",       // "inHg", "hPa", or "mb"
    updateInterval: 60 * 1000,  // Check every 60 seconds
    showModalOnTouch: true,     // Enable tap-to-open 7-day forecast & wind modal
    autoCloseModalSeconds: 30,  // Auto-dismiss modal after 30 seconds of inactivity
    showFeelsLike: true,        // Show "Feels like" temperature
    showDewPoint: true,         // Show dew point
    showTrendArrows: true,      // Show barometric pressure trend arrow (↗, →, ↘)
    stationName: ""             // Optional custom title (defaults to Tempest station name)
  },

  getStyles: function () {
    return ["MMM-TempestWx.css"];
  },

  start: function () {
    Log.info("Starting module: " + this.name);
    this.loaded = false;
    this.stationData = null;
    this.errorMessage = null;
    this.modalOpen = false;
    this.modalCountdown = this.config.autoCloseModalSeconds;
    this.countdownTimer = null;

    // Send config to node_helper to initiate API polling via built-in Node.js
    this.sendSocketNotification("CONFIG", this.config);
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "TEMPEST_DATA") {
      this.loaded = true;
      this.stationData = payload;
      this.errorMessage = null;
      this.updateDom(300);
    } else if (notification === "TEMPEST_ERROR") {
      this.errorMessage = payload;
      this.updateDom(300);
    }
  },

  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-tempest-wx-wrapper";

    if (this.errorMessage) {
      wrapper.innerHTML = \`<div class="tempest-error dimmed small">\${this.errorMessage}</div>\`;
      return wrapper;
    }

    if (!this.loaded || !this.stationData) {
      wrapper.innerHTML = \`<div class="tempest-loading dimmed small">Loading Tempest Station Data...</div>\`;
      return wrapper;
    }

    const obs = this.stationData.observation;
    const isImperial = this.config.units === "imperial";

    // Format metrics
    const tempVal = isImperial ? Math.round((obs.air_temperature * 9) / 5 + 32) : Math.round(obs.air_temperature);
    const feelsLikeVal = isImperial ? Math.round((obs.feels_like * 9) / 5 + 32) : Math.round(obs.feels_like);
    const dewPointVal = isImperial ? Math.round((obs.dew_point * 9) / 5 + 32) : Math.round(obs.dew_point);
    const humVal = Math.round(obs.relative_humidity);

    let pressureStr = obs.barometric_pressure.toFixed(1);
    let pUnit = this.config.pressureUnit;
    if (pUnit === "inHg") {
      pressureStr = (obs.barometric_pressure * 0.02952998).toFixed(2);
    }

    let trendIcon = "→";
    if (obs.pressure_trend === "rising") trendIcon = "↗";
    if (obs.pressure_trend === "falling") trendIcon = "↘";

    const windSpeed = isImperial ? Math.round(obs.wind_avg * 2.23694) : Math.round(obs.wind_avg * 3.6);
    const windUnit = isImperial ? "mph" : "km/h";

    const hasLightning = obs.lightning_strike_count > 0 && obs.lightning_strike_last_distance > 0 && obs.lightning_strike_last_distance <= 45;
    const lightningDist = isImperial
      ? (obs.lightning_strike_last_distance * 0.621371).toFixed(1) + " mi"
      : obs.lightning_strike_last_distance.toFixed(1) + " km";
    const isSevereLightning = obs.lightning_strike_last_distance <= 10;

    // Build Module HTML
    const moduleContainer = document.createElement("div");
    moduleContainer.className = "tempest-card" + (this.config.showModalOnTouch ? " touchable" : "");

    // Touch event to open detailed modal
    if (this.config.showModalOnTouch) {
      moduleContainer.addEventListener("click", () => this.openTouchModal());
      moduleContainer.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.openTouchModal();
      });
    }

    moduleContainer.innerHTML = \`
      <div class="tempest-header">
        <span class="tempest-title bright">\${this.config.stationName || obs.station_name || "TEMPEST WX"}</span>
        <span class="tempest-touch-hint dimmed">Tap for Forecast</span>
      </div>

      \${hasLightning ? \`
        <div class="tempest-lightning-alert \${isSevereLightning ? 'danger' : 'caution'}">
          <span class="lightning-bolt">⚡</span>
          <span class="alert-title">\${isSevereLightning ? 'WARNING: LIGHTNING' : 'LIGHTNING DETECTED'}: \${lightningDist} (\${obs.lightning_strike_count} strikes)</span>
        </div>
      \` : ""}

      <div class="tempest-metrics-grid">
        <!-- Temperature -->
        <div class="metric-item">
          <div class="metric-label dimmed">
            <svg class="tempest-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M14 14.76V3.5a2 2 0 0 0-4 0v11.26a4.5 4.5 0 1 0 4 0z" />
              <path d="M12 9v5" stroke-width="2" />
              <circle cx="12" cy="17" r="1.8" fill="currentColor" />
            </svg>
            <span>TEMP</span>
          </div>
          <div class="metric-value bright"><span class="large">\${tempVal}</span><span class="temp-degree">°</span></div>
          \${this.config.showFeelsLike ? \`<div class="metric-sub dimmed">Feels \${feelsLikeVal}°</div>\` : ""}
        </div>

        <!-- Relative Humidity -->
        <div class="metric-item">
          <div class="metric-label dimmed">
            <svg class="tempest-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              <path d="M7.5 13.8c1.2-1.5 2.8-1.8 4.5-1.2 1.7.6 3.2.4 4.5-.8" stroke-width="1.4" opacity="0.75" />
            </svg>
            <span>HUMIDITY</span>
          </div>
          <div class="metric-value bright"><span class="large">\${humVal}</span><span class="percent-sign">%</span></div>
          \${this.config.showDewPoint ? \`<div class="metric-sub dimmed">Dew \${dewPointVal}°</div>\` : ""}
        </div>

        <!-- Barometric Pressure -->
        <div class="metric-item">
          <div class="metric-label dimmed">
            <svg class="tempest-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="4.5" x2="12" y2="6.5" opacity="0.5" stroke-width="1.5" />
              <line x1="19.5" y1="12" x2="17.5" y2="12" opacity="0.5" stroke-width="1.5" />
              <line x1="4.5" y1="12" x2="6.5" y2="12" opacity="0.5" stroke-width="1.5" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <path d="M12 12l4-4" stroke-width="2" />
            </svg>
            <span>PRESSURE</span>
          </div>
          <div class="metric-value bright"><span class="medium">\${pressureStr}</span> <span class="p-unit xsmall">\${pUnit}</span></div>
          <div class="metric-sub dimmed"><span class="trend-icon">\${trendIcon}</span> \${obs.pressure_trend}</div>
        </div>
      </div>

      <div class="tempest-footer dimmed xsmall">
        <div class="footer-wind">
          <svg class="wind-arrow" style="transform: rotate(\${obs.wind_direction}deg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
          <span>\${obs.wind_direction_cardinal} \${windSpeed} \${windUnit}</span>
        </div>
        <div class="footer-aux">
          <span class="uv-label">UV \${(obs.uv || 0).toFixed(1)}</span>
          \${obs.precip_accum_local_day > 0 ? \`<span> · \${obs.precip_accum_local_day.toFixed(1)}mm rain</span>\` : ""}
        </div>
      </div>
    \`;

    wrapper.appendChild(moduleContainer);

    // If modal is active, append the Touchscreen Modal
    if (this.modalOpen) {
      wrapper.appendChild(this.buildModalDom());
    }

    return wrapper;
  },

  openTouchModal: function () {
    this.modalOpen = true;
    this.modalCountdown = this.config.autoCloseModalSeconds || 30;
    this.updateDom(200);

    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.countdownTimer = setInterval(() => {
      this.modalCountdown--;
      if (this.modalCountdown <= 0) {
        this.closeTouchModal();
      } else {
        const countdownEl = document.getElementById("tempest-modal-countdown");
        if (countdownEl) countdownEl.innerText = this.modalCountdown + "s";
      }
    }, 1000);
  },

  closeTouchModal: function () {
    this.modalOpen = false;
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.updateDom(200);
  },

  buildModalDom: function () {
    const modalBackdrop = document.createElement("div");
    modalBackdrop.className = "tempest-modal-overlay";
    modalBackdrop.addEventListener("click", () => this.closeTouchModal());

    const modalBox = document.createElement("div");
    modalBox.className = "tempest-modal-box";
    modalBox.addEventListener("click", (e) => {
      e.stopPropagation();
      this.modalCountdown = this.config.autoCloseModalSeconds || 30; // reset on touch
    });

    const daily = this.stationData.forecast_daily || [];
    const hourly = (this.stationData.forecast_hourly || []).slice(0, 16);
    const isImperial = this.config.units === "imperial";

    // Render 7-day forecast cards
    let dailyHtml = daily.map(d => {
      const high = isImperial ? Math.round((d.air_temp_high * 9) / 5 + 32) : Math.round(d.air_temp_high);
      const low = isImperial ? Math.round((d.air_temp_low * 9) / 5 + 32) : Math.round(d.air_temp_low);
      return \`
        <div class="forecast-day-card">
          <div class="day-title bright">\${d.day_name}</div>
          <div class="day-conditions dimmed xsmall">\${d.conditions}</div>
          <div class="day-temps bright small">\${high}° <span class="dimmed xsmall">/ \${low}°</span></div>
          <div class="day-rain xsmall">\${d.precip_probability}% rain</div>
        </div>
      \`;
    }).join("");

    // Render hourly cards with Temperature, Humidity, Wind Speed, UV Index, and Rain Accumulation
    let hourlyHtml = hourly.map(h => {
      const temp = isImperial ? Math.round((h.air_temp * 9) / 5 + 32) : Math.round(h.air_temp);
      const speed = isImperial ? Math.round(h.wind_avg * 2.23694) : Math.round(h.wind_avg * 3.6);
      const gust = isImperial ? Math.round(h.wind_gust * 2.23694) : Math.round(h.wind_gust * 3.6);
      const rain = isImperial ? (h.precip_accum * 0.0393701).toFixed(2) + "in" : (h.precip_accum || 0).toFixed(1) + "mm";

      return \`
        <div class="hourly-col">
          <div class="hourly-time dimmed xsmall">\${h.hour_label}</div>
          <div class="hourly-temp bright small">\${temp}°</div>
          <div class="hourly-hum cyan-text xsmall">\${h.relative_humidity || 50}%</div>
          <div class="hourly-wind xsmall">
            <svg class="wind-vector-glyph" style="transform: rotate(\${h.wind_direction}deg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
            <span>\${speed}</span>
          </div>
          <div class="hourly-uv orange-text xxsmall">UV \${(h.uv || 0).toFixed(1)}</div>
          <div class="hourly-rain indigo-text xxsmall">\${h.precip_probability || 0}% · \${rain}</div>
        </div>
      \`;
    }).join("");

    modalBox.innerHTML = \`
      <div class="modal-head">
        <div>
          <span class="bright medium">\${this.stationData.station_name || "Tempest Detailed Forecast"}</span>
          <span class="dimmed xsmall ml-2">Auto-close in <span id="tempest-modal-countdown">\${this.modalCountdown}s</span></span>
        </div>
        <button class="modal-close-btn bright" id="tempest-modal-close-btn">✕ Close</button>
      </div>

      <div class="modal-section-title dimmed small">7-Day Extended Forecast</div>
      <div class="forecast-grid">\${dailyHtml}</div>

      <div class="modal-section-title dimmed small mt-4">Hourly Trends (Temp · Humidity · Wind · UV · Rain)</div>
      <div class="hourly-scroll-container">
        <div class="hourly-grid">\${hourlyHtml}</div>
      </div>
    \`;

    const closeBtn = modalBox.querySelector("#tempest-modal-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => this.closeTouchModal());

    modalBackdrop.appendChild(modalBox);
    return modalBackdrop;
  }
});
`;
}

export function getNodeHelperJs(): string {
  return `/* MagicMirror²
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
    console.log("Starting node helper for: " + this.name);
    this.config = null;
    this.pollTimer = null;
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "CONFIG") {
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
   * Helper utilizing built-in Node.js https.get with native Promise
   */
  httpGetJson: function (url) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          "Accept": "application/json",
          "User-Agent": "MagicMirror-MMM-TempestWx/1.0"
        }
      };

      https.get(url, options, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(\`HTTP \${res.statusCode}: \${res.statusMessage}\`));
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

    const { stationId, token } = this.config;
    const obsUrl = \`https://swd.weatherflow.com/id/observations/station/\${encodeURIComponent(stationId)}?token=\${encodeURIComponent(token)}\`;
    const forecastUrl = \`https://swd.weatherflow.com/id/better_forecast?station_id=\${encodeURIComponent(stationId)}&token=\${encodeURIComponent(token)}\`;

    try {
      // Parallel fetch using built-in Node.js https
      const [obsData, forecastData] = await Promise.all([
        this.httpGetJson(obsUrl),
        this.httpGetJson(forecastUrl).catch((err) => {
          console.warn("TempestWx: Forecast API notice: " + err.message);
          return null;
        })
      ]);

      const rawObs = obsData?.obs?.[0];
      if (!rawObs) {
        throw new Error("No observation array returned for station " + stationId);
      }

      // Tempest obs indices:
      // [0]=epoch, [2]=wind_avg, [3]=wind_gust, [4]=wind_dir,
      // [6]=pressure, [7]=air_temp, [8]=rel_humidity, [10]=uv, [11]=solar_rad,
      // [12]=rain_accum, [14]=lightning_dist, [15]=lightning_count, [16]=battery
      const airTemp = rawObs[7];
      const relHumidity = rawObs[8];
      const pressure = rawObs[6];
      const windAvg = rawObs[2];
      const windGust = rawObs[3];
      const windDir = rawObs[4];
      const dewPoint = airTemp - ((100 - relHumidity) / 5);

      const observation = {
        station_id: stationId,
        station_name: obsData.station_name || "Tempest Station #" + stationId,
        air_temperature: airTemp,
        relative_humidity: relHumidity,
        barometric_pressure: pressure,
        pressure_trend: "steady",
        wind_avg: windAvg,
        wind_gust: windGust,
        wind_direction: windDir,
        wind_direction_cardinal: this.degreesToCardinal(windDir),
        solar_radiation: rawObs[11] || 0,
        uv: rawObs[10] || 0,
        precip_accum_local_day: rawObs[12] || 0,
        lightning_strike_last_distance: rawObs[14] || 0,
        lightning_strike_count: rawObs[15] || 0,
        battery: rawObs[16] || 2.78,
        feels_like: forecastData?.current_conditions?.feels_like || airTemp,
        dew_point: dewPoint
      };

      // Extract 7-day forecast
      let forecastDaily = [];
      if (forecastData?.forecast?.daily) {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        forecastDaily = forecastData.forecast.daily.slice(0, 7).map((d, i) => {
          const date = new Date(d.day_start_local * 1000);
          return {
            day_name: i === 0 ? "Today" : i === 1 ? "Tomorrow" : days[date.getDay()],
            conditions: d.conditions || "Partly Cloudy",
            air_temp_high: d.air_temp_high,
            air_temp_low: d.air_temp_low,
            precip_probability: d.precip_probability || 0,
            wind_avg: d.wind_avg || 0
          };
        });
      }

      // Extract hourly wind trends
      let forecastHourly = [];
      if (forecastData?.forecast?.hourly) {
        forecastHourly = forecastData.forecast.hourly.slice(0, 24).map((h) => {
          const d = new Date(h.time * 1000);
          const hrs = d.getHours();
          const hourLabel = hrs === 0 ? "12 AM" : hrs === 12 ? "12 PM" : hrs > 12 ? \`\${hrs - 12} PM\` : \`\${hrs} AM\`;
          return {
            hour_label: hourLabel,
            conditions: h.conditions || "Clear",
            air_temp: h.air_temp,
            relative_humidity: h.relative_humidity || 50,
            wind_avg: h.wind_avg,
            wind_gust: h.wind_gust || h.wind_avg,
            wind_direction: h.wind_direction,
            wind_direction_cardinal: this.degreesToCardinal(h.wind_direction),
            uv: h.uv || 0,
            precip_accum: h.precip || h.precip_accum || 0,
            precip_probability: h.precip_probability || 0
          };
        });
      }

      this.sendSocketNotification("TEMPEST_DATA", {
        station_id: stationId,
        station_name: obsData.station_name,
        observation: observation,
        forecast_daily: forecastDaily,
        forecast_hourly: forecastHourly
      });
    } catch (error) {
      console.error("TempestWx API fetch error:", error);
      this.sendSocketNotification("TEMPEST_ERROR", "TempestWx: " + error.message);
    }
  },

  degreesToCardinal: function (deg) {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const idx = Math.round((deg % 360) / 22.5) % 16;
    return directions[idx];
  }
});
`;
}

export function getMmmTempestWxCss(): string {
  return `/* MagicMirror²
 * Stylesheet: MMM-TempestWx
 * Native high-contrast monochrome with minimalist glyphs and touchscreen modal overlay
 */

.mmm-tempest-wx-wrapper {
  font-family: "Roboto", "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: #ffffff;
  user-select: none;
}

.tempest-card {
  display: inline-block;
  min-width: 290px;
  background: rgba(0, 0, 0, 0.85);
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.tempest-card.touchable {
  cursor: pointer;
}

.tempest-card.touchable:hover,
.tempest-card.touchable:active {
  background: rgba(20, 20, 20, 0.95);
  border-color: rgba(255, 255, 255, 0.25);
}

.tempest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  padding-bottom: 6px;
  margin-bottom: 10px;
}

.tempest-title {
  font-size: 11px;
  letter-spacing: 2px;
  font-weight: 500;
  text-transform: uppercase;
}

.tempest-touch-hint {
  font-size: 10px;
  opacity: 0.6;
}

.tempest-lightning-alert {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.tempest-lightning-alert.danger {
  background: rgba(225, 29, 72, 0.25);
  border: 1px solid rgba(244, 63, 94, 0.6);
  color: #fecdd3;
  animation: tempest-pulse 2s infinite ease-in-out;
}

.tempest-lightning-alert.caution {
  background: rgba(217, 119, 6, 0.25);
  border: 1px solid rgba(245, 158, 11, 0.5);
  color: #fde68a;
}

@keyframes tempest-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.tempest-metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 10px;
}

.metric-item {
  display: flex;
  flex-direction: column;
}

.metric-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  letter-spacing: 1px;
  margin-bottom: 3px;
  text-transform: uppercase;
}

.tempest-icon {
  width: 14px;
  height: 14px;
}

.metric-value {
  display: flex;
  align-items: baseline;
  line-height: 1.1;
}

.metric-value .large {
  font-size: 34px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
}

.metric-value .medium {
  font-size: 26px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
}

.metric-value .temp-degree,
.metric-value .percent-sign {
  font-size: 16px;
  font-weight: 300;
  opacity: 0.7;
  margin-left: 1px;
}

.metric-value .p-unit {
  font-size: 10px;
  margin-left: 2px;
  opacity: 0.7;
}

.metric-sub {
  font-size: 11px;
  margin-top: 3px;
  letter-spacing: 0.2px;
}

.tempest-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 8px;
}

.footer-wind {
  display: flex;
  align-items: center;
  gap: 5px;
}

.wind-arrow {
  width: 14px;
  height: 14px;
  transition: transform 0.4s ease;
}

/* TOUCHSCREEN MODAL STYLES */
.tempest-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.tempest-modal-box {
  width: 90vw;
  max-width: 960px;
  background: #09090b;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.9);
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.modal-close-btn {
  background: #27272a;
  border: none;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

.forecast-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.forecast-day-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
}

.wind-grid {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 6px;
  overflow-x: auto;
  padding: 8px 0;
}

.wind-hourly-col {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.wind-vector-glyph {
  width: 16px;
  height: 16px;
  margin: 6px 0;
}
`;
}

export function getPackageJson(): string {
  return JSON.stringify(
    {
      name: "MMM-TempestWx",
      version: "1.0.0",
      description: "MagicMirror² module for Tempest weather station with touch-enabled forecast & wind trend modals",
      main: "MMM-TempestWx.js",
      scripts: {
        test: 'echo "Zero dependencies required - pure Node.js native API" && exit 0'
      },
      keywords: [
        "magicmirror",
        "magicmirror2",
        "tempest",
        "weatherflow",
        "weather station",
        "touchscreen"
      ],
      author: "TempestWx Community",
      license: "MIT",
      dependencies: {}
    },
    null,
    2
  );
}

export function getReadmeMd(config: ModuleConfig): string {
  return `# MMM-TempestWx

A minimalist, high-contrast [MagicMirror²](https://magicmirror.builders/) module for **Tempest Weather Stations** by WeatherFlow.

Designed specifically for two-way mirror glass aesthetics: deep jet black canvas, high contrast crisp white typography, and modern minimalist vector icons. Built using **native built-in Node.js functionality** (\`https\` and \`fetch\`) for API calls, requiring **ZERO external npm dependencies**.

Includes full **touchscreen support**: tap the module on any touch-enabled mirror or Raspberry Pi display to pull up a full 7-day forecast and 24-hour hourly wind vector trends modal!

---

## Features

- 🌡️ **Real-Time Core Metrics**: High-precision temperature, relative humidity, and barometric pressure.
- ⚡ **Zero Dependencies**: Pure built-in Node.js \`https\` API calls; no third-party HTTP libraries or bloated node modules required.
- 📐 **Minimalist MagicMirror² Aesthetic**: Native Roboto typography, tabular figures, and calibrated SVG glyphs.
- 📊 **Touchscreen Interactive Modal**:
  - Full **7-Day Hyper-Local Forecast** with thermal min/max ranges and precipitation probability.
  - **Hourly Wind Trends & Vectors**: 24-hour wind velocity curves, peak gusts, and rotational compass vectors.
  - **Station Telemetry**: Solar radiation (W/m²), UV Index, lightning detection, and supercapacitor battery health.
  - Configurable auto-dismiss countdown timer for smart mirror hands-free operation.

---

## Installation

1. Navigate to your MagicMirror \`modules\` folder:
\`\`\`bash
cd ~/MagicMirror/modules
\`\`\`

2. Clone this repository:
\`\`\`bash
git clone https://github.com/tempestwx/MMM-TempestWx.git
\`\`\`

3. No \`npm install\` is required! The module runs directly on standard Node.js.

---

## Configuration

Add the module to your \`config/config.js\` file:

\`\`\`javascript
{
  module: "MMM-TempestWx",
  position: "${config.mirrorPosition || 'top_right'}",
  config: {
    stationId: "${config.stationId || 'YOUR_TEMPEST_STATION_ID'}",
    token: "${config.token || 'YOUR_TEMPEST_PERSONAL_USE_TOKEN'}",
    units: "${config.units}",            // "imperial" or "metric"
    pressureUnit: "${config.pressureUnit}",        // "inHg", "hPa", or "mb"
    updateInterval: 60 * 1000,      // Poll interval in milliseconds (60 seconds)
    showModalOnTouch: true,         // Enable tap to open detailed modal
    autoCloseModalSeconds: 30,      // Auto close modal after 30s
    showFeelsLike: true,            // Show feels like temp
    showDewPoint: true,             // Show dew point
    showTrendArrows: true           // Show pressure rising/falling indicator
  }
}
\`\`\`

### Obtaining Your Tempest Station ID & Token

1. Log into your Tempest account at [tempestwx.com](https://tempestwx.com/).
2. Open **Settings > Stations** and select your station to find your **Station ID** in the URL or station info.
3. Open **Settings > Data Authorizations** and click **Create Token** to generate your Personal Access Token.

---

## License

MIT License. Crafted for MagicMirror² and weather enthusiasts.
`;
}
