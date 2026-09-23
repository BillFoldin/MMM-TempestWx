import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TempestStationData,
  ModuleConfig,
} from './types/tempest.ts';
import {
  STATION_PRESETS,
  getPresetStationData,
} from './utils/mockStations.ts';
import { fetchLiveTempestData } from './utils/tempestApi.ts';
import { MagicMirrorSim } from './components/MagicMirrorSim.tsx';
import { WeatherModal } from './components/WeatherModal.tsx';
import { ModuleCodeViewer } from './components/ModuleCodeViewer.tsx';
import { StationConfigModal } from './components/StationConfigModal.tsx';
import { formatTemp } from './utils/tempestFormat.ts';

export default function App() {
  // Navigation tabs: 'simulator' | 'code'
  const [activeView, setActiveView] = useState<'simulator' | 'code'>('simulator');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Active Station preset or custom
  const [activePresetId, setActivePresetId] = useState<string>('tempest-summit-01');

  // Module configuration
  const [config, setConfig] = useState<ModuleConfig>({
    stationId: 'tempest-summit-01',
    token: '',
    units: 'imperial',
    pressureUnit: 'inHg',
    updateIntervalSeconds: 60,
    showModalOnTouch: true,
    autoCloseModalSeconds: 30,
    showFeelsLike: true,
    showDewPoint: true,
    showTrendArrows: true,
    compactMode: false,
    mirrorPosition: 'top_right',
    theme: 'native-mirror',
  });

  // Current Station data
  const [stationData, setStationData] = useState<TempestStationData>(() => {
    const preset = STATION_PRESETS[0];
    return getPresetStationData(preset);
  });

  // Fetch or refresh station data
  const loadStationData = useCallback(async (cfg: ModuleConfig, presetId: string | null) => {
    setIsLoading(true);
    setStatusNotice(null);

    try {
      if (cfg.token && cfg.stationId && !cfg.stationId.startsWith('tempest-')) {
        // Live WeatherFlow API via Node.js backend
        const liveData = await fetchLiveTempestData(cfg.stationId, cfg.token);
        setStationData(liveData);
        setStatusNotice(`Connected to live Tempest Station #${cfg.stationId}`);
      } else {
        // Preset simulation
        const targetPreset =
          STATION_PRESETS.find((p) => p.id === (presetId || cfg.stationId)) || STATION_PRESETS[0];
        const simulated = getPresetStationData(targetPreset);
        setStationData(simulated);
      }
    } catch (err: any) {
      console.error('Error fetching Tempest data:', err);
      setStatusNotice(`Live fetch error: ${err.message}. Showing calibrated fallback.`);
      // Fallback to preset
      const targetPreset =
        STATION_PRESETS.find((p) => p.id === presetId) || STATION_PRESETS[0];
      setStationData(getPresetStationData(targetPreset));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadStationData(config, activePresetId);
  }, []);

  // Micro-fluctuation simulation timer (drifts wind & pressure slightly for realistic live feel)
  const driftRef = useRef<number>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      driftRef.current += 0.2;
      setStationData((prev) => {
        if (!prev) return prev;
        const obs = prev.observation;
        const windDrift = Math.sin(driftRef.current) * 0.4;
        const gustDrift = Math.cos(driftRef.current * 0.8) * 0.7;
        const dirDrift = Math.round(Math.sin(driftRef.current * 0.3) * 6);

        return {
          ...prev,
          last_updated: Date.now(),
          observation: {
            ...obs,
            wind_avg: Math.max(0.5, Number((obs.wind_avg + windDrift * 0.1).toFixed(1))),
            wind_gust: Math.max(obs.wind_avg, Number((obs.wind_gust + gustDrift * 0.1).toFixed(1))),
            wind_direction: (obs.wind_direction + dirDrift + 360) % 360,
          },
        };
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectPreset = (presetId: string) => {
    setActivePresetId(presetId);
    const newConfig = { ...config, stationId: presetId, token: '' };
    setConfig(newConfig);
    loadStationData(newConfig, presetId);
  };

  const handleSaveConfig = (newConfig: ModuleConfig) => {
    setConfig(newConfig);
    loadStationData(newConfig, newConfig.stationId.startsWith('tempest-') ? newConfig.stationId : null);
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-neutral-800">
      {/* Universal Top Bar Contract: 3 zones */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-neutral-800/80 bg-neutral-950 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a href="/" className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white">
          <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          <span>TempestWx</span>
          <span className="text-xs font-normal text-neutral-400 font-mono hidden sm:inline">
            MagicMirror²
          </span>
        </a>

        {/* Zone 2: Navigation links / segmented controls */}
        <nav className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800/80 rounded-lg">
          <button
            onClick={() => setActiveView('simulator')}
            className={`px-3 sm:px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeView === 'simulator'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Live Mirror Simulator
          </button>
          <button
            onClick={() => setActiveView('code')}
            className={`px-3 sm:px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeView === 'code'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Module Code & Helper
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2">
          {/* Unit quick toggle */}
          <button
            onClick={() => {
              const next = config.units === 'imperial' ? 'metric' : 'imperial';
              const nextP = next === 'imperial' ? 'inHg' : 'hPa';
              setConfig({ ...config, units: next, pressureUnit: nextP });
            }}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono text-neutral-300 transition-colors whitespace-nowrap"
            title="Toggle between Imperial and Metric units"
          >
            {config.units === 'imperial' ? '°F · mph' : '°C · km/h'}
          </button>

          {/* Trigger Touchscreen Modal */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors whitespace-nowrap"
            title="Simulate touch tap to open the 7-day forecast & wind modal"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>Touch Modal</span>
          </button>

          {/* Configuration Settings */}
          <button
            onClick={() => setIsConfigOpen(true)}
            className="p-2 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors shadow-sm"
            title="Configure Tempest Station ID, Token, and Preferences"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Status or notification toast if needed */}
        {statusNotice && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
            <span>{statusNotice}</span>
            <button
              onClick={() => setStatusNotice(null)}
              className="text-neutral-500 hover:text-white ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* VIEW 1: MagicMirror Simulator View */}
        {activeView === 'simulator' && (
          <div className="space-y-6">
            {/* Quick Station Presets Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-950 border border-neutral-800/80 rounded-xl">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium whitespace-nowrap mr-1">
                  Preset Weather:
                </span>
                {STATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activePresetId === preset.id
                        ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900 border border-transparent'
                    }`}
                  >
                    <span>{preset.name.split(' ')[0]}</span>
                    {preset.lightningCount && preset.lightningCount > 0 ? (
                      <span className="text-amber-400 text-[11px]" title="Lightning detected nearby">⚡</span>
                    ) : preset.uv >= 8 ? (
                      <span className="text-rose-400 text-[11px]" title="Very High UV index">☀️</span>
                    ) : null}
                    <span className="text-neutral-400 ml-0.5 font-mono">
                      {formatTemp(preset.tempC, config.units)}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsConfigOpen(true)}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium transition-colors whitespace-nowrap ml-auto"
              >
                + Connect My Tempest Station
              </button>
            </div>

            {/* Smart Mirror Interactive Display */}
            <MagicMirrorSim
              stationData={stationData}
              config={config}
              onOpenModal={() => setIsModalOpen(true)}
              onRefresh={() => loadStationData(config, activePresetId)}
              isLoading={isLoading}
            />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-xs font-medium text-white mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Built-in Node.js API Architecture</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  The <code className="text-neutral-300">node_helper.js</code> makes API calls using Node's standard <code className="text-neutral-300">https</code> module and global <code className="text-neutral-300">fetch</code>. Zero external npm dependencies required on your Raspberry Pi.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-xs font-medium text-white mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  <span>Modern Minimalist Visuals</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Engineered with calibrated geometric SVG icons for temperature, relative humidity, and barometric pressure. True-black contrast prevents backlit glow on two-way glass.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80">
                <div className="flex items-center gap-2 text-xs font-medium text-white mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Touchscreen Forecast & Trends</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Tapping the module summons a rich modal with 7-day forecast cards, 24-hour directional wind vectors, and ultrasonic telemetry, complete with a hands-free auto-dismiss timer.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Complete Module Source Code & Exporter */}
        {activeView === 'code' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/40 p-4 rounded-xl border border-neutral-800">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  MagicMirror² Module Code: MMM-TempestWx
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Ready to drop into <code className="text-neutral-300">~/MagicMirror/modules/MMM-TempestWx/</code> on your Raspberry Pi
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsConfigOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition-colors"
                >
                  Configure My Station ID
                </button>
              </div>
            </div>

            <ModuleCodeViewer config={config} />
          </div>
        )}
      </main>

      {/* Touchscreen Detailed Weather Modal */}
      <WeatherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        observation={stationData.observation}
        forecastDaily={stationData.forecast_daily}
        forecastHourly={stationData.forecast_hourly}
        config={config}
      />

      {/* Station & Display Config Modal */}
      <StationConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
      />

      {/* Minimalist Footer */}
      <footer className="border-t border-neutral-900 px-6 py-4 mt-auto text-center text-xs text-neutral-400 font-sans">
        <p>TempestWx · Open Source MagicMirror² Module for Tempest Weather Stations</p>
      </footer>
    </div>
  );
}
