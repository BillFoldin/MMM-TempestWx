# MMM-TempestWx

A minimalist, high-contrast [MagicMirror²](https://magicmirror.builders/) module for **Tempest Weather Stations** by WeatherFlow.

Designed specifically for two-way mirror glass aesthetics: deep jet black canvas, high contrast crisp white typography, and modern minimalist vector icons. Built using **native built-in Node.js functionality** (`https` and `fetch`) for API calls, requiring **ZERO external npm dependencies**.

Includes full **touchscreen support**: tap the module on any touch-enabled mirror or Raspberry Pi display to pull up a full 7-day forecast and 24-hour hourly wind vector trends modal!

---

## Features

- 🌡️ **Real-Time Core Metrics**: High-precision temperature, relative humidity, and barometric pressure.
- ⚡ **Zero Dependencies**: Pure built-in Node.js `https` API calls; no third-party HTTP libraries or bloated node modules required.
- 📐 **Minimalist MagicMirror² Aesthetic**: Native Roboto typography, tabular figures, and calibrated SVG glyphs.
- 📊 **Touchscreen Interactive Modal**:
  - Full **7-Day Hyper-Local Forecast** with thermal min/max ranges and precipitation probability.
  - **Hourly Wind Trends & Vectors**: 24-hour wind velocity curves, peak gusts, and rotational compass vectors.
  - **Station Telemetry**: Solar radiation (W/m²), UV Index, lightning detection, and supercapacitor battery health.
  - Configurable auto-dismiss countdown timer for smart mirror hands-free operation.

---

## Installation

1. Navigate to your MagicMirror `modules` folder:
```bash
cd ~/MagicMirror/modules
```

2. Clone this repository:
```bash
git clone https://github.com/tempestwx/MMM-TempestWx.git
```

3. No `npm install` is required! The module runs directly on standard Node.js.

---

## Configuration

Add the module to your `config/config.js` file:

```javascript
{
  module: "MMM-TempestWx",
  position: "top_right",
  config: {
    stationId: "YOUR_STATION_ID",
    token: "YOUR_TEMPEST_TOKEN",
    units: "imperial",            // "imperial" or "metric"
    pressureUnit: "inHg",        // "inHg", "hPa", or "mb"
    updateInterval: 60 * 1000,      // Poll interval in milliseconds (60 seconds)
    showModalOnTouch: true,         // Enable tap to open detailed modal
    autoCloseModalSeconds: 30,      // Auto close modal after 30s
    showFeelsLike: true,            // Show feels like temp
    showDewPoint: true,             // Show dew point
    showTrendArrows: true,          // Show pressure rising/falling indicator
    animationSpeed: 0               // 0 = Instant in-place updates with zero screen flash/blink (recommended for Raspberry Pi)
  }
}
```

### Obtaining Your Tempest Station ID & Token

1. Log into your Tempest account at [tempestwx.com](https://tempestwx.com/).
2. Open **Settings > Stations** and select your station to find your **Station ID** in the URL or station info.
3. Open **Settings > Data Authorizations** and click **Create Token** to generate your Personal Access Token.

---

## Troubleshooting: "No modules/MMM-TempestWx/MMM-TempestWx.js found"

If MagicMirror displays the error:
```text
No MagicMirrormodulesMMM-TempestWx/MMM-TempestWx.js found for module: MMM-TempestWx.
```

This means MagicMirror cannot find the main file at that exact path. Check these 3 common causes:

### 1. Nested Folder After Unzipping (Most Common)
If you extracted `MMM-TempestWx.zip` inside a folder you already named `MMM-TempestWx`, the files may be nested two levels deep:
- ❌ **Incorrect:** `MagicMirror/modules/MMM-TempestWx/MMM-TempestWx/MMM-TempestWx.js`
- ✅ **Correct:** `MagicMirror/modules/MMM-TempestWx/MMM-TempestWx.js`

**Fix on Linux / Raspberry Pi:**
```bash
cd ~/MagicMirror/modules
# If you see a nested folder:
mv MMM-TempestWx/MMM-TempestWx/* MMM-TempestWx/
rmdir MMM-TempestWx/MMM-TempestWx
```

**Fix on Windows (PowerShell):**
```powershell
cd MagicMirrormodules
# Move nested files up one level if needed:
Move-Item .MMM-TempestWxMMM-TempestWx* .MMM-TempestWx```

### 2. Case Sensitivity & Exact Naming
MagicMirror requires the folder and filename to match **character-for-character** (case-sensitive):
- Folder name: **`MMM-TempestWx`** (capital `MMM`, capital `T`, capital `W`, lowercase `x`)
- Main script: **`MMM-TempestWx.js`**

### 3. Hidden File Extension on Windows
If you created or saved the file manually in Windows Notepad, Windows may have named it:
- ❌ `MMM-TempestWx.js.txt` or `MMM-TempestWx.js.js`
- In File Explorer, check **View > File name extensions** and verify it is named `MMM-TempestWx.js`.

### Verifying the Folder Structure
Run `ls -la ~/MagicMirror/modules/MMM-TempestWx` (or `dir MagicMirrormodulesMMM-TempestWx` on Windows):
```text
MagicMirror/
└── modules/
    └── MMM-TempestWx/
        ├── MMM-TempestWx.js   <-- MUST be directly in this folder
        ├── node_helper.js
        ├── MMM-TempestWx.css
        ├── package.json
        └── README.md
```

---

## Troubleshooting: "require is not defined in ES module scope"

If you see:
```text
Error when loading MMM-TempestWx: require is not defined in ES module scope, you can use import instead
package.json contains "type": "module"
```

MagicMirror modules use standard CommonJS (`require` and `module.exports`). This error means your `MMM-TempestWx/package.json` file accidentally contains `"type": "module"`.

### Solution:
1. Open `modules/MMM-TempestWx/package.json` and either:
   - **Delete the line** `"type": "module",` OR
   - **Change it to** `"type": "commonjs",`
2. *Alternatively:* Because this module has zero dependencies and uses native Node.js APIs, you can simply **delete `package.json`** from the `MMM-TempestWx` folder entirely!

---

## License

MIT License. Crafted for MagicMirror² and weather enthusiasts.
