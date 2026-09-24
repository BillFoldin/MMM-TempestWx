import React, { useState } from 'react';
import { ModuleConfig, Units, PressureUnit, MirrorPosition, WeatherProvider } from '../types/tempest.ts';
import { STATION_PRESETS } from '../utils/mockStations.ts';

interface StationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ModuleConfig;
  onSaveConfig: (newConfig: ModuleConfig) => void;
  onSelectPreset: (presetId: string) => void;
  activePresetId: string | null;
}

export const StationConfigModal: React.FC<StationConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onSelectPreset,
  activePresetId,
}) => {
  const [stationId, setStationId] = useState(config.stationId);
  const [token, setToken] = useState(config.token);
  const [weatherProvider, setWeatherProvider] = useState<WeatherProvider>(config.weatherProvider || 'tempest');
  const [latitude, setLatitude] = useState<string>(config.latitude !== undefined && config.latitude !== null ? String(config.latitude) : '');
  const [longitude, setLongitude] = useState<string>(config.longitude !== undefined && config.longitude !== null ? String(config.longitude) : '');
  const [units, setUnits] = useState<Units>(config.units);
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>(config.pressureUnit);
  const [showModalOnTouch, setShowModalOnTouch] = useState(config.showModalOnTouch);
  const [autoCloseModalSeconds, setAutoCloseModalSeconds] = useState(config.autoCloseModalSeconds);
  const [showFeelsLike, setShowFeelsLike] = useState(config.showFeelsLike);
  const [showDewPoint, setShowDewPoint] = useState(config.showDewPoint);
  const [mirrorPosition, setMirrorPosition] = useState<MirrorPosition>(config.mirrorPosition);
  const [theme, setTheme] = useState<'native-mirror' | 'ambient-glass'>(config.theme);

  if (!isOpen) return null;

  const handleSave = () => {
    const latNum = latitude.trim() !== '' ? parseFloat(latitude.trim()) : undefined;
    const lonNum = longitude.trim() !== '' ? parseFloat(longitude.trim()) : undefined;

    onSaveConfig({
      ...config,
      stationId,
      token,
      weatherProvider,
      latitude: latNum !== undefined && !isNaN(latNum) ? latNum : undefined,
      longitude: lonNum !== undefined && !isNaN(lonNum) ? lonNum : undefined,
      units,
      pressureUnit,
      showModalOnTouch,
      autoCloseModalSeconds,
      showFeelsLike,
      showDewPoint,
      mirrorPosition,
      theme,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-base font-semibold text-white">
              TempestWx Configuration
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Connect your Tempest station or calibrate display preferences
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="py-4 space-y-5">
          {/* Preset Station Selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-2">
              Sample Stations (No API Token Needed)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATION_PRESETS.map((p) => {
                const isSelected = activePresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSelectPreset(p.id);
                      setStationId(p.id);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-neutral-800 border-neutral-600 ring-1 ring-neutral-500'
                        : 'bg-neutral-900/40 hover:bg-neutral-900 border-neutral-800'
                    }`}
                  >
                    <div className="text-xs font-medium text-white truncate">{p.name}</div>
                    <div className="text-[11px] text-neutral-400 truncate">{p.location}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-neutral-800/80 pt-4">
            <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider mb-2">
              Live Tempest Station API Connection
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Tempest Station ID
                </label>
                <input
                  type="text"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  placeholder="e.g. 12345"
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-neutral-600"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  Tempest Personal Use Token (PAT)
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your token from tempestwx.com"
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-neutral-600"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Create a token in{' '}
                  <a
                    href="https://tempestwx.com/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline"
                  >
                    tempestwx.com &gt; Settings &gt; Data Authorizations
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Weather Provider Selection */}
          <div className="border-t border-neutral-800/80 pt-4 space-y-3">
            <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider">
              7-Day Forecast Data Source
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-900 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setWeatherProvider('tempest')}
                className={`py-2 px-3 text-left rounded-lg transition-all ${
                  weatherProvider === 'tempest'
                    ? 'bg-neutral-800 border border-neutral-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white border border-transparent'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>Tempest Forecast</span>
                  {weatherProvider === 'tempest' && <span className="text-[10px] text-sky-400 font-mono">ACTIVE</span>}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  WeatherFlow AI Better Forecast engine
                </div>
              </button>

              <button
                type="button"
                onClick={() => setWeatherProvider('NOAA')}
                className={`py-2 px-3 text-left rounded-lg transition-all ${
                  weatherProvider === 'NOAA'
                    ? 'bg-neutral-800 border border-neutral-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white border border-transparent'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>NOAA.gov Forecast</span>
                  {weatherProvider === 'NOAA' && <span className="text-[10px] text-sky-400 font-mono">ACTIVE</span>}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  US National Weather Service (api.weather.gov)
                </div>
              </button>
            </div>

            {weatherProvider === 'NOAA' && (
              <div className="p-3 bg-neutral-900/60 rounded-xl border border-neutral-800/80 space-y-2.5">
                <div className="text-[11px] text-neutral-300">
                  <span className="font-semibold text-sky-400">NOAA National Weather Service:</span> Observations continue streaming live from your Tempest station, while the 7-day extended forecast uses NOAA.gov.
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">
                      Custom Latitude (Optional)
                    </label>
                    <input
                      type="text"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="Auto from station (e.g. 40.7128)"
                      className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">
                      Custom Longitude (Optional)
                    </label>
                    <input
                      type="text"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="Auto from station (e.g. -74.0060)"
                      className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-neutral-500">
                  Leave latitude & longitude blank to automatically use your Tempest station's GPS coordinates.
                </p>
              </div>
            )}
          </div>

          {/* Unit & Display Preferences */}
          <div className="border-t border-neutral-800/80 pt-4 space-y-4">
            <label className="block text-xs font-medium text-neutral-300 uppercase tracking-wider">
              Display & Unit Settings
            </label>

            <div className="grid grid-cols-2 gap-4">
              {/* Unit System */}
              <div>
                <span className="block text-[11px] text-neutral-400 mb-1.5">Units</span>
                <div className="flex rounded-lg bg-neutral-900 p-1 border border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setUnits('imperial')}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                      units === 'imperial' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Imperial (°F, mph)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnits('metric')}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${
                      units === 'metric' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Metric (°C, km/h)
                  </button>
                </div>
              </div>

              {/* Pressure Units */}
              <div>
                <span className="block text-[11px] text-neutral-400 mb-1.5">Barometer Unit</span>
                <div className="flex rounded-lg bg-neutral-900 p-1 border border-neutral-800">
                  {(['inHg', 'hPa', 'mb'] as PressureUnit[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPressureUnit(p)}
                      className={`flex-1 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                        pressureUnit === p ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Smart Mirror Position */}
            <div>
              <span className="block text-[11px] text-neutral-400 mb-1.5">
                Mirror Region Position
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {(['top_right', 'top_left', 'middle_center', 'bottom_left', 'bottom_right'] as MirrorPosition[]).map(
                  (pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setMirrorPosition(pos)}
                      className={`py-1.5 px-2 text-[11px] font-mono rounded-lg border transition-all ${
                        mirrorPosition === pos
                          ? 'bg-neutral-800 border-neutral-600 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {pos.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Touch Modal & Aux Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showModalOnTouch}
                  onChange={(e) => setShowModalOnTouch(e.target.checked)}
                  className="rounded bg-neutral-900 border-neutral-800 text-sky-500 focus:ring-0"
                />
                <span>Enable Touchscreen Modal</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFeelsLike}
                  onChange={(e) => setShowFeelsLike(e.target.checked)}
                  className="rounded bg-neutral-900 border-neutral-800 text-sky-500 focus:ring-0"
                />
                <span>Show "Feels Like" Temp</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDewPoint}
                  onChange={(e) => setShowDewPoint(e.target.checked)}
                  className="rounded bg-neutral-900 border-neutral-800 text-sky-500 focus:ring-0"
                />
                <span>Show Dew Point</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">Auto-close modal:</span>
                <select
                  value={autoCloseModalSeconds}
                  onChange={(e) => setAutoCloseModalSeconds(Number(e.target.value))}
                  className="bg-neutral-900 border border-neutral-800 text-xs rounded px-2 py-1 text-white"
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={120}>2 minutes</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-medium text-black bg-white rounded-lg hover:bg-neutral-200 transition-colors shadow-sm"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
