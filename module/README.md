# MMM-TempestWx

[![MagicMirror²](https://img.shields.io/badge/MagicMirror%C2%B2-Module-000000.svg?style=flat-square&logo=raspberry-pi)](https://magicmirror.builders/)
[![WeatherFlow Tempest](https://img.shields.io/badge/WeatherFlow-Tempest_API-38bdf8.svg?style=flat-square)](https://weatherflow.com/tempest-home-weather-system/)
[![Dependencies](https://img.shields.io/badge/Dependencies-Zero_External-emerald.svg?style=flat-square)](#zero-dependencies)
[![Touchscreen Ready](https://img.shields.io/badge/Touchscreen-Interactive_Modal-f59e0b.svg?style=flat-square)](#touchscreen-interactive-modal)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

A modern, high-contrast **[MagicMirror²](https://magicmirror.builders/)** module and companion web simulator for the **WeatherFlow Tempest Weather Station**.

Designed specifically for two-way mirror glass aesthetics: deep jet black canvas, high-contrast typography, front-and-center temperature display, and dynamic day/night vector weather glyphs. Engineered for smooth, **flash-free in-place DOM updates** on Raspberry Pi and includes an interactive **touchscreen forecast modal** with 24-hour telemetry graphs.

---

## Highlights

- 🌡️ **Front & Center Hero Temperature**: Clean, enlarged typography front and center with non-clipping condition icons for high-glanceability from across the room.
- ☀️ 🌙 **Day & Night Dynamic Icons**: Displays radiant Sun during the day and crescent Moon (with stars) at night, including day/night partly cloudy and rain variants.
- ⚡ **Zero Screen Flashing / Blinking**: Uses surgical in-place DOM updating (`updateCardInPlace`) so your smart mirror never flashes or blinks during background polling.
- 📦 **Zero External Dependencies**: Pure native Node.js `https` API calls inside the module. No third-party HTTP libraries or bloated node packages required.
- 📱 **Interactive Touchscreen Modal**:
  - **7-Day Extended Forecast**: Min/max temperature envelopes, condition glyphs, and precipitation probability.
  - **24-Hour Telemetry Graphs**: Scrub across 24 hours to inspect **Temperature**, **Relative Humidity**, **Wind Velocity & Compass Vectors**, **UV Index**, and **Rain Accumulation**.
  - **Auto-Closing Timer**: Built-in 30-second countdown (resets on interaction) designed for hands-free mirror operation.
- ⚡ **Severe Weather & Lightning Detection**: Color-coded proximity banner (Amber for nearby strikes, Pulsing Red for danger zones < 10 km / 6 mi).
- 🖥️ **Integrated Web Simulator**: Companion React + Vite development applet for previewing presets, testing custom CSS themes, and generating configuration code.

---

## Installation

### 1. Clone into MagicMirror Modules

Navigate to your MagicMirror `modules` directory on your Raspberry Pi or host system:

```bash
cd ~/MagicMirror/modules
git clone https://github.com/BillFoldin/MMM-TempestWx.git
```

> **Note:** Zero `npm install` is required for the MagicMirror module! The module runs directly on standard Node.js without third-party dependencies.

---

## Configuration

Add the module configuration block to your MagicMirror `config/config.js` file:

```javascript
{
  module: "MMM-TempestWx",
  position: "top_right",
  config: {
    stationId: "YOUR_STATION_ID",
    token: "YOUR_TEMPEST_TOKEN",
    weatherProvider: "tempest", // "tempest" or "NOAA"
    units: "imperial",            // "imperial" or "metric"
    pressureUnit: "inHg",        // "inHg", "hPa", or "mb"
    updateInterval: 60 * 1000,      // Polling interval in ms (60 seconds)
    showModalOnTouch: true,         // Enable tap/click to open 7-day forecast modal
    autoCloseModalSeconds: 30,      // Auto close modal countdown in seconds
    showFeelsLike: true,            // Show feels-like temperature in subtitle
    showDewPoint: true,             // Show dew point in telemetry bar
    showTrendArrows: true,          // Show barometric pressure rising/falling arrow
    checkNoaaAlerts: true,          // Check NOAA.gov for special weather statements, watches, advisories & warnings
    suppressUpdateAlerts: true,     // Automatically dismisses module update alert popups
    broadcastSevereWeatherAlerts: true, // Keeps severe lightning and weather alert popups active
    animationSpeed: 0               // 0 = Instant in-place DOM updates (prevents screen flashing)
  }
}
```

### Configuration Options Reference

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `stationId` | `string` | `number` | *Required* | Your WeatherFlow Tempest Station ID |
| `token` | `string` | `number` | *Required* | Your Personal Use Access Token from Tempest |
| `weatherProvider` | `string` | `"tempest"` | 7-day forecast source: `"tempest"` (WeatherFlow Better Forecast) or `"NOAA"` (api.weather.gov NWS) |
| `checkNoaaAlerts` | `boolean` | `true` | Outlines module with color for NOAA statements/alerts and displays statement title in title bar |
| `latitude` | `number` | `null` | Optional GPS latitude override for NOAA (auto-detected from station if omitted) |
| `longitude` | `number` | `null` | Optional GPS longitude override for NOAA (auto-detected from station if omitted) |
| `suppressUpdateAlerts` | `boolean` | `true` | Automatically intercepts and dismisses module update alert popups on the mirror |
| `broadcastSevereWeatherAlerts` | `boolean` | `true` | Broadcasts high-priority alerts to MagicMirror's `alert` module for severe lightning and storms |
| `units` | `string` | `"imperial"` | `"imperial"` (°F, mph, in) or `"metric"` (°C, km/h, mm) |
| `pressureUnit` | `string` | `"inHg"` | Barometric pressure display unit: `"inHg"`, `"hPa"`, or `"mb"` |
| `updateInterval` | `number` | `60000` | Frequency to fetch new observations in milliseconds (default: 60s) |
| `showModalOnTouch`| `boolean` | `true` | Enables tap/click to open 7-day forecast & 24h graphs |
| `autoCloseModalSeconds` | `number` | `30` | Time in seconds before touch modal automatically closes |
| `showFeelsLike` | `boolean` | `true` | Displays thermal "Feels Like" index under temperature |
| `showDewPoint` | `boolean` | `true` | Displays calculated dew point in telemetry metrics |
| `showTrendArrows` | `boolean` | `true` | Displays rising (↗), steady (→), or falling (↘) barometric trend |
| `animationSpeed` | `number` | `0` | Milliseconds for module refresh. Set to `0` to prevent screen flashing |

---

## NOAA Special Weather Statements & Alerts (Color Outlines)

When `checkNoaaAlerts: true` is enabled (default), `MMM-TempestWx` checks the US National Weather Service (`api.weather.gov/alerts/active`) for your station's latitude/longitude:

- 🟡 **Watches & Special Weather Statements**: Yellow module outline with ambient yellow glow.
- 🟠 **Advisories**: Orange module outline with ambient orange glow.
- 🔴 **Warnings**: Red module outline with ambient red glow.
- 🏷️ **Title Bar Statement Badge**: The exact title/event of the active statement or warning is displayed directly in the top title bar of the module next to your weather station name with a pulsing indicator.
- 📱 **Interactive Modal**: Tapping the module opens the detailed modal displaying the full NOAA statement headline, safety instructions, and description.

---

---

## Disabling Module Update Alerts While Keeping Severe Weather Alerts

If you want to remove the annoying **"Update Available"** alert banners for installed modules while keeping all **Severe Weather & Lightning Alerts** fully operational on your mirror:

### 1. In your MagicMirror `config/config.js`:

Keep the default `alert` module active (so weather warnings pop up), and disable or silence `updatenotification`:

```javascript
// Keep 'alert' so severe weather, lightning warnings, and timers work:
{
  module: "alert",
},

// Disable 'updatenotification' to stop module update alert banners:
{
  module: "updatenotification",
  disabled: true // Turns off module update alert banners entirely
},
```

Alternatively, if you still want to check core MagicMirror updates but ignore `MMM-TempestWx`:

```javascript
{
  module: "updatenotification",
  position: "top_bar",
  config: {
    sendUpdatesNotifications: false, // Prevents popup alerts
    ignoreModules: ["MMM-TempestWx"] // Ignores MMM-TempestWx checks
  }
},
```

### 2. Built-in Auto-Suppression:

`MMM-TempestWx` comes preconfigured with `suppressUpdateAlerts: true`. If an update notification popup is broadcast by any module, `MMM-TempestWx` automatically dismisses it while keeping severe weather alerts (lightning strikes within 10 km / 6 mi, storm warnings) active.

---

## 7-Day Extended Forecast Providers (`tempest` vs `NOAA`)

You can select your preferred data source for the 7-day extended forecast using the `weatherProvider` setting:

- **`weatherProvider: "tempest"`** *(default)*: Uses WeatherFlow's proprietary machine-learning Better Forecast engine tailored to your hyper-local station microclimate.
- **`weatherProvider: "NOAA"`**: Fetches official 7-day forecast periods directly from the **US National Weather Service** (api.weather.gov) based on your station's GPS coordinates. Current observation metrics (live temperature, wind speed/direction, barometer, rain, lightning strikes, solar/UV) continue streaming live from your Tempest station. If NOAA experiences transient outages or the station is outside the US, the module gracefully falls back to Tempest data.

---

## Obtaining Your Tempest Station ID & Token

1. Sign in to your Tempest account at [tempestwx.com](https://tempestwx.com/).
2. Go to **Settings > Stations** and select your station. Your numeric **Station ID** will be visible in the page address or station details.
3. Go to **Settings > Data Authorizations** and select **Create Token** to generate a Personal Access Token.

---

## Touchscreen Interactive Modal

When `showModalOnTouch: true` is configured, tapping the module anywhere opens a responsive overlay:

1. **7-Day Extended Forecast Cards**:
   - High and low temperature indicators with calibrated thermal ranges.
   - Sky conditions icon (Sun/Moon/Clouds/Rain/Snow).
   - Precipitation probability percentage.
2. **24-Hour Telemetry Graphs with Interactive Scrubber**:
   - **Temperature**: Continuous diurnal curve with ambient temperature and real-feel index.
   - **Relative Humidity**: Saturation line with human comfort zone bounds (35% - 60%).
   - **Wind Speed & Direction**: Wind average line, peak gust peaks, and rotational compass arrow vector glyphs.
   - **UV Index**: Daily solar ultraviolet curve with danger classification.
   - **Rain Accumulation**: Hourly rain accumulation bars and probability envelope.

---

## Preventing Screen Flashes on Raspberry Pi

Older MagicMirror weather modules trigger a noticeable screen blink or fade every time they poll for updates. **MMM-TempestWx** prevents this:

1. Set `animationSpeed: 0` in `config.js`.
2. The module automatically activates `updateCardInPlace()`, surgically updating only the changed text values and SVG glyphs in the live DOM. The outer module container remains static, preserving a seamless smart mirror display.

---

## Troubleshooting

### Error: "No modules/MMM-TempestWx/MMM-TempestWx.js found"

MagicMirror requires the directory name and JavaScript filename to match exactly:
- Directory: `MagicMirror/modules/MMM-TempestWx`
- File: `MagicMirror/modules/MMM-TempestWx/MMM-TempestWx.js`

If you extracted a zip archive, ensure the files are not nested two levels deep (e.g., `MMM-TempestWx/MMM-TempestWx/MMM-TempestWx.js`). Move the files up one level if necessary:

```bash
cd ~/MagicMirror/modules
mv MMM-TempestWx/MMM-TempestWx/* MMM-TempestWx/
rmdir MMM-TempestWx/MMM-TempestWx
```

### Zero Dependencies & No package.json Conflicts

MagicMirror modules run as standard CommonJS modules. This module uses pure Node.js built-in APIs (`https`) and has **zero third-party npm dependencies**. No `package.json` file is needed or included in the module directory, preventing any ESM/CommonJS conflicts (`"require is not defined in ES module scope"`).

---

## File Structure

```text
MMM-TempestWx/
├── MMM-TempestWx.js        # MagicMirror front-end module definition & in-place DOM updates
├── node_helper.js          # Built-in Node.js https proxy for Tempest REST API
├── MMM-TempestWx.css       # Two-way mirror high-contrast styling & modal layouts
├── README.md               # Documentation & setup guide
├── src/                    # Web simulator & React development workspace
│   ├── components/         # React simulator components & SVG icon library
│   ├── utils/              # Weather calculations & API mappers
│   └── types/              # TypeScript interfaces
└── scripts/
    └── sync-module-files.ts # Auto-synchronizes standalone module files from source
```

---

## Local Development & Simulator

To preview the module in your browser without a Raspberry Pi:

```bash
# Install development dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the interactive MagicMirror simulator, switch between sample weather stations (including night observation presets), test units, and customize styling.

---

## License

This project is licensed under the **MIT License**. Crafted with precision for the [MagicMirror²](https://magicmirror.builders/) community and Tempest weather enthusiasts.
