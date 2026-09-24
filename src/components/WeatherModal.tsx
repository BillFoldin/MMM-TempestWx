import React, { useState, useEffect, useMemo } from 'react';
import {
  TempestObservation,
  DailyForecast,
  HourlyForecast,
  ModuleConfig,
} from '../types/tempest.ts';
import {
  formatTemp,
  formatPressure,
  formatWindSpeed,
  formatPrecipitation,
  getUvCategory,
  getTrendSymbol,
  degreesToCardinal,
  getLightningThreat,
  formatLightningDistance,
} from '../utils/tempestFormat.ts';
import {
  WeatherConditionIcon,
  ModernWindVectorIcon,
  ModernPressureIcon,
  ModernSunUvIcon,
  ModernLightningBoltIcon,
} from './WeatherIcons.tsx';
import { HourlyGraphsSection } from './HourlyGraphsSection.tsx';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  observation: TempestObservation;
  forecastDaily: DailyForecast[];
  forecastHourly: HourlyForecast[];
  config: ModuleConfig;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({
  isOpen,
  onClose,
  observation,
  forecastDaily,
  forecastHourly,
  config,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(config.autoCloseModalSeconds || 30);
  const [activeHourlyIndex, setActiveHourlyIndex] = useState<number>(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  // Auto-close countdown timer with user touch reset
  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(config.autoCloseModalSeconds || 30);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, config.autoCloseModalSeconds, onClose]);

  const handleUserActivity = () => {
    // Reset timer on touchscreen interaction
    setSecondsRemaining(config.autoCloseModalSeconds || 30);
  };

  // Min and max for temperature range bars in 7-day forecast
  const { globalMinTemp, globalMaxTemp } = useMemo(() => {
    if (!forecastDaily || forecastDaily.length === 0) return { globalMinTemp: 0, globalMaxTemp: 30 };
    let min = Infinity;
    let max = -Infinity;
    forecastDaily.forEach((d) => {
      const low = Number(d.air_temp_low ?? (d as any).air_temperature_low ?? (d as any).low_temp ?? 10);
      const high = Number(d.air_temp_high ?? (d as any).air_temperature_high ?? (d as any).high_temp ?? 20);
      if (!isNaN(low) && low < min) min = low;
      if (!isNaN(high) && high > max) max = high;
    });
    if (min === Infinity || max === -Infinity) {
      min = 0;
      max = 30;
    }
    return { globalMinTemp: min, globalMaxTemp: max };
  }, [forecastDaily]);

  // Hourly telemetry dataset (24 hours)
  const hourlyData = useMemo(() => {
    return (forecastHourly || []).slice(0, 24);
  }, [forecastHourly]);

  if (!isOpen) return null;

  const lightningThreat = getLightningThreat(
    observation.lightning_strike_count,
    observation.lightning_strike_last_distance,
    config.units
  );
  const lightningDistFormatted = formatLightningDistance(
    observation.lightning_strike_last_distance,
    config.units
  );
  const uvCat = getUvCategory(observation.uv);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md transition-opacity duration-300"
      onClick={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      {/* Modal Container: Jet black & subtle slate border to fit MagicMirror aesthetic */}
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-neutral-950 border border-neutral-800/80 rounded-2xl shadow-2xl overflow-hidden text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/70 bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-widest text-neutral-400 font-sans font-medium">
                  TempestWx Detailed Report
                </span>
                <span className="text-neutral-600">·</span>
                <span className="text-xs text-neutral-400 font-mono">
                  {observation.station_name}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Real-time ultrasonic telemetry & hyper-local meteorological forecasts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-close indicator pill with progress ring */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse" />
              <span>Auto-closing in {secondsRemaining}s</span>
            </div>

            {/* Touchscreen Dismiss Button */}
            <button
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-neutral-800/80 hover:bg-neutral-700 active:scale-95 text-neutral-300 hover:text-white transition-all touch-manipulation"
              aria-label="Close Weather Modal"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable for touchscreen swipe */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Lightning Warning Banner (if strikes detected) */}
          {lightningThreat.isNearby && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-lg transition-all ${
                lightningThreat.level === 'danger'
                  ? 'bg-rose-950/60 border-rose-500/60 text-rose-200 animate-pulse'
                  : lightningThreat.level === 'caution'
                  ? 'bg-amber-950/50 border-amber-500/50 text-amber-200'
                  : 'bg-yellow-950/30 border-yellow-500/40 text-yellow-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    lightningThreat.level === 'danger'
                      ? 'bg-rose-500/30 text-rose-300'
                      : 'bg-amber-500/30 text-amber-300'
                  }`}
                >
                  <ModernLightningBoltIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider font-sans">
                      {lightningThreat.label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono">
                      {observation.lightning_strike_count} strikes recorded
                    </span>
                  </div>
                  <p className="text-xs opacity-90 font-sans mt-0.5">
                    {lightningThreat.sublabel}
                  </p>
                </div>
              </div>
              <div className="text-right font-mono shrink-0">
                <div className="text-sm font-bold">
                  {lightningDistFormatted.value} {lightningDistFormatted.unit}
                </div>
                <div className="text-[10px] opacity-75 uppercase">Strike Distance</div>
              </div>
            </div>
          )}

          {/* SECTION 1: Seven-Day Forecast */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium tracking-wide uppercase text-neutral-300 font-sans">
                7-Day Local Forecast
              </h3>
              <span className="text-xs text-neutral-400 font-sans">
                Tap a day to inspect
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {forecastDaily.map((day, idx) => {
                const isSelected = selectedDayIndex === idx;
                const highFmt = formatTemp(day.air_temp_high, config.units);
                const lowFmt = formatTemp(day.air_temp_low, config.units);
                const windFmt = formatWindSpeed(day.wind_avg, config.units);

                // Thermal range position math
                const range = Math.max(1, globalMaxTemp - globalMinTemp);
                const leftPercent = Math.max(0, Math.min(100, ((day.air_temp_low - globalMinTemp) / range) * 100));
                const rightPercent = Math.max(0, Math.min(100, ((globalMaxTemp - day.air_temp_high) / range) * 100));
                const widthPercent = Math.max(8, 100 - leftPercent - rightPercent);

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDayIndex(idx);
                      handleUserActivity();
                    }}
                    className={`flex flex-col items-center justify-between p-3 rounded-xl border transition-all cursor-pointer touch-manipulation ${
                      isSelected
                        ? 'bg-neutral-800/80 border-neutral-600 shadow-md ring-1 ring-neutral-500/50'
                        : 'bg-neutral-900/40 hover:bg-neutral-900/80 border-neutral-800/60'
                    }`}
                  >
                    {/* Day label */}
                    <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-sans">
                      {day.day_name}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono mb-2">
                      {day.date_label}
                    </span>

                    {/* Condition Icon */}
                    <div className="my-1.5 text-neutral-100 flex items-center justify-center h-9">
                      <WeatherConditionIcon icon={day.icon} condition={day.conditions} size={28} />
                    </div>

                    {/* Conditions description */}
                    <span className="text-[11px] text-neutral-300 text-center line-clamp-1 mb-2 font-sans">
                      {day.conditions}
                    </span>

                    {/* High / Low temperatures */}
                    <div className="w-full flex items-baseline justify-between text-xs font-mono mb-1.5 px-0.5">
                      <span className="text-neutral-400 text-[11px]">{lowFmt}</span>
                      <span className="text-white font-medium">{highFmt}</span>
                    </div>

                    {/* Visual temperature spectrum bar */}
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden relative mb-2.5">
                      <div
                        className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-rose-400 opacity-90"
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                      />
                    </div>

                    {/* Precipitation & Wind glance */}
                    <div className="w-full flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[10px] font-mono text-neutral-400">
                      <span className={day.precip_probability > 30 ? 'text-sky-400 font-medium' : 'text-neutral-400'}>
                        {day.precip_probability}% rain
                      </span>
                      <span>
                        {windFmt.value} {windFmt.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: Scrollable 24-Hour Telemetry Graphs (Temperature, Humidity, Wind Speed, UV Index, Rain Accumulation) */}
          <HourlyGraphsSection
            hourlyData={hourlyData}
            activeHourlyIndex={activeHourlyIndex}
            onActiveHourlyIndexChange={setActiveHourlyIndex}
            config={config}
            onUserActivity={handleUserActivity}
          />

          {/* SECTION 3: Deep Station Telemetry Matrix */}
          <div>
            <h3 className="text-sm font-medium tracking-wide uppercase text-neutral-300 mb-3 font-sans">
              Station Sensor Telemetry
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Solar Radiation & UV Index */}
              <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/70">
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1 flex items-center justify-between">
                  <span>Solar & UV Index</span>
                  <ModernSunUvIcon className={`w-3.5 h-3.5 ${uvCat.color}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-medium text-white">
                    UV {observation.uv.toFixed(1)}
                  </span>
                  <span className={`text-[11px] font-sans uppercase font-medium ${uvCat.color}`}>
                    {uvCat.label}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 font-mono">
                  {observation.solar_radiation} W/m² · {uvCat.advice}
                </div>
              </div>

              {/* Barometric Pressure & Trend */}
              <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/70">
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1 flex items-center gap-1">
                  <ModernPressureIcon className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Barometer</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-mono font-medium text-white">
                    {formatPressure(observation.barometric_pressure, config.pressureUnit).value}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono uppercase">
                    {config.pressureUnit}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 font-mono flex items-center gap-1">
                  <span>Trend:</span>
                  <span className="text-neutral-200">{getTrendSymbol(observation.pressure_trend)}</span>
                  <span className="capitalize">{observation.pressure_trend}</span>
                </div>
              </div>

              {/* Precipitation Today */}
              <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800/70">
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1">
                  Precipitation
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-mono font-medium text-white">
                    {formatPrecipitation(observation.precip_accum_local_day, config.units).value}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    {formatPrecipitation(observation.precip_accum_local_day, config.units).unit}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-1 font-mono">
                  Rate: {observation.precip_rate.toFixed(2)} mm/hr
                </div>
              </div>

              {/* Lightning Strikes & Proximity Warning */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  lightningThreat.isNearby
                    ? lightningThreat.level === 'danger'
                      ? 'bg-rose-950/40 border-rose-500/50'
                      : 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-neutral-900/40 border-neutral-800/70'
                }`}
              >
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 mb-1 flex items-center justify-between">
                  <span>Lightning Sensor</span>
                  <ModernLightningBoltIcon
                    className={`w-3.5 h-3.5 ${
                      lightningThreat.isNearby ? 'text-amber-400' : 'text-neutral-500'
                    }`}
                  />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-mono font-medium text-white">
                    {observation.lightning_strike_count}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    {observation.lightning_strike_count === 1 ? 'strike' : 'strikes'}
                  </span>
                </div>
                <div
                  className={`text-[11px] mt-1 font-mono ${
                    lightningThreat.isNearby ? lightningThreat.badgeText : 'text-neutral-400'
                  }`}
                >
                  {observation.lightning_strike_count > 0
                    ? `Closest: ${lightningDistFormatted.value} ${lightningDistFormatted.unit} (${lightningThreat.label})`
                    : 'Zero activity detected within 45 km'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer / Dismiss Bar */}
        <div className="px-5 py-3 border-t border-neutral-800/70 bg-neutral-900/40 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-mono">Tempest Sensor Supercap: {observation.battery.toFixed(2)}V (Optimal)</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-sans font-medium text-xs transition-colors touch-manipulation"
          >
            Close Modal (Tap)
          </button>
        </div>
      </div>
    </div>
  );
};
