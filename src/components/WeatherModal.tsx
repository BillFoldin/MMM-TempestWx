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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/90 transition-opacity duration-200"
      onClick={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      {/* Modal Container: Jet black & subtle slate border to fit MagicMirror aesthetic */}
      <div
        className="relative w-full max-w-5xl max-h-[94vh] flex flex-col bg-black border border-neutral-800/90 rounded-2xl shadow-2xl overflow-hidden text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar matching main module */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/80 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs sm:text-sm font-semibold tracking-widest text-neutral-300 uppercase font-sans">
                  TempestWx Detailed Report
                </span>
                <span className="text-neutral-600 text-sm">·</span>
                <span className="text-xs sm:text-sm text-neutral-400 font-sans font-medium truncate max-w-[200px] sm:max-w-none">
                  {observation.station_name || 'Tempest Station'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-sans mt-0.5">
                Real-time ultrasonic telemetry & hyper-local meteorological forecasts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-close indicator pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-sans">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Auto-close in {secondsRemaining}s</span>
            </div>

            {/* Touchscreen Dismiss Button (Zero latency onPointerDown) */}
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                onClose();
              }}
              onClick={onClose}
              className="px-3.5 py-2 flex items-center gap-1.5 rounded-xl bg-neutral-900 border border-neutral-700/80 hover:bg-neutral-800 active:scale-95 text-neutral-200 hover:text-white transition-all touch-manipulation cursor-pointer font-sans text-xs sm:text-sm font-semibold tracking-wider uppercase"
              aria-label="Close Weather Modal"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable for touchscreen swipe */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
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
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    lightningThreat.level === 'danger'
                      ? 'bg-rose-500/30 text-rose-300'
                      : 'bg-amber-500/30 text-amber-300'
                  }`}
                >
                  <ModernLightningBoltIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider font-sans">
                      {lightningThreat.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-black/60 border border-white/10 font-sans font-medium">
                      {observation.lightning_strike_count} strikes recorded
                    </span>
                  </div>
                  <p className="text-xs opacity-90 font-sans mt-0.5">
                    {lightningThreat.sublabel}
                  </p>
                </div>
              </div>
              <div className="text-right font-sans shrink-0">
                <div className="text-sm sm:text-base font-bold tabular-nums">
                  {lightningDistFormatted.value} {lightningDistFormatted.unit}
                </div>
                <div className="text-xs opacity-75 uppercase tracking-wider">Strike Distance</div>
              </div>
            </div>
          )}

          {/* SECTION 1: Seven-Day Extended Forecast with Large, Readable Font Sizes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-semibold tracking-widest text-neutral-300 uppercase font-sans flex items-center gap-2">
                <span>7-Day Extended Forecast</span>
              </h3>
              <span className="text-xs text-neutral-400 font-sans">
                Tap day to inspect
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
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
                    onPointerDown={() => {
                      setSelectedDayIndex(idx);
                      handleUserActivity();
                    }}
                    onClick={() => {
                      setSelectedDayIndex(idx);
                      handleUserActivity();
                    }}
                    className={`flex flex-col items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer select-none touch-manipulation min-h-[210px] sm:min-h-[230px] ${
                      isSelected
                        ? 'bg-neutral-900/90 border-neutral-300 shadow-xl ring-1 ring-white/30'
                        : 'bg-black/90 hover:bg-neutral-950 border-neutral-800/80 hover:border-neutral-700'
                    }`}
                  >
                    {/* Day label (Increased font size & uppercase font-sans) */}
                    <div className="text-center w-full">
                      <div className="text-sm sm:text-base font-bold text-white uppercase tracking-wider font-sans">
                        {day.day_name}
                      </div>
                      <div className="text-xs text-neutral-400 font-sans font-medium mt-0.5">
                        {day.date_label}
                      </div>
                    </div>

                    {/* Condition Icon (Sizable & crisp) */}
                    <div className="my-2 text-white flex items-center justify-center h-12 w-12 drop-shadow-md">
                      <WeatherConditionIcon icon={day.icon} condition={day.conditions} size={38} />
                    </div>

                    {/* Conditions description (Readable font size) */}
                    <span className="text-xs sm:text-sm text-neutral-200 text-center line-clamp-1 mb-2 font-sans font-medium px-1">
                      {day.conditions}
                    </span>

                    {/* High / Low temperatures (Large font-size, tabular numbers) */}
                    <div className="w-full flex items-baseline justify-center gap-1.5 font-sans mb-1.5 px-0.5">
                      <span className="text-xl sm:text-2xl font-bold text-white tabular-nums tracking-tight">
                        {highFmt}
                      </span>
                      <span className="text-neutral-500 font-light text-base">/</span>
                      <span className="text-sm sm:text-base font-medium text-neutral-400 tabular-nums">
                        {lowFmt}
                      </span>
                    </div>

                    {/* Visual temperature spectrum bar */}
                    <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden relative mb-2.5 border border-neutral-800/80">
                      <div
                        className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-rose-400 opacity-90"
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                      />
                    </div>

                    {/* Precipitation & Wind glance (Increased font size) */}
                    <div className="w-full flex items-center justify-between pt-2 border-t border-neutral-800/80 text-xs font-sans">
                      <span className={day.precip_probability > 25 ? 'text-sky-400 font-semibold flex items-center gap-1' : 'text-neutral-400 flex items-center gap-1'}>
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                        </svg>
                        <span>{day.precip_probability}%</span>
                      </span>
                      <span className="text-neutral-400 font-medium">
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

          {/* SECTION 3: Deep Station Telemetry Matrix styled identically to Main Module */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold tracking-widest text-neutral-300 uppercase font-sans mb-3">
              Station Sensor Telemetry
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Solar Radiation & UV Index */}
              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex flex-col justify-between">
                <div className="text-xs uppercase tracking-wider font-semibold font-sans text-neutral-400 mb-2 flex items-center justify-between">
                  <span>Solar & UV Index</span>
                  <ModernSunUvIcon className={`w-4 h-4 ${uvCat.color}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-light font-sans tabular-nums text-white">
                    UV {observation.uv.toFixed(1)}
                  </span>
                  <span className={`text-xs font-sans uppercase font-semibold ${uvCat.color}`}>
                    {uvCat.label}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 mt-2 font-sans">
                  {observation.solar_radiation} W/m² · {uvCat.advice}
                </div>
              </div>

              {/* Barometric Pressure & Trend */}
              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex flex-col justify-between">
                <div className="text-xs uppercase tracking-wider font-semibold font-sans text-neutral-400 mb-2 flex items-center justify-between">
                  <span>Barometer</span>
                  <ModernPressureIcon className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-baseline gap-1 font-light text-white">
                  <span className="text-2xl sm:text-3xl font-light font-sans tabular-nums">
                    {formatPressure(observation.barometric_pressure, config.pressureUnit).value}
                  </span>
                  <span className="text-xs text-neutral-400 font-sans uppercase ml-1">
                    {config.pressureUnit}
                  </span>
                </div>
                <div className="text-xs text-neutral-300 mt-2 font-sans flex items-center gap-1.5">
                  <span className="text-sm font-mono text-neutral-200">{getTrendSymbol(observation.pressure_trend)}</span>
                  <span className="capitalize">{observation.pressure_trend}</span>
                </div>
              </div>

              {/* Precipitation Today */}
              <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex flex-col justify-between">
                <div className="text-xs uppercase tracking-wider font-semibold font-sans text-neutral-400 mb-2">
                  Precipitation
                </div>
                <div className="flex items-baseline gap-1 font-light text-white">
                  <span className="text-2xl sm:text-3xl font-light font-sans tabular-nums">
                    {formatPrecipitation(observation.precip_accum_local_day, config.units).value}
                  </span>
                  <span className="text-xs text-neutral-400 font-sans ml-1">
                    {formatPrecipitation(observation.precip_accum_local_day, config.units).unit}
                  </span>
                </div>
                <div className="text-xs text-neutral-400 mt-2 font-sans">
                  Rate: {observation.precip_rate.toFixed(2)} mm/hr
                </div>
              </div>

              {/* Lightning Strikes & Proximity Warning */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  lightningThreat.isNearby
                    ? lightningThreat.level === 'danger'
                      ? 'bg-rose-950/40 border-rose-500/50'
                      : 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-neutral-950/80 border-neutral-800/80'
                }`}
              >
                <div className="text-xs uppercase tracking-wider font-semibold font-sans text-neutral-400 mb-2 flex items-center justify-between">
                  <span>Lightning Sensor</span>
                  <ModernLightningBoltIcon
                    className={`w-4 h-4 ${
                      lightningThreat.isNearby ? 'text-amber-400' : 'text-neutral-500'
                    }`}
                  />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-light font-sans tabular-nums text-white">
                    {observation.lightning_strike_count}
                  </span>
                  <span className="text-xs text-neutral-400 font-sans">
                    {observation.lightning_strike_count === 1 ? 'strike' : 'strikes'}
                  </span>
                </div>
                <div
                  className={`text-xs mt-2 font-sans ${
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
        <div className="px-5 py-3 border-t border-neutral-800/80 bg-neutral-950 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-sans font-medium text-neutral-300">Tempest Sensor Supercap: {observation.battery.toFixed(2)}V (Optimal)</span>
          </div>

          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 font-sans font-semibold text-xs tracking-wider uppercase transition-colors touch-manipulation cursor-pointer"
          >
            Close Modal
          </button>
        </div>
      </div>
    </div>
  );
};
