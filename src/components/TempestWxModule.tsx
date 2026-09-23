import React from 'react';
import { TempestObservation, ModuleConfig } from '../types/tempest.ts';
import {
  formatTemp,
  formatHumidity,
  formatPressure,
  getTrendSymbol,
  formatWindSpeed,
  formatPrecipitation,
  getLightningThreat,
  formatLightningDistance,
  getUvCategory,
} from '../utils/tempestFormat.ts';
import {
  ModernThermometerIcon,
  ModernHumidityIcon,
  ModernPressureIcon,
  ModernWindVectorIcon,
  ModernSunUvIcon,
  ModernLightningBoltIcon,
} from './WeatherIcons.tsx';

interface TempestWxModuleProps {
  observation: TempestObservation;
  config: ModuleConfig;
  onOpenModal?: () => void;
  isTouchScreen?: boolean;
}

export const TempestWxModule: React.FC<TempestWxModuleProps> = ({
  observation,
  config,
  onOpenModal,
}) => {
  const pressureFormatted = formatPressure(
    observation.barometric_pressure,
    config.pressureUnit
  );
  const windFormatted = formatWindSpeed(observation.wind_avg, config.units);
  const gustFormatted = formatWindSpeed(observation.wind_gust, config.units);
  const precipFormatted = formatPrecipitation(observation.precip_accum_local_day, config.units);

  const uvCat = getUvCategory(observation.uv);
  const lightningThreat = getLightningThreat(
    observation.lightning_strike_count,
    observation.lightning_strike_last_distance,
    config.units
  );
  const lightningDistFormatted = formatLightningDistance(
    observation.lightning_strike_last_distance,
    config.units
  );

  const handleClick = () => {
    if (config.showModalOnTouch && onOpenModal) {
      onOpenModal();
    }
  };

  const trendSymbol = getTrendSymbol(observation.pressure_trend);

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      aria-label="TempestWx module. Click or tap for 7-day forecast and hourly wind trends."
      className={`group relative select-none cursor-pointer rounded-xl p-4 transition-all duration-200 ${
        config.theme === 'ambient-glass'
          ? 'bg-neutral-900/40 backdrop-blur-md border border-neutral-800/60 shadow-xl'
          : 'bg-black/90 hover:bg-neutral-950/80 border border-transparent hover:border-neutral-800/40'
      }`}
    >
      {/* Module Title / Kicker in native MagicMirror typography */}
      <div className="flex items-center justify-between gap-3 mb-2 border-b border-neutral-800/50 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium tracking-widest text-neutral-400 uppercase font-sans">
            TempestWx
          </span>
          <span className="text-neutral-600 text-xs">·</span>
          <span className="text-[11px] text-neutral-500 font-sans truncate max-w-[140px]">
            {observation.station_name || 'Tempest Station'}
          </span>
        </div>

        {/* Touch interactive cue */}
        <div className="flex items-center gap-1 text-[10px] text-neutral-500 group-hover:text-neutral-300 transition-colors">
          <span className="hidden sm:inline">Tap for Forecast</span>
          <svg
            className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 3h6v6" />
            <path d="M10 14L21 3" />
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </svg>
        </div>
      </div>

      {/* Lightning Warning Banner (Minimalist high-contrast alert) */}
      {lightningThreat.isNearby && (
        <div
          className={`mb-3 px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs transition-all ${
            lightningThreat.level === 'danger'
              ? 'bg-rose-950/40 border-rose-500/60 text-rose-200 animate-pulse'
              : lightningThreat.level === 'caution'
              ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
              : 'bg-yellow-950/20 border-yellow-500/30 text-yellow-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <ModernLightningBoltIcon
              className={`w-3.5 h-3.5 ${
                lightningThreat.level === 'danger' ? 'text-rose-400' : 'text-amber-400'
              }`}
            />
            <span className="font-semibold text-[11px] uppercase tracking-wider font-sans">
              {lightningThreat.label}
            </span>
          </div>
          <span className="font-mono text-[11px] font-medium opacity-90">
            {lightningDistFormatted.value} {lightningDistFormatted.unit} ({observation.lightning_strike_count} strikes)
          </span>
        </div>
      )}

      {/* Primary Metrics Trio: Temperature, Humidity, Barometric Pressure */}
      <div className="grid grid-cols-3 gap-3 sm:gap-5 items-start">
        {/* Metric 1: Temperature */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
            <ModernThermometerIcon className="w-4 h-4 text-neutral-300" />
            <span className="text-[11px] uppercase tracking-wider font-light font-sans">
              Temp
            </span>
          </div>
          <div className="flex items-baseline font-light tracking-tight text-white">
            <span className="text-3xl sm:text-4xl font-light font-sans tabular-nums">
              {formatTemp(observation.air_temperature, config.units, false)}
            </span>
            <span className="text-xl sm:text-2xl text-neutral-400 font-light ml-0.5">
              °{config.units === 'imperial' ? 'F' : 'C'}
            </span>
          </div>
          {config.showFeelsLike && (
            <div className="mt-1 text-[11px] text-neutral-400 font-sans">
              Feels {formatTemp(observation.feels_like, config.units)}
            </div>
          )}
        </div>

        {/* Metric 2: Humidity */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
            <ModernHumidityIcon className="w-4 h-4 text-neutral-300" />
            <span className="text-[11px] uppercase tracking-wider font-light font-sans">
              Humidity
            </span>
          </div>
          <div className="flex items-baseline font-light tracking-tight text-white">
            <span className="text-3xl sm:text-4xl font-light font-sans tabular-nums">
              {Math.round(observation.relative_humidity)}
            </span>
            <span className="text-lg sm:text-xl text-neutral-400 font-light ml-0.5 font-sans">
              %
            </span>
          </div>
          {config.showDewPoint && (
            <div className="mt-1 text-[11px] text-neutral-400 font-sans">
              Dew {formatTemp(observation.dew_point, config.units)}
            </div>
          )}
        </div>

        {/* Metric 3: Barometric Pressure */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
            <ModernPressureIcon className="w-4 h-4 text-neutral-300" />
            <span className="text-[11px] uppercase tracking-wider font-light font-sans">
              Pressure
            </span>
          </div>
          <div className="flex items-baseline gap-1 font-light text-white">
            <span className="text-2xl sm:text-3xl font-light font-mono tabular-nums tracking-tight">
              {pressureFormatted.value}
            </span>
            <span className="text-[10px] text-neutral-400 uppercase font-mono">
              {pressureFormatted.unit}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-400 font-sans">
            <span className="font-mono text-xs text-neutral-200">{trendSymbol}</span>
            <span className="capitalize">{observation.pressure_trend}</span>
          </div>
        </div>
      </div>

      {/* Auxiliary Wind, UV Index & Microclimate Bar (Minimalist MagicMirror Footer) */}
      <div className="mt-3 pt-2.5 border-t border-neutral-900/80 flex flex-wrap items-center justify-between gap-y-1.5 text-xs text-neutral-400 font-sans">
        {/* Wind Vector & Direction */}
        <div className="flex items-center gap-2">
          <ModernWindVectorIcon
            degrees={observation.wind_direction}
            size={14}
            className="text-neutral-300"
          />
          <span className="text-neutral-300 font-medium font-mono text-[11px]">
            {observation.wind_direction_cardinal}
          </span>
          <span className="text-neutral-400 font-mono text-[11px]">
            {windFormatted.value} {windFormatted.unit}
          </span>
          {observation.wind_gust > observation.wind_avg + 1 && (
            <span className="text-neutral-500 font-mono text-[11px]">
              (gusts {gustFormatted.value})
            </span>
          )}
        </div>

        {/* Minimalist UV Index & Precipitation Indicators */}
        <div className="flex items-center gap-2.5 font-mono text-[11px]">
          {/* Current UV Index */}
          <div className="flex items-center gap-1.5">
            <ModernSunUvIcon className={`w-3.5 h-3.5 ${uvCat.color}`} />
            <span className="text-neutral-200 font-medium font-mono">
              UV {observation.uv.toFixed(1)}
            </span>
            <span
              className={`text-[9px] uppercase font-sans font-medium px-1 py-0.2 rounded border border-neutral-800/80 ${uvCat.color} bg-neutral-900/60`}
            >
              {uvCat.label}
            </span>
          </div>

          {/* Daily Rain Accumulation if > 0 */}
          {observation.precip_accum_local_day > 0 && (
            <div className="text-sky-400 font-mono text-[11px] pl-2 border-l border-neutral-800">
              {precipFormatted.value} {precipFormatted.unit} rain
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
