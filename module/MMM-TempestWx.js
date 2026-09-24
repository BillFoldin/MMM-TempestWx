/* MagicMirror²
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
    stationName: "",            // Optional custom title (defaults to Tempest station name)
    animationSpeed: 0           // 0ms animation: prevents screen blink/flash on Raspberry Pi during polling
  },

  getStyles: function () {
    return ["MMM-TempestWx.css"];
  },

  start: function () {
    Log.info("[MMM-TempestWx] Starting module: " + this.name);
    this.loaded = false;
    this.stationData = null;
    this.errorMessage = null;
    this.modalOpen = false;
    this.modalCountdown = this.config.autoCloseModalSeconds;
    this.countdownTimer = null;

    // Send config to node_helper to initiate API polling via built-in Node.js
    this.sendSocketNotification("CONFIG", this.config);

    // Timeout: if no response from node_helper after 12s, provide actionable diagnostic
    this.loadingTimeout = setTimeout(() => {
      if (!this.loaded && !this.errorMessage) {
        this.errorMessage = "TempestWx: Waiting for node_helper.js. Check terminal/PM2 logs or verify node_helper.js is inside modules/MMM-TempestWx/";
        this.updateDom(this.config.animationSpeed || 0);
      }
    }, 12000);
  },

  notificationReceived: function (notification, payload, sender) {
    // When MagicMirror core announces all modules are started, re-ping node_helper if not loaded
    if (notification === "ALL_MODULES_STARTED" && !this.loaded) {
      Log.info("[MMM-TempestWx] All modules started, ensuring CONFIG sent to node_helper");
      this.sendSocketNotification("CONFIG", this.config);
    }
  },

  socketNotificationReceived: function (notification, payload) {
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }

    if (notification === "TEMPEST_DATA") {
      Log.info("[MMM-TempestWx] Successfully received Tempest observation payload.");
      const wasLoaded = this.loaded;
      const hadError = this.errorMessage !== null;
      this.loaded = true;
      this.stationData = payload;
      this.errorMessage = null;

      // In-place DOM update: if the card is already rendered on screen, update metrics in-place.
      // This completely avoids DOM recreation, style recalculation, and screen flashing on Raspberry Pi.
      if (wasLoaded && !hadError && this.updateCardInPlace()) {
        return;
      }
      this.updateDom(this.config.animationSpeed || 0);
    } else if (notification === "TEMPEST_ERROR") {
      const errText = typeof payload === "object" ? (payload.message + (payload.url ? " [URL: " + payload.url + "]" : "")) : payload;
      Log.error("[MMM-TempestWx] Error from node_helper: " + errText);
      this.errorMessage = payload;
      this.updateDom(this.config.animationSpeed || 0);
    }
  },

  updateCardInPlace: function () {
    const root = document.getElementById(this.identifier) || document.querySelector(".mmm-tempest-wx-wrapper");
    if (!root) return false;
    const card = root.querySelector(".tempest-card");
    if (!card || !this.stationData || !this.stationData.observation) return false;

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

    // Update text elements safely without replacing outer DOM
    const tempEl = card.querySelector(".metric-temp-val");
    if (tempEl) tempEl.textContent = String(tempVal);

    const feelsEl = card.querySelector(".metric-feels-val");
    if (feelsEl) feelsEl.textContent = "Feels " + feelsLikeVal + "°";

    const humEl = card.querySelector(".metric-hum-val");
    if (humEl) humEl.textContent = String(humVal);

    const dewEl = card.querySelector(".metric-dew-val");
    if (dewEl) dewEl.textContent = "Dew " + dewPointVal + "°";

    const pressureEl = card.querySelector(".metric-pressure-val");
    if (pressureEl) pressureEl.textContent = pressureStr;

    const trendEl = card.querySelector(".metric-trend-val");
    if (trendEl) {
      trendEl.innerHTML = '<span class="trend-icon">' + trendIcon + '</span> ' + obs.pressure_trend;
    }

    const windArrowEl = card.querySelector(".wind-arrow");
    if (windArrowEl) {
      windArrowEl.style.transform = "rotate(" + (obs.wind_direction || 0) + "deg)";
    }

    const windTextEl = card.querySelector(".footer-wind-text");
    if (windTextEl) {
      windTextEl.textContent = (obs.wind_direction_cardinal || "") + " " + windSpeed + " " + windUnit;
    }

    const uvEl = card.querySelector(".uv-label");
    if (uvEl) {
      uvEl.textContent = "UV " + (obs.uv || 0).toFixed(1);
    }

    const rainEl = card.querySelector(".rain-label");
    if (rainEl) {
      if (obs.precip_accum_local_day > 0) {
        rainEl.textContent = " · " + obs.precip_accum_local_day.toFixed(1) + "mm rain";
        rainEl.style.display = "inline";
      } else {
        rainEl.style.display = "none";
      }
    }

    const lightningContainer = card.querySelector(".lightning-container");
    const hasLightning = obs.lightning_strike_count > 0 && obs.lightning_strike_last_distance > 0 && obs.lightning_strike_last_distance <= 45;
    if (lightningContainer) {
      if (hasLightning) {
        const lightningDist = isImperial
          ? (obs.lightning_strike_last_distance * 0.621371).toFixed(1) + " mi"
          : obs.lightning_strike_last_distance.toFixed(1) + " km";
        const isSevereLightning = obs.lightning_strike_last_distance <= 10;
        lightningContainer.innerHTML = `
          <div class="tempest-lightning-alert ${isSevereLightning ? 'danger' : 'caution'}">
            <span class="lightning-bolt">⚡</span>
            <span class="alert-title">${isSevereLightning ? 'WARNING: LIGHTNING' : 'LIGHTNING DETECTED'}: ${lightningDist} (${obs.lightning_strike_count} strikes)</span>
          </div>
        `;
        lightningContainer.style.display = "block";
      } else {
        lightningContainer.innerHTML = "";
        lightningContainer.style.display = "none";
      }
    }

    return true;
  },

  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-tempest-wx-wrapper";

    if (this.errorMessage) {
      const msg = typeof this.errorMessage === "object" ? this.errorMessage.message : this.errorMessage;
      const url = typeof this.errorMessage === "object" ? this.errorMessage.url : null;
      wrapper.innerHTML = `
        <div class="tempest-card" style="border: 1px solid rgba(239,68,68,0.6); max-width: 440px; padding: 12px; border-radius: 10px; background: rgba(0,0,0,0.85); text-align: left;">
          <div style="color: #f87171; font-weight: 600; font-size: 13px; margin-bottom: 4px;">⚠️ TempestWx Error</div>
          <div style="color: #fca5a5; font-size: 11px; margin-bottom: 8px; line-height: 1.4;">${msg}</div>
          ${url ? `
            <div style="font-size: 10px; color: #94a3b8; margin-bottom: 3px; font-weight: 500;">Request URL:</div>
            <div style="font-family: monospace; font-size: 10px; color: #38bdf8; word-break: break-all; background: rgba(0,0,0,0.7); padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); user-select: all;">${url}</div>
          ` : ""}
        </div>
      `;
      return wrapper;
    }

    if (!this.loaded || !this.stationData) {
      wrapper.innerHTML = `<div class="tempest-loading dimmed small">Loading Tempest Station Data...</div>`;
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

    moduleContainer.innerHTML = `
      <div class="tempest-header">
        <span class="tempest-title bright">${this.config.stationName || obs.station_name || "TEMPEST WX"}</span>
        <span class="tempest-touch-hint dimmed">Tap for Forecast</span>
      </div>

      <div class="lightning-container"${hasLightning ? '' : ' style="display:none;"'}>
        ${hasLightning ? `
          <div class="tempest-lightning-alert ${isSevereLightning ? 'danger' : 'caution'}">
            <span class="lightning-bolt">⚡</span>
            <span class="alert-title">${isSevereLightning ? 'WARNING: LIGHTNING' : 'LIGHTNING DETECTED'}: ${lightningDist} (${obs.lightning_strike_count} strikes)</span>
          </div>
        ` : ""}
      </div>

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
          <div class="metric-value bright"><span class="large metric-temp-val">${tempVal}</span><span class="temp-degree">°</span></div>
          ${this.config.showFeelsLike ? `<div class="metric-sub dimmed metric-feels-val">Feels ${feelsLikeVal}°</div>` : ""}
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
          <div class="metric-value bright"><span class="large metric-hum-val">${humVal}</span><span class="percent-sign">%</span></div>
          ${this.config.showDewPoint ? `<div class="metric-sub dimmed metric-dew-val">Dew ${dewPointVal}°</div>` : ""}
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
          <div class="metric-value bright"><span class="medium metric-pressure-val">${pressureStr}</span> <span class="p-unit xsmall">${pUnit}</span></div>
          <div class="metric-sub dimmed metric-trend-val"><span class="trend-icon">${trendIcon}</span> ${obs.pressure_trend}</div>
        </div>
      </div>

      <div class="tempest-footer dimmed xsmall">
        <div class="footer-wind">
          <svg class="wind-arrow" style="transform: rotate(${obs.wind_direction}deg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
          <span class="footer-wind-text">${obs.wind_direction_cardinal} ${windSpeed} ${windUnit}</span>
        </div>
        <div class="footer-aux">
          <span class="uv-label">UV ${(obs.uv || 0).toFixed(1)}</span>
          <span class="rain-label"${obs.precip_accum_local_day > 0 ? '' : ' style="display:none;"'}>${obs.precip_accum_local_day > 0 ? ` · ${obs.precip_accum_local_day.toFixed(1)}mm rain` : ""}</span>
        </div>
      </div>
    `;

    wrapper.appendChild(moduleContainer);
    return wrapper;
  },

  getWeatherIconSvg: function (iconName, conditions) {
    const code = (iconName || conditions || "").toLowerCase();
    if (code.includes("thunder") || code.includes("tstorm")) {
      return '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none"><path d="M19 15A4 4 0 0 0 17 7.5h-1.26A7 7 0 1 0 5 14.5" stroke="#cbd5e1" stroke-width="2"/><polygon points="13 11 9 17 13 17 11 23 17 15 13 15 15 11" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5"/></svg>';
    }
    if (code.includes("snow") || code.includes("flurries") || code.includes("blizzard")) {
      return '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#e0f2fe" stroke-width="2"><path d="M20 16A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15" stroke="#cbd5e1"/><circle cx="8" cy="18" r="1.2" fill="#e0f2fe"/><circle cx="12" cy="20" r="1.2" fill="#e0f2fe"/><circle cx="16" cy="18" r="1.2" fill="#e0f2fe"/><circle cx="10" cy="22" r="1.2" fill="#e0f2fe"/><circle cx="14" cy="22" r="1.2" fill="#e0f2fe"/></svg>';
    }
    if (code.includes("rain") || code.includes("drizzle") || code.includes("shower")) {
      return '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="#cbd5e1"/><line x1="8" y1="18" x2="7" y2="21" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="18" x2="11" y2="21" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="18" x2="15" y2="21" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/></svg>';
    }
    if (code.includes("sleet") || code.includes("wintry")) {
      return '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M20 16A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15" stroke="#cbd5e1"/><line x1="8" y1="18" x2="7" y2="21" stroke="#38bdf8" stroke-width="2"/><circle cx="12" cy="20" r="1.2" fill="#e0f2fe"/><circle cx="16" cy="18" r="1.2" fill="#e0f2fe"/></svg>';
    }
    if (code.includes("fog") || code.includes("mist") || code.includes("haze")) {
      return '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="6" y1="13" x2="18" y2="13"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
    }
    if (code.includes("wind")) {
      return '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" stroke-width="2" stroke-linecap="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>';
    }
    if (code.includes("partly") || code.includes("scattered")) {
      return '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none"><path d="M12 4V2m0 18v-2m8-8h2M2 12h2m13.66-5.66l1.41-1.41M4.93 19.07l1.41-1.41" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" stroke="#f59e0b" stroke-width="2"/><path d="M17.5 19H9a5 5 0 0 1-.3-9.99 5.5 5.5 0 0 1 10.3-2.01A4.5 4.5 0 0 1 17.5 19z" fill="#09090b" stroke="#cbd5e1" stroke-width="2"/></svg>';
    }
    if (code.includes("cloud") || code.includes("overcast")) {
      return '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2"><path d="M17.5 19H9a5 5 0 0 1-.3-9.99 5.5 5.5 0 0 1 10.3-2.01A4.5 4.5 0 0 1 17.5 19z"/></svg>';
    }
    if (code.includes("night") || code.includes("moon")) {
      return '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
    // Default sunny / clear
    return '<svg class="forecast-icon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
  },

  openTouchModal: function () {
    this.closeTouchModal(); // clean up any existing modal

    if (!this.stationData) return;

    this.modalCountdown = this.config.autoCloseModalSeconds || 30;
    const modalDom = this.buildModalDom();
    document.body.appendChild(modalDom);
    this.modalElement = modalDom;

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
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    const existing = document.getElementById("tempest-modal-backdrop") || this.modalElement;
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    this.modalElement = null;
  },

  buildModalDom: function () {
    const modalBackdrop = document.createElement("div");
    modalBackdrop.id = "tempest-modal-backdrop";
    modalBackdrop.className = "tempest-modal-overlay";
    modalBackdrop.addEventListener("click", () => this.closeTouchModal());

    const modalBox = document.createElement("div");
    modalBox.className = "tempest-modal-box";
    modalBox.addEventListener("click", (e) => {
      e.stopPropagation();
      this.modalCountdown = this.config.autoCloseModalSeconds || 30; // reset on touch
    });

    const daily = this.stationData.forecast_daily || [];
    const hourly = (this.stationData.forecast_hourly || []).slice(0, 24);
    const isImperial = this.config.units === "imperial";

    // Set initial active tab and hour index
    if (!this.activeGraphTab) this.activeGraphTab = "temperature";
    if (typeof this.activeHourlyIndex !== "number") this.activeHourlyIndex = 0;

    // Render 7-day forecast cards with high-contrast weather icons
    let dailyHtml = daily.map(d => {
      const high = isImperial ? Math.round((d.air_temp_high * 9) / 5 + 32) : Math.round(d.air_temp_high);
      const low = isImperial ? Math.round((d.air_temp_low * 9) / 5 + 32) : Math.round(d.air_temp_low);
      const iconSvg = this.getWeatherIconSvg(d.icon, d.conditions);
      return `
        <div class="forecast-day-card">
          <div class="day-title bright">${d.day_name}</div>
          <div class="day-icon">${iconSvg}</div>
          <div class="day-conditions dimmed xsmall">${d.conditions || ""}</div>
          <div class="day-temps bright small">${high}° <span class="dimmed xsmall">/ ${low}°</span></div>
          <div class="day-rain xsmall">${d.precip_probability || 0}% rain</div>
        </div>
      `;
    }).join("");

    modalBox.innerHTML = `
      <div class="modal-head">
        <div>
          <span class="bright medium">${this.stationData.station_name || "Tempest Detailed Forecast"}</span>
          <span class="dimmed xsmall ml-2">Auto-close in <span id="tempest-modal-countdown">${this.modalCountdown}s</span></span>
        </div>
        <button class="modal-close-btn bright" id="tempest-modal-close-btn">✕ Close</button>
      </div>

      <div class="modal-section-title dimmed small">7-Day Extended Forecast</div>
      <div class="forecast-grid">${dailyHtml}</div>

      <!-- 24-HOUR LOCAL TELEMETRY TRENDS SECTION -->
      <div class="telemetry-section-container" id="tempest-telemetry-container"></div>
    `;

    const closeBtn = modalBox.querySelector("#tempest-modal-close-btn");
    if (closeBtn) closeBtn.addEventListener("click", () => this.closeTouchModal());

    // Render interactive telemetry trends graphs
    const telemetryContainer = modalBox.querySelector("#tempest-telemetry-container");
    if (telemetryContainer) {
      this.renderTelemetrySection(telemetryContainer, hourly, isImperial);
    }

    modalBackdrop.appendChild(modalBox);
    return modalBackdrop;
  },

  renderTelemetrySection: function (container, hourly, isImperial) {
    if (!hourly || hourly.length === 0) return;

    // Helper functions to safely extract numeric temperatures regardless of API property name
    const getHourTemp = (h) => {
      if (!h) return 20;
      const v = h.air_temperature !== undefined ? h.air_temperature : (h.air_temp !== undefined ? h.air_temp : (h.temp !== undefined ? h.temp : 20));
      const n = typeof v === "number" ? v : parseFloat(v);
      return isNaN(n) ? 20 : n;
    };
    const getHourFeels = (h) => {
      if (!h) return getHourTemp(h);
      const v = h.feels_like !== undefined ? h.feels_like : (h.air_temperature !== undefined ? h.air_temperature : h.air_temp);
      const n = typeof v === "number" ? v : parseFloat(v);
      return isNaN(n) ? getHourTemp(h) : n;
    };

    const firstHourTemp = getHourTemp(hourly[0]);
    const firstHourTempFormatted = Math.round(isImperial ? (firstHourTemp * 9) / 5 + 32 : firstHourTemp) + "°";

    const tabs = [
      {
        id: "temperature",
        title: "Temperature",
        icon: '<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',
        colorClass: "amber-tab",
        quickValue: firstHourTempFormatted
      },
      {
        id: "humidity",
        title: "Humidity",
        icon: '<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
        colorClass: "cyan-tab",
        quickValue: (hourly[0].relative_humidity || 50) + "%"
      },
      {
        id: "wind",
        title: "Wind Speed",
        icon: '<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>',
        colorClass: "sky-tab",
        quickValue: Math.round(isImperial ? hourly[0].wind_avg * 2.23694 : hourly[0].wind_avg * 3.6) + (isImperial ? " mph" : " km/h")
      },
      {
        id: "uv",
        title: "UV Index",
        icon: '<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
        colorClass: "orange-tab",
        quickValue: "UV " + (hourly[0].uv || 0).toFixed(1)
      },
      {
        id: "rain",
        title: "Rain Accumulation",
        icon: '<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="currentColor"/><line x1="8" y1="18" x2="7" y2="21" stroke="currentColor" stroke-linecap="round"/><line x1="12" y1="18" x2="11" y2="21" stroke="currentColor" stroke-linecap="round"/><line x1="16" y1="18" x2="15" y2="21" stroke="currentColor" stroke-linecap="round"/></svg>',
        colorClass: "indigo-tab",
        quickValue: isImperial ? (hourly[0].precip_accum * 0.0393701).toFixed(2) + " in" : (hourly[0].precip_accum || 0).toFixed(1) + " mm"
      }
    ];

    const currentTabIdx = Math.max(0, tabs.findIndex(t => t.id === this.activeGraphTab));
    this.activeGraphTab = tabs[currentTabIdx].id;

    let tabsHtml = tabs.map((tab) => {
      const isActive = tab.id === this.activeGraphTab;
      return `
        <button type="button" class="graph-tab-btn ${tab.colorClass} ${isActive ? 'active' : ''}" data-tab="${tab.id}">
          <span class="tab-icon-wrap">${tab.icon}</span>
          <span class="tab-label">${tab.title}</span>
          <span class="tab-pill">${tab.quickValue}</span>
        </button>
      `;
    }).join("");

    container.innerHTML = `
      <div class="telemetry-wrapper">
        <div class="telemetry-header">
          <div class="telemetry-title-box">
            <div class="telemetry-title-row">
              <span class="pulse-indicator"></span>
              <span class="telemetry-title">24-Hour Local Telemetry Trends</span>
            </div>
            <div class="telemetry-sub dimmed xsmall">Select graphs: Temperature, Humidity, Wind Speed, UV Index, & Rain</div>
          </div>
          <div class="telemetry-nav-controls">
            <button class="telemetry-arrow-btn" id="telemetry-prev-btn" title="Previous Graph">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="telemetry-page-counter dimmed">${currentTabIdx + 1} / ${tabs.length}</span>
            <button class="telemetry-arrow-btn" id="telemetry-next-btn" title="Next Graph">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

        <div class="graph-tabs-bar">${tabsHtml}</div>

        <div class="active-graph-card" id="active-graph-card-content">
          ${this.generateGraphCardHtml(this.activeGraphTab, hourly, isImperial, this.activeHourlyIndex)}
        </div>
      </div>
    `;

    const tabBtns = container.querySelectorAll(".graph-tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeGraphTab = btn.getAttribute("data-tab");
        this.modalCountdown = this.config.autoCloseModalSeconds || 30;
        this.renderTelemetrySection(container, hourly, isImperial);
      });
    });

    const prevBtn = container.querySelector("#telemetry-prev-btn");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        const nextIdx = (currentTabIdx - 1 + tabs.length) % tabs.length;
        this.activeGraphTab = tabs[nextIdx].id;
        this.modalCountdown = this.config.autoCloseModalSeconds || 30;
        this.renderTelemetrySection(container, hourly, isImperial);
      });
    }

    const nextBtn = container.querySelector("#telemetry-next-btn");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const nextIdx = (currentTabIdx + 1) % tabs.length;
        this.activeGraphTab = tabs[nextIdx].id;
        this.modalCountdown = this.config.autoCloseModalSeconds || 30;
        this.renderTelemetrySection(container, hourly, isImperial);
      });
    }

    this.attachScrubberEvents(container, hourly, isImperial);
  },

  attachScrubberEvents: function (container, hourly, isImperial) {
    const touchCols = container.querySelectorAll(".scrubber-touch-col");
    touchCols.forEach(col => {
      const idx = parseInt(col.getAttribute("data-index"), 10);
      const updateIdx = () => {
        if (this.activeHourlyIndex !== idx) {
          this.activeHourlyIndex = idx;
          this.modalCountdown = this.config.autoCloseModalSeconds || 30;
          const graphCard = container.querySelector("#active-graph-card-content");
          if (graphCard) {
            graphCard.innerHTML = this.generateGraphCardHtml(this.activeGraphTab, hourly, isImperial, idx);
            this.attachScrubberEvents(container, hourly, isImperial);
          }
        }
      };

      col.addEventListener("mouseenter", updateIdx);
      col.addEventListener("click", updateIdx);
      col.addEventListener("touchstart", (e) => {
        e.preventDefault();
        updateIdx();
      }, { passive: false });
    });
  },

  generateGraphCardHtml: function (graphType, hourly, isImperial, activeIdx) {
    const activeHour = hourly[activeIdx] || hourly[0] || {};
    const count = hourly.length;
    const condIcon = this.getWeatherIconSvg(activeHour.icon, activeHour.conditions);

    let timelineLabels = "";
    hourly.forEach((h, i) => {
      const isActive = i === activeIdx;
      const label = h.hour_label || (i + "h");
      timelineLabels += `<div class="timeline-hour-col ${isActive ? 'active-hour' : ''}">${label}</div>`;
    });

    let touchZones = "";
    hourly.forEach((_, i) => {
      touchZones += `<div class="scrubber-touch-col" data-index="${i}"></div>`;
    });

    if (graphType === "temperature") {
      let min = Infinity, max = -Infinity;
      hourly.forEach(h => {
        const raw = h.air_temperature !== undefined ? h.air_temperature : (h.air_temp !== undefined ? h.air_temp : (h.temp !== undefined ? h.temp : 20));
        const num = typeof raw === "number" && !isNaN(raw) ? raw : (parseFloat(raw) || 20);
        const t = isImperial ? (num * 9) / 5 + 32 : num;
        if (t < min) min = t;
        if (t > max) max = t;
      });
      if (min === Infinity || max === -Infinity) {
        min = isImperial ? 60 : 15;
        max = isImperial ? 75 : 24;
      }
      min = Math.floor(min);
      max = Math.ceil(max);
      const span = Math.max(4, max - min);
      const yMin = min - span * 0.15;
      const yMax = max + span * 0.15;
      const ySpan = Math.max(1, yMax - yMin);

      const pts = hourly.map((h, i) => {
        const raw = h.air_temperature !== undefined ? h.air_temperature : (h.air_temp !== undefined ? h.air_temp : (h.temp !== undefined ? h.temp : 20));
        const num = typeof raw === "number" && !isNaN(raw) ? raw : (parseFloat(raw) || 20);
        const t = isImperial ? (num * 9) / 5 + 32 : num;
        const x = (i / (count - 1)) * 760 + 20;
        const y = 180 - ((t - yMin) / ySpan) * 155;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      const rawActive = activeHour.air_temperature !== undefined ? activeHour.air_temperature : (activeHour.air_temp !== undefined ? activeHour.air_temp : (activeHour.temp !== undefined ? activeHour.temp : 20));
      const numActive = typeof rawActive === "number" && !isNaN(rawActive) ? rawActive : (parseFloat(rawActive) || 20);
      const rawActiveFeels = activeHour.feels_like !== undefined ? activeHour.feels_like : rawActive;
      const numActiveFeels = typeof rawActiveFeels === "number" && !isNaN(rawActiveFeels) ? rawActiveFeels : (parseFloat(rawActiveFeels) || numActive);
      const activeTemp = Math.round(isImperial ? (numActive * 9) / 5 + 32 : numActive);
      const activeFeels = Math.round(isImperial ? (numActiveFeels * 9) / 5 + 32 : numActiveFeels);
      const cursorX = ((activeIdx / (count - 1)) * 760 + 20).toFixed(1);
      const cursorY = (180 - ((activeTemp - yMin) / ySpan) * 155).toFixed(1);

      return `
        <div class="graph-card-header">
          <div class="graph-card-title-box">
            <div class="graph-card-title text-amber">
              <svg class="graph-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
              <span>Hourly Air Temperature & Thermal Trends</span>
            </div>
            <div class="graph-card-sub dimmed xsmall">24-hour diurnal thermal curve, ambient temp, and real-feel index</div>
          </div>
          <div class="scrubber-badge">
            <span class="scrubber-time dimmed">${activeHour.hour_label || "Now"}</span>
            <span class="scrubber-sep">|</span>
            <span class="scrubber-val text-amber">${activeTemp}°</span>
            <span class="scrubber-secondary dimmed">Feels ${activeFeels}°</span>
            <span class="scrubber-cond">${condIcon} <span>${activeHour.conditions || "Clear"}</span></span>
          </div>
        </div>

        <div class="svg-graph-wrapper">
          <div class="svg-grid-lines">
            <div class="grid-line"><span>Max: ${max}°</span></div>
            <div class="grid-line"><span>Mid: ${Math.round((max + min) / 2)}°</span></div>
            <div class="grid-line"><span>Min: ${min}°</span></div>
          </div>
          <svg class="telemetry-svg" viewBox="0 0 800 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.45"/>
                <stop offset="65%" stop-color="#f97316" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0"/>
              </linearGradient>
            </defs>
            <path d="M 20,185 L ${pts.join(' L ')} L 780,185 Z" fill="url(#tempGradient)"/>
            <path d="M ${pts.join(' L ')}" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
            <line x1="${cursorX}" y1="10" x2="${cursorX}" y2="185" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6"/>
            <circle cx="${cursorX}" cy="${cursorY}" r="5.5" fill="#f59e0b" stroke="#000000" stroke-width="2"/>
          </svg>
          <div class="svg-touch-overlay">${touchZones}</div>
        </div>

        <div class="timeline-labels-row">${timelineLabels}</div>

        <div class="graph-stats-grid">
          <div class="stat-tile">
            <div class="stat-name dimmed">MIN TEMP</div>
            <div class="stat-val bright">${min}°</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">MAX TEMP</div>
            <div class="stat-val bright">${max}°</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">CURRENT TEMP</div>
            <div class="stat-val text-amber">${activeTemp}°</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">FEELS LIKE</div>
            <div class="stat-val bright">${activeFeels}°</div>
          </div>
        </div>
      `;
    }

    if (graphType === "humidity") {
      let min = 100, max = 0, sum = 0;
      hourly.forEach(h => {
        const rh = h.relative_humidity ?? 50;
        if (rh < min) min = rh;
        if (rh > max) max = rh;
        sum += rh;
      });
      const avg = Math.round(sum / count);
      const span = Math.max(15, max - min);
      const yMin = Math.max(0, min - span * 0.1);
      const yMax = Math.min(100, max + span * 0.1);
      const ySpan = Math.max(10, yMax - yMin);

      const pts = hourly.map((h, i) => {
        const rh = h.relative_humidity ?? 50;
        const x = (i / (count - 1)) * 760 + 20;
        const y = 180 - ((rh - yMin) / ySpan) * 155;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      const activeRh = activeHour.relative_humidity ?? 50;
      const cursorX = ((activeIdx / (count - 1)) * 760 + 20).toFixed(1);
      const cursorY = (180 - ((activeRh - yMin) / ySpan) * 155).toFixed(1);
      const comfort = activeRh < 35 ? "Dry" : activeRh > 65 ? "Humid" : "Comfortable";

      return `
        <div class="graph-card-header">
          <div class="graph-card-title-box">
            <div class="graph-card-title text-cyan">
              <svg class="graph-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
              <span>Relative Humidity & Moisture Spectrum</span>
            </div>
            <div class="graph-card-sub dimmed xsmall">24-hour moisture saturation curve & comfort envelope</div>
          </div>
          <div class="scrubber-badge">
            <span class="scrubber-time dimmed">${activeHour.hour_label || "Now"}</span>
            <span class="scrubber-sep">|</span>
            <span class="scrubber-val text-cyan">${activeRh}%</span>
            <span class="scrubber-secondary dimmed">${comfort}</span>
            <span class="scrubber-cond">${condIcon} <span>${activeHour.conditions || ""}</span></span>
          </div>
        </div>

        <div class="svg-graph-wrapper">
          <div class="svg-grid-lines">
            <div class="grid-line"><span>Max: ${max}%</span></div>
            <div class="grid-line"><span>Mid: ${Math.round((max + min) / 2)}%</span></div>
            <div class="grid-line"><span>Min: ${min}%</span></div>
          </div>
          <svg class="telemetry-svg" viewBox="0 0 800 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.45"/>
                <stop offset="70%" stop-color="#0284c7" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#0284c7" stop-opacity="0.0"/>
              </linearGradient>
            </defs>
            <path d="M 20,185 L ${pts.join(' L ')} L 780,185 Z" fill="url(#humGradient)"/>
            <path d="M ${pts.join(' L ')}" fill="none" stroke="#06b6d4" stroke-width="2.5"/>
            <line x1="${cursorX}" y1="10" x2="${cursorX}" y2="185" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6"/>
            <circle cx="${cursorX}" cy="${cursorY}" r="5.5" fill="#06b6d4" stroke="#000000" stroke-width="2"/>
          </svg>
          <div class="svg-touch-overlay">${touchZones}</div>
        </div>

        <div class="timeline-labels-row">${timelineLabels}</div>

        <div class="graph-stats-grid">
          <div class="stat-tile">
            <div class="stat-name dimmed">MIN HUMIDITY</div>
            <div class="stat-val bright">${min}%</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">MAX HUMIDITY</div>
            <div class="stat-val bright">${max}%</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">24H AVERAGE</div>
            <div class="stat-val text-cyan">${avg}%</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">COMFORT STATUS</div>
            <div class="stat-val bright">${comfort}</div>
          </div>
        </div>
      `;
    }

    if (graphType === "wind") {
      let maxGust = 0, sumAvg = 0;
      hourly.forEach(h => {
        const gust = Math.max(h.wind_avg || 0, h.wind_gust || 0);
        if (gust > maxGust) maxGust = gust;
        sumAvg += (h.wind_avg || 0);
      });
      const speedMult = isImperial ? 2.23694 : 3.6;
      const speedUnit = isImperial ? "mph" : "km/h";
      const maxGustVal = Math.max(8, Math.ceil(maxGust * speedMult));
      const avgWindVal = Math.round((sumAvg / count) * speedMult);

      const ptsAvg = hourly.map((h, i) => {
        const spd = (h.wind_avg || 0) * speedMult;
        const x = (i / (count - 1)) * 760 + 20;
        const y = 180 - (spd / maxGustVal) * 155;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      const ptsGust = hourly.map((h, i) => {
        const gst = (h.wind_gust || h.wind_avg || 0) * speedMult;
        const x = (i / (count - 1)) * 760 + 20;
        const y = 180 - (gst / maxGustVal) * 155;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      const activeSpeed = Math.round((activeHour.wind_avg || 0) * speedMult);
      const activeGust = Math.round((activeHour.wind_gust || activeHour.wind_avg || 0) * speedMult);
      const cursorX = ((activeIdx / (count - 1)) * 760 + 20).toFixed(1);
      const cursorY = (180 - (activeSpeed / maxGustVal) * 155).toFixed(1);

      return `
        <div class="graph-card-header">
          <div class="graph-card-title-box">
            <div class="graph-card-title text-sky">
              <svg class="graph-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
              <span>Wind Velocity & Direction Profile</span>
            </div>
            <div class="graph-card-sub dimmed xsmall">24-hour wind velocity, peak gusts, and direction trajectory</div>
          </div>
          <div class="scrubber-badge">
            <span class="scrubber-time dimmed">${activeHour.hour_label || "Now"}</span>
            <span class="scrubber-sep">|</span>
            <span class="scrubber-val text-sky">${activeSpeed} ${speedUnit}</span>
            <span class="scrubber-secondary dimmed">Gust ${activeGust} ${speedUnit}</span>
            <span class="scrubber-cond">
              <svg class="wind-vector-glyph" style="transform: rotate(${activeHour.wind_direction || 0}deg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              <span>${activeHour.wind_direction_cardinal || "N"}</span>
            </span>
          </div>
        </div>

        <div class="svg-graph-wrapper">
          <div class="svg-grid-lines">
            <div class="grid-line"><span>Peak: ${maxGustVal} ${speedUnit}</span></div>
            <div class="grid-line"><span>Mid: ${Math.round(maxGustVal / 2)} ${speedUnit}</span></div>
            <div class="grid-line"><span>Calm: 0 ${speedUnit}</span></div>
          </div>
          <svg class="telemetry-svg" viewBox="0 0 800 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="windGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#0284c7" stop-opacity="0.0"/>
              </linearGradient>
            </defs>
            <path d="M 20,185 L ${ptsGust.join(' L ')} L 780,185 Z" fill="url(#windGradient)"/>
            <path d="M ${ptsGust.join(' L ')}" fill="none" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="4 4"/>
            <path d="M ${ptsAvg.join(' L ')}" fill="none" stroke="#38bdf8" stroke-width="2.5"/>
            <line x1="${cursorX}" y1="10" x2="${cursorX}" y2="185" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6"/>
            <circle cx="${cursorX}" cy="${cursorY}" r="5.5" fill="#38bdf8" stroke="#000000" stroke-width="2"/>
          </svg>
          <div class="svg-touch-overlay">${touchZones}</div>
        </div>

        <div class="timeline-labels-row">${timelineLabels}</div>

        <div class="graph-stats-grid">
          <div class="stat-tile">
            <div class="stat-name dimmed">AVG SPEED</div>
            <div class="stat-val bright">${avgWindVal} ${speedUnit}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">PEAK GUST</div>
            <div class="stat-val text-sky">${Math.round(maxGust * speedMult)} ${speedUnit}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">DIRECTION</div>
            <div class="stat-val bright">${activeHour.wind_direction_cardinal || "N"} (${activeHour.wind_direction || 0}°)</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">AIR STATUS</div>
            <div class="stat-val bright">${activeSpeed < 4 ? "Light Air" : activeSpeed < 12 ? "Gentle Breeze" : "Breezy"}</div>
          </div>
        </div>
      `;
    }

    if (graphType === "uv") {
      let maxUv = 0, daylight = 0;
      hourly.forEach(h => {
        const u = h.uv || 0;
        if (u > maxUv) maxUv = u;
        if (u > 0.5) daylight++;
      });
      const maxScale = Math.max(6, Math.ceil(maxUv + 1));
      const activeUv = (activeHour.uv || 0).toFixed(1);
      const risk = activeHour.uv > 7 ? "Very High" : activeHour.uv > 5 ? "High" : activeHour.uv > 2 ? "Moderate" : "Low";

      const pts = hourly.map((h, i) => {
        const u = h.uv || 0;
        const x = (i / (count - 1)) * 760 + 20;
        const y = 180 - (u / maxScale) * 155;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      const cursorX = ((activeIdx / (count - 1)) * 760 + 20).toFixed(1);
      const cursorY = (180 - ((activeHour.uv || 0) / maxScale) * 155).toFixed(1);

      return `
        <div class="graph-card-header">
          <div class="graph-card-title-box">
            <div class="graph-card-title text-orange">
              <svg class="graph-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              <span>Solar Radiation & UV Index Risk</span>
            </div>
            <div class="graph-card-sub dimmed xsmall">24-hour UV intensity spectrum & daytime solar exposure</div>
          </div>
          <div class="scrubber-badge">
            <span class="scrubber-time dimmed">${activeHour.hour_label || "Now"}</span>
            <span class="scrubber-sep">|</span>
            <span class="scrubber-val text-orange">UV ${activeUv}</span>
            <span class="scrubber-secondary dimmed">${risk} Risk</span>
            <span class="scrubber-cond">${condIcon} <span>${activeHour.conditions || ""}</span></span>
          </div>
        </div>

        <div class="svg-graph-wrapper">
          <div class="svg-grid-lines">
            <div class="grid-line"><span>Max Scale: UV ${maxScale}</span></div>
            <div class="grid-line"><span>Moderate Threshold: UV 3</span></div>
            <div class="grid-line"><span>Zero: UV 0</span></div>
          </div>
          <svg class="telemetry-svg" viewBox="0 0 800 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f97316" stop-opacity="0.5"/>
                <stop offset="60%" stop-color="#fb923c" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="#f97316" stop-opacity="0.0"/>
              </linearGradient>
            </defs>
            <path d="M 20,185 L ${pts.join(' L ')} L 780,185 Z" fill="url(#uvGradient)"/>
            <path d="M ${pts.join(' L ')}" fill="none" stroke="#f97316" stroke-width="2.5"/>
            <line x1="${cursorX}" y1="10" x2="${cursorX}" y2="185" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6"/>
            <circle cx="${cursorX}" cy="${cursorY}" r="5.5" fill="#f97316" stroke="#000000" stroke-width="2"/>
          </svg>
          <div class="svg-touch-overlay">${touchZones}</div>
        </div>

        <div class="timeline-labels-row">${timelineLabels}</div>

        <div class="graph-stats-grid">
          <div class="stat-tile">
            <div class="stat-name dimmed">PEAK UV INDEX</div>
            <div class="stat-val text-orange">UV ${maxUv.toFixed(1)}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">DAYLIGHT HOURS</div>
            <div class="stat-val bright">${daylight} hrs</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">RISK LEVEL</div>
            <div class="stat-val bright">${risk}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">PROTECTION</div>
            <div class="stat-val bright">${maxUv > 5 ? "Hat & Sunscreen" : maxUv > 2 ? "Sunglasses" : "No Protection Req."}</div>
          </div>
        </div>
      `;
    }

    if (graphType === "rain") {
      let totalRain = 0, peakHourly = 0, maxProb = 0;
      hourly.forEach(h => {
        const r = h.precip_accum || 0;
        totalRain += r;
        if (r > peakHourly) peakHourly = r;
        if ((h.precip_probability || 0) > maxProb) maxProb = h.precip_probability;
      });

      const rainMult = isImperial ? 0.0393701 : 1.0;
      const rainUnit = isImperial ? "in" : "mm";
      const totalRainVal = isImperial ? (totalRain * rainMult).toFixed(2) : totalRain.toFixed(1);
      const peakRainVal = isImperial ? (peakHourly * rainMult).toFixed(2) : peakHourly.toFixed(1);
      const activeRain = isImperial ? ((activeHour.precip_accum || 0) * rainMult).toFixed(2) : (activeHour.precip_accum || 0).toFixed(1);
      const activeProb = activeHour.precip_probability || 0;

      const maxBarRain = Math.max(0.1, peakHourly * rainMult * 1.3);
      let rainBars = "";
      hourly.forEach((h, i) => {
        const x = (i / (count - 1)) * 760 + 20 - 8;
        const val = (h.precip_accum || 0) * rainMult;
        const barH = Math.max(val > 0 ? 4 : 0, (val / maxBarRain) * 140);
        const y = 185 - barH;
        rainBars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="16" height="${barH.toFixed(1)}" rx="3" fill="#818cf8" opacity="${i === activeIdx ? '0.95' : '0.55'}"/>`;
      });

      const probPts = hourly.map((h, i) => {
        const prob = h.precip_probability || 0;
        const x = (i / (count - 1)) * 760 + 20;
        const y = 180 - (prob / 100) * 150;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      const cursorX = ((activeIdx / (count - 1)) * 760 + 20).toFixed(1);

      return `
        <div class="graph-card-header">
          <div class="graph-card-title-box">
            <div class="graph-card-title text-indigo">
              <svg class="graph-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" stroke="currentColor"/><line x1="8" y1="18" x2="7" y2="21" stroke="currentColor"/><line x1="12" y1="18" x2="11" y2="21" stroke="currentColor"/><line x1="16" y1="18" x2="15" y2="21" stroke="currentColor"/></svg>
              <span>Precipitation Intensity & Probability</span>
            </div>
            <div class="graph-card-sub dimmed xsmall">24-hour rain accumulation and hourly chance of precipitation</div>
          </div>
          <div class="scrubber-badge">
            <span class="scrubber-time dimmed">${activeHour.hour_label || "Now"}</span>
            <span class="scrubber-sep">|</span>
            <span class="scrubber-val text-indigo">${activeProb}% Rain</span>
            <span class="scrubber-secondary dimmed">${activeRain} ${rainUnit}</span>
            <span class="scrubber-cond">${condIcon} <span>${activeHour.conditions || ""}</span></span>
          </div>
        </div>

        <div class="svg-graph-wrapper">
          <div class="svg-grid-lines">
            <div class="grid-line"><span>100% Probability / Peak: ${peakRainVal} ${rainUnit}</span></div>
            <div class="grid-line"><span>50% Chance of Rain</span></div>
            <div class="grid-line"><span>0% Precip</span></div>
          </div>
          <svg class="telemetry-svg" viewBox="0 0 800 200" preserveAspectRatio="none">
            ${rainBars}
            <path d="M ${probPts.join(' L ')}" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3 3"/>
            <line x1="${cursorX}" y1="10" x2="${cursorX}" y2="185" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6"/>
          </svg>
          <div class="svg-touch-overlay">${touchZones}</div>
        </div>

        <div class="timeline-labels-row">${timelineLabels}</div>

        <div class="graph-stats-grid">
          <div class="stat-tile">
            <div class="stat-name dimmed">24H TOTAL RAIN</div>
            <div class="stat-val text-indigo">${totalRainVal} ${rainUnit}</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">PEAK HOURLY</div>
            <div class="stat-val bright">${peakRainVal} ${rainUnit}/h</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">MAX CHANCE</div>
            <div class="stat-val bright">${maxProb}%</div>
          </div>
          <div class="stat-tile">
            <div class="stat-name dimmed">RAIN STATUS</div>
            <div class="stat-val bright">${totalRain > 0 ? "Precipitation Expected" : "No Rain Predicted"}</div>
          </div>
        </div>
      `;
    }

    return "";
  }
});
