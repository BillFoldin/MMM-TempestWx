import React, { useState, useEffect } from 'react';
import { TempestStationData, ModuleConfig } from '../types/tempest.ts';
import { TempestWxModule } from './TempestWxModule.tsx';
import {
  getUvCategory,
  getLightningThreat,
  formatLightningDistance,
} from '../utils/tempestFormat.ts';
import {
  ModernSunUvIcon,
  ModernLightningBoltIcon,
} from './WeatherIcons.tsx';

interface MagicMirrorSimProps {
  stationData: TempestStationData;
  config: ModuleConfig;
  onOpenModal: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const MagicMirrorSim: React.FC<MagicMirrorSimProps> = ({
  stationData,
  config,
  onOpenModal,
  onRefresh,
  isLoading,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showMirrorReflection, setShowMirrorReflection] = useState<boolean>(false);
  const [showDefaultMmModules, setShowDefaultMmModules] = useState<boolean>(true);

  // Live MM2 Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: config.units === 'imperial',
  });
  const secondsString = currentTime.getSeconds().toString().padStart(2, '0');
  const dateString = currentTime.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const uvCat = getUvCategory(stationData.observation.uv);
  const lightningThreat = getLightningThreat(
    stationData.observation.lightning_strike_count,
    stationData.observation.lightning_strike_last_distance,
    config.units
  );
  const lightningDistFormatted = formatLightningDistance(
    stationData.observation.lightning_strike_last_distance,
    config.units
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Simulator Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-neutral-900/60 border border-neutral-800 rounded-xl text-xs text-neutral-300">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                stationData.is_live ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'
              }`}
            />
            <span className="font-medium text-neutral-200">
              {stationData.is_live ? 'Live Tempest Stream' : 'Calibrated Tempest Preset'}
            </span>
          </div>
          <span className="text-neutral-700">·</span>
          <span className="text-neutral-400 font-mono text-[11px] truncate max-w-[180px]">
            {stationData.station_name}
          </span>

          {/* Real-time Observation Quick Chips */}
          <div className="hidden md:flex items-center gap-2">
            {/* UV Status Chip */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700/60 text-[11px] font-mono">
              <ModernSunUvIcon className={`w-3 h-3 ${uvCat.color}`} />
              <span className="text-neutral-300">UV {stationData.observation.uv.toFixed(1)}</span>
              <span className={`text-[10px] uppercase font-sans ${uvCat.color}`}>
                ({uvCat.label})
              </span>
            </span>

            {/* Lightning Status Chip */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-mono ${
                lightningThreat.isNearby
                  ? lightningThreat.level === 'danger'
                    ? 'bg-rose-950/50 border-rose-500/50 text-rose-300 animate-pulse'
                    : 'bg-amber-950/50 border-amber-500/50 text-amber-300'
                  : 'bg-neutral-800 border-neutral-700/60 text-neutral-400'
              }`}
            >
              <ModernLightningBoltIcon
                className={`w-3 h-3 ${
                  lightningThreat.isNearby ? 'text-amber-400' : 'text-neutral-500'
                }`}
              />
              <span>
                {lightningThreat.isNearby
                  ? `${lightningThreat.label}: ${lightningDistFormatted.value} ${lightningDistFormatted.unit}`
                  : 'Lightning: 0 Strikes'}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle companion MM modules */}
          <button
            onClick={() => setShowDefaultMmModules(!showDefaultMmModules)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              showDefaultMmModules
                ? 'bg-neutral-800 text-neutral-200'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-300'
            }`}
          >
            {showDefaultMmModules ? 'Clock & Compliment On' : 'Solo Module View'}
          </button>

          {/* Toggle Glass Reflection */}
          <button
            onClick={() => setShowMirrorReflection(!showMirrorReflection)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              showMirrorReflection
                ? 'bg-neutral-800 text-neutral-200'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-300'
            }`}
          >
            {showMirrorReflection ? 'Glass Glare: Active' : 'Glass Glare: Off'}
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors disabled:opacity-50"
            title="Refresh Tempest Station Data"
          >
            <svg
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] transition-colors"
            title="Toggle Smart Mirror Kiosk Fullscreen"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
            <span>{isFullscreen ? 'Exit Kiosk' : 'Kiosk Mode'}</span>
          </button>
        </div>
      </div>

      {/* Actual MagicMirror² Display Surface */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl transition-all duration-300 ${
          isFullscreen ? 'fixed inset-0 z-40 rounded-none border-none' : 'min-h-[560px] sm:min-h-[620px]'
        } bg-black flex flex-col justify-between p-6 sm:p-8 select-none font-sans`}
      >
        {/* Optional Realistic Mirror Glass Sheen / Reflection */}
        {showMirrorReflection && (
          <div
            className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/[0.02] via-transparent to-white/[0.04] opacity-80"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at 85% 15%, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
            }}
          />
        )}

        {/* TOP ALERT REGION: Full-Width Lightning Warning Label when strikes detected */}
        {lightningThreat.isNearby && (
          <div
            className={`relative z-30 w-full mb-4 px-4 py-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xl backdrop-blur-md transition-all ${
              lightningThreat.level === 'danger'
                ? 'bg-rose-950/70 border-rose-500/60 text-rose-100 animate-pulse'
                : lightningThreat.level === 'caution'
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-100'
                : 'bg-yellow-950/40 border-yellow-500/40 text-yellow-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  lightningThreat.level === 'danger'
                    ? 'bg-rose-500/30 text-rose-300'
                    : 'bg-amber-500/30 text-amber-300'
                }`}
              >
                <ModernLightningBoltIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest font-sans">
                    {lightningThreat.label}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider uppercase ${
                      lightningThreat.level === 'danger'
                        ? 'bg-rose-500/30 text-rose-200'
                        : 'bg-amber-500/30 text-amber-200'
                    }`}
                  >
                    Immediate Alert
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 font-sans mt-0.5">
                  {lightningThreat.sublabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center font-mono text-xs">
              <span className="px-2.5 py-1 rounded bg-black/50 border border-white/10 text-white font-medium">
                {lightningDistFormatted.value} {lightningDistFormatted.unit} away
              </span>
              <span className="px-2.5 py-1 rounded bg-black/50 border border-white/10 text-neutral-300">
                {stationData.observation.lightning_strike_count} strikes
              </span>
            </div>
          </div>
        )}

        {/* TOP REGION: Top Left (Clock, Date, UV Index) & Top Right (TempestWx Module) */}
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-6">
          {/* Top Left: Native MagicMirror Clock, Date & Minimalist UV Indicator */}
          {showDefaultMmModules ? (
            <div className="flex flex-col text-white">
              <div className="flex items-baseline font-light tracking-tight">
                <span className="text-4xl sm:text-5xl font-light tabular-nums font-sans">
                  {timeString}
                </span>
                <span className="text-lg sm:text-xl text-neutral-400 font-light ml-1 tabular-nums">
                  {secondsString}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-light text-neutral-400 mt-1 uppercase tracking-wider font-sans">
                {dateString}
              </div>

              {/* Minimalist Mirror UV Index Status */}
              <div className="mt-3 pt-2.5 border-t border-neutral-900 flex items-center gap-2 text-xs font-sans">
                <ModernSunUvIcon className={`w-3.5 h-3.5 ${uvCat.color}`} />
                <span className="text-neutral-400 font-light">UV Index:</span>
                <span className="text-white font-mono font-medium">
                  {stationData.observation.uv.toFixed(1)}
                </span>
                <span
                  className={`text-[9px] uppercase font-sans font-medium px-1.5 py-0.5 rounded border border-neutral-800/80 ${uvCat.color} bg-neutral-900/60`}
                >
                  {uvCat.label}
                </span>
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Top Right: TempestWx Module (Position configurable) */}
          {(config.mirrorPosition === 'top_right' || !showDefaultMmModules) && (
            <div className="w-full sm:w-auto sm:max-w-md">
              <TempestWxModule
                observation={stationData.observation}
                config={config}
                onOpenModal={onOpenModal}
              />
            </div>
          )}
        </div>

        {/* MIDDLE REGION: If position set to middle_center */}
        {config.mirrorPosition === 'middle_center' && (
          <div className="relative z-10 flex justify-center items-center my-auto">
            <div className="w-full max-w-lg">
              <TempestWxModule
                observation={stationData.observation}
                config={config}
                onOpenModal={onOpenModal}
              />
            </div>
          </div>
        )}

        {/* BOTTOM REGION: Bottom Left & Bottom Center Compliment / Weather Advisory */}
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-end gap-6 mt-12">
          {/* Bottom Left: If TempestWx positioned here */}
          {config.mirrorPosition === 'bottom_left' && (
            <div className="w-full sm:w-auto sm:max-w-md">
              <TempestWxModule
                observation={stationData.observation}
                config={config}
                onOpenModal={onOpenModal}
              />
            </div>
          )}

          {/* Center Mirror Compliment & Adaptive Tempest Weather Advisory */}
          {showDefaultMmModules && (
            <div className="w-full text-center py-2">
              <p className="text-xs sm:text-sm font-light text-neutral-400 tracking-widest font-sans uppercase">
                {lightningThreat.isNearby
                  ? `⚡ Lightning warning · Strikes detected ${lightningDistFormatted.value} ${lightningDistFormatted.unit} away · Seek shelter indoors`
                  : stationData.observation.uv >= 6
                  ? `☀️ High UV Index (${stationData.observation.uv.toFixed(1)}) · ${uvCat.advice}`
                  : stationData.observation.precip_accum_local_day > 0
                  ? 'Rain in the forecast today · Bring an umbrella'
                  : stationData.observation.air_temperature > 24
                  ? 'Warm and clear skies ahead · Have a wonderful day'
                  : 'Looking sharp today'}
              </p>
            </div>
          )}

          {/* Bottom Right: If TempestWx positioned here */}
          {config.mirrorPosition === 'bottom_right' && (
            <div className="w-full sm:w-auto sm:max-w-md">
              <TempestWxModule
                observation={stationData.observation}
                config={config}
                onOpenModal={onOpenModal}
              />
            </div>
          )}
        </div>

        {/* Interactive Mirror Touch Hint in bottom corner */}
        <div className="absolute bottom-2.5 right-3 text-[10px] text-neutral-600 font-mono pointer-events-none opacity-60">
          Smart Mirror Touchscreen Active · Tap TempestWx to expand
        </div>
      </div>
    </div>
  );
};
