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
git clone https://github.com/tempestwx/MMM-TempestWx.git
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
    units: "imperial",            // "imperial" or "metric"
    pressureUnit: "inHg",        // "inHg", "hPa", or "mb"
    updateInterval: 60 * 1000,      // Polling interval in ms (60 seconds)
    showModalOnTouch: true,         // Enable tap/click to open 7-day forecast modal
    autoCloseModalSeconds: 30,      // Auto close modal countdown in seconds
    showFeelsLike: true,            // Show feels-like temperature in subtitle
    showDewPoint: true,             // Show dew point in telemetry bar
    showTrendArrows: true,          // Show barometric pressure rising/falling arrow
    animationSpeed: 0               // 0 = Instant in-place DOM updates (prevents screen flashing)
  }
}
```

### Configuration Options Reference

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `stationId` | `string` | `number` | *Required* | Your WeatherFlow Tempest Station ID |
| `token` | `string` | *Required* | Your Personal Use Access Token from Tempest |
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
