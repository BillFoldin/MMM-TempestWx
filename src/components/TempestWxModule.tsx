import React from 'react';
import { TempestObservation, ModuleConfig } from '../types/tempest.ts';
import {
  formatTemp,
  formatPressure,
  getTrendSymbol,
  formatWindSpeed,
  formatPrecipitation,
  getLightningThreat,
  formatLightningDistance,
  getUvCategory,
} from '../utils/tempestFormat.ts';
import {
  ModernHumidityIcon,
  ModernPressureIcon,
  ModernWindVectorIcon,
  ModernSunUvIcon,
  ModernLightningBoltIcon,
  WeatherConditionIcon,
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
  const currentCondition = observation.conditions || 'Partly Cloudy';
  const currentIcon = observation.icon || 'partly-cloudy';

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
      className={`group relative select-none cursor-pointer rounded-2xl p-5 sm:p-6 transition-all duration-200 min-w-[320px] sm:min-w-[360px] ${
        config.theme === 'ambient-glass'
          ? 'bg-neutral-900/60 backdrop-blur-md border border-neutral-800/80 shadow-2xl'
          : 'bg-black/95 hover:bg-neutral-950 border border-neutral-800/60 hover:border-neutral-700/80 shadow-xl'
      }`}
    >
      {/* Module Title / Kicker in native MagicMirror typography (Increased Font Size) */}
      <div className="flex items-center justify-between gap-3 mb-3 border-b border-neutral-800/60 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xs sm:text-sm font-semibold tracking-widest text-neutral-300 uppercase font-sans">
            TempestWx
          </span>
          <span className="text-neutral-600 text-sm">·</span>
          <span className="text-xs sm:text-sm text-neutral-400 font-sans font-medium truncate max-w-[170px]">
            {observation.station_name || 'Tempest Station'}
          </span>
        </div>

        {/* Touch interactive cue */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors">
          <span className="hidden sm:inline font-medium">Tap for Forecast</span>
          <svg
            className="w-4 h-4 opacity-75 group-hover:opacity-100 transition-opacity"
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
          className={`mb-3.5 px-3 py-2 rounded-lg border flex items-center justify-between text-xs sm:text-sm transition-all ${
            lightningThreat.level === 'danger'
              ? 'bg-rose-950/50 border-rose-500/70 text-rose-200 animate-pulse'
              : lightningThreat.level === 'caution'
              ? 'bg-amber-950/40 border-amber-500/60 text-amber-200'
              : 'bg-yellow-950/30 border-yellow-500/40 text-yellow-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <ModernLightningBoltIcon
              className={`w-4 h-4 ${
                lightningThreat.level === 'danger' ? 'text-rose-400' : 'text-amber-400'
              }`}
            />
            <span className="font-semibold uppercase tracking-wider font-sans">
              {lightningThreat.label}
            </span>
          </div>
          <span className="font-mono font-medium opacity-95">
            {lightningDistFormatted.value} {lightningDistFormatted.unit} ({observation.lightning_strike_count} strikes)
          </span>
        </div>
      )}

      {/* HERO SECTION: Front & Center Temperature with Condition Icon (Massively Increased Font Size) */}
      <div className="my-3 sm:my-4 flex flex-col items-center justify-center text-center">
        <div className="flex items-center justify-center gap-3.5 sm:gap-5">
          {/* Current Condition Vector Icon */}
          <div className="text-amber-400 shrink-0 drop-shadow-md flex items-center justify-center">
            <WeatherConditionIcon
              icon={currentIcon}
              size={58}
              className="w-13 h-13 sm:w-16 sm:h-16 stroke-[1.75]"
            />
          </div>

          {/* Front & Center Hero Temperature */}
          <div className="flex items-baseline font-light tracking-tighter text-white">
            <span className="text-6xl sm:text-7xl font-extralight font-sans tabular-nums leading-none">
              {formatTemp(observation.air_temperature, config.units, false)}
            </span>
            <span className="text-3xl sm:text-4xl text-neutral-400 font-light ml-1 sm:ml-1.5">
              °{config.units === 'imperial' ? 'F' : 'C'}
            </span>
          </div>
        </div>

        {/* Condition Text & Thermal Subtitle */}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-sm sm:text-base font-sans">
          <span className="text-neutral-100 font-semibold tracking-wide">
            {currentCondition}
          </span>
          {config.showFeelsLike && (
            <>
              <span className="text-neutral-600 text-sm">·</span>
              <span className="text-neutral-300 font-medium">
                Feels {formatTemp(observation.feels_like, config.units)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* SECONDARY METRICS: Humidity, Barometric Pressure, Wind (Increased Font Sizes) */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-3.5 border-t border-neutral-800/70 text-center">
        {/* Metric 1: Humidity */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
            <ModernHumidityIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-xs uppercase tracking-wider font-semibold font-sans">
              Humidity
            </span>
          </div>
          <div className="flex items-baseline font-light tracking-tight text-white">
            <span className="text-2xl sm:text-3xl font-light font-sans tabular-nums">
              {Math.round(observation.relative_humidity)}
            </span>
            <span className="text-base sm:text-lg text-neutral-400 font-light ml-0.5 font-sans">
              %
            </span>
          </div>
          {config.showDewPoint && (
            <div className="mt-1 text-xs text-neutral-400 font-sans">
              Dew {formatTemp(observation.dew_point, config.units)}
            </div>
          )}
        </div>

        {/* Metric 2: Barometric Pressure */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
            <ModernPressureIcon className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase tracking-wider font-semibold font-sans">
              Pressure
            </span>
          </div>
          <div className="flex items-baseline gap-1 font-light text-white">
            <span className="text-2xl sm:text-3xl font-light font-mono tabular-nums tracking-tight">
              {pressureFormatted.value}
            </span>
            <span className="text-[11px] sm:text-xs text-neutral-400 uppercase font-mono">
              {pressureFormatted.unit}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-neutral-300 font-sans">
            <span className="font-mono text-sm text-neutral-200">{trendSymbol}</span>
            <span className="capitalize">{observation.pressure_trend}</span>
          </div>
        </div>

        {/* Metric 3: Wind Vector */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
            <ModernWindVectorIcon
              degrees={observation.wind_direction}
              size={16}
              className="text-sky-400"
            />
            <span className="text-xs uppercase tracking-wider font-semibold font-sans">
              Wind
            </span>
          </div>
          <div className="flex items-baseline gap-1 font-light text-white">
            <span className="text-2xl sm:text-3xl font-light font-sans tabular-nums">
              {windFormatted.value}
            </span>
            <span className="text-[11px] sm:text-xs text-neutral-400 font-mono">
              {windFormatted.unit}
            </span>
          </div>
          <div className="mt-1 text-xs text-neutral-300 font-mono">
            {observation.wind_direction_cardinal}
            {observation.wind_gust > observation.wind_avg + 1 && (
              <span className="text-neutral-400 ml-1">
                (G {gustFormatted.value})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AUXILIARY FOOTER: UV Index & Daily Rain Accumulation (Increased Font Sizes) */}
      <div className="mt-3.5 pt-2.5 border-t border-neutral-800/60 flex flex-wrap items-center justify-between gap-y-1.5 text-xs sm:text-sm text-neutral-300 font-sans">
        {/* UV Index Badge */}
        <div className="flex items-center gap-2">
          <ModernSunUvIcon className={`w-4 h-4 ${uvCat.color}`} />
          <span className="text-neutral-200 font-medium font-mono">
            UV {observation.uv.toFixed(1)}
          </span>
          <span
            className={`text-[10px] sm:text-xs uppercase font-sans font-semibold px-1.5 py-0.5 rounded border border-neutral-700/60 ${uvCat.color} bg-neutral-900/80`}
          >
            {uvCat.label}
          </span>
        </div>

        {/* Precipitation Info */}
        {observation.precip_accum_local_day > 0 ? (
          <div className="text-sky-400 font-mono text-xs sm:text-sm font-medium flex items-center gap-1.5">
            <span>🌧️</span>
            <span>{precipFormatted.value} {precipFormatted.unit} rain today</span>
          </div>
        ) : (
          <div className="text-neutral-500 text-xs font-sans">
            No rain today
          </div>
        )}
      </div>
    </div>
  );
};
