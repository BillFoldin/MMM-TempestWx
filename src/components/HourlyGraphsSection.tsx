import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HourlyForecast, ModuleConfig } from '../types/tempest.ts';
import {
  formatTemp,
  formatWindSpeed,
  formatPrecipitation,
  getUvCategory,
  getHumidityComfort,
  cToF,
} from '../utils/tempestFormat.ts';
import {
  WeatherConditionIcon,
  ModernThermometerIcon,
  ModernHumidityIcon,
  ModernWindIcon,
  ModernWindVectorIcon,
  ModernSunUvIcon,
  ModernRainCloudIcon,
} from './WeatherIcons.tsx';

export type HourlyGraphType = 'temperature' | 'humidity' | 'wind' | 'uv' | 'rain';

interface GraphTabDef {
  id: HourlyGraphType;
  title: string;
  shortTitle: string;
  icon: React.FC<{ className?: string; size?: number }>;
  colorClass: string;
  activeBorder: string;
  bgGradient: string;
}

const GRAPH_TABS: GraphTabDef[] = [
  {
    id: 'temperature',
    title: 'Temperature',
    shortTitle: 'Temp',
    icon: ModernThermometerIcon,
    colorClass: 'text-amber-400',
    activeBorder: 'border-amber-500',
    bgGradient: 'from-amber-500/20 to-transparent',
  },
  {
    id: 'humidity',
    title: 'Humidity',
    shortTitle: 'Humidity',
    icon: ModernHumidityIcon,
    colorClass: 'text-cyan-400',
    activeBorder: 'border-cyan-500',
    bgGradient: 'from-cyan-500/20 to-transparent',
  },
  {
    id: 'wind',
    title: 'Wind Speed',
    shortTitle: 'Wind',
    icon: ModernWindIcon,
    colorClass: 'text-sky-400',
    activeBorder: 'border-sky-500',
    bgGradient: 'from-sky-500/20 to-transparent',
  },
  {
    id: 'uv',
    title: 'UV Index',
    shortTitle: 'UV Index',
    icon: ModernSunUvIcon,
    colorClass: 'text-orange-400',
    activeBorder: 'border-orange-500',
    bgGradient: 'from-orange-500/20 to-transparent',
  },
  {
    id: 'rain',
    title: 'Rain Accumulation',
    shortTitle: 'Rain',
    icon: ModernRainCloudIcon,
    colorClass: 'text-indigo-400',
    activeBorder: 'border-indigo-500',
    bgGradient: 'from-indigo-500/20 to-transparent',
  },
];

interface HourlyGraphsSectionProps {
  hourlyData: HourlyForecast[];
  activeHourlyIndex: number;
  onActiveHourlyIndexChange: (idx: number) => void;
  config: ModuleConfig;
  onUserActivity: () => void;
}

export const HourlyGraphsSection: React.FC<HourlyGraphsSectionProps> = ({
  hourlyData,
  activeHourlyIndex,
  onActiveHourlyIndexChange,
  config,
  onUserActivity,
}) => {
  const [activeTab, setActiveTab] = useState<HourlyGraphType>('temperature');
  const carouselRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef<boolean>(false);

  // Fallback if empty
  const safeHourly = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];
    return hourlyData.slice(0, 24);
  }, [hourlyData]);

  const currentHour = safeHourly[activeHourlyIndex] || safeHourly[0] || {
    hour_label: '12 PM',
    conditions: 'Clear',
    icon: 'clear',
    air_temp: 20,
    feels_like: 20,
    relative_humidity: 50,
    wind_avg: 5,
    wind_gust: 7,
    wind_direction: 0,
    wind_direction_cardinal: 'N',
    uv: 4,
    precip_accum: 0,
    precip_probability: 0,
  };

  // 1. Temperature Calculations
  const { minTemp, maxTemp, tempRangeSpan, tempYMin, tempYMax } = useMemo(() => {
    if (!safeHourly.length) return { minTemp: 15, maxTemp: 25, tempRangeSpan: 10, tempYMin: 13, tempYMax: 27 };
    let min = Infinity;
    let max = -Infinity;
    safeHourly.forEach((h) => {
      if (h.air_temp < min) min = h.air_temp;
      if (h.air_temp > max) max = h.air_temp;
    });
    const span = Math.max(4, max - min);
    return {
      minTemp: min,
      maxTemp: max,
      tempRangeSpan: span,
      tempYMin: min - span * 0.15,
      tempYMax: max + span * 0.15,
    };
  }, [safeHourly]);

  // 2. Humidity Calculations
  const { minHumidity, maxHumidity, avgHumidity } = useMemo(() => {
    if (!safeHourly.length) return { minHumidity: 40, maxHumidity: 80, avgHumidity: 60 };
    let min = 100;
    let max = 0;
    let sum = 0;
    safeHourly.forEach((h) => {
      const rh = h.relative_humidity ?? 50;
      if (rh < min) min = rh;
      if (rh > max) max = rh;
      sum += rh;
    });
    return {
      minHumidity: min,
      maxHumidity: max,
      avgHumidity: Math.round(sum / safeHourly.length),
    };
  }, [safeHourly]);

  // 3. Wind Calculations
  const { maxWindInHourly, avgWindInHourly, peakGustInHourly } = useMemo(() => {
    if (!safeHourly.length) return { maxWindInHourly: 15, avgWindInHourly: 5, peakGustInHourly: 10 };
    let maxGust = 0;
    let sumAvg = 0;
    safeHourly.forEach((h) => {
      const gust = Math.max(h.wind_avg, h.wind_gust || 0);
      if (gust > maxGust) maxGust = gust;
      sumAvg += h.wind_avg;
    });
    return {
      maxWindInHourly: Math.max(6, maxGust + 2),
      avgWindInHourly: sumAvg / safeHourly.length,
      peakGustInHourly: maxGust,
    };
  }, [safeHourly]);

  // 4. UV Calculations
  const { peakUvInHourly, daylightHoursCount } = useMemo(() => {
    if (!safeHourly.length) return { peakUvInHourly: 5, daylightHoursCount: 12 };
    let maxUv = 0;
    let daylight = 0;
    safeHourly.forEach((h) => {
      if ((h.uv || 0) > maxUv) maxUv = h.uv;
      if ((h.uv || 0) > 0.5) daylight++;
    });
    return {
      peakUvInHourly: Math.max(3, maxUv),
      daylightHoursCount: daylight,
    };
  }, [safeHourly]);

  // 5. Rain Calculations
  const { totalRain24h, peakHourlyRain, maxPrecipProb, cumulativeRainArray } = useMemo(() => {
    if (!safeHourly.length) return { totalRain24h: 0, peakHourlyRain: 0, maxPrecipProb: 0, cumulativeRainArray: [] };
    let total = 0;
    let peak = 0;
    let maxProb = 0;
    const cum: number[] = [];
    safeHourly.forEach((h) => {
      const rain = h.precip_accum || 0;
      total += rain;
      if (rain > peak) peak = rain;
      if ((h.precip_probability || 0) > maxProb) maxProb = h.precip_probability;
      cum.push(Number(total.toFixed(2)));
    });
    return {
      totalRain24h: total,
      peakHourlyRain: peak,
      maxPrecipProb: maxProb,
      cumulativeRainArray: cum,
    };
  }, [safeHourly]);

  // Quick glances for each tab
  const getTabQuickGlance = (tabId: HourlyGraphType): string => {
    switch (tabId) {
      case 'temperature':
        return formatTemp(currentHour.air_temp, config.units);
      case 'humidity':
        return `${currentHour.relative_humidity ?? 50}%`;
      case 'wind': {
        const w = formatWindSpeed(currentHour.wind_avg, config.units);
        return `${w.value} ${w.unit}`;
      }
      case 'uv':
        return `UV ${(currentHour.uv ?? 0).toFixed(1)}`;
      case 'rain': {
        const r = formatPrecipitation(currentHour.precip_accum ?? 0, config.units);
        return `${r.value} ${r.unit}`;
      }
      default:
        return '';
    }
  };

  // Scroll carousel to selected tab
  const scrollToGraph = (tabId: HourlyGraphType) => {
    setActiveTab(tabId);
    onUserActivity();
    if (!carouselRef.current) return;
    const index = GRAPH_TABS.findIndex((t) => t.id === tabId);
    if (index === -1) return;

    isProgrammaticScroll.current = true;
    const targetElement = carouselRef.current.children[index] as HTMLElement;
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }

    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 600);
  };

  // Handle scroll listener on carousel to sync active tab
  const handleScroll = () => {
    if (isProgrammaticScroll.current || !carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const cardWidth = carouselRef.current.offsetWidth || 1;
    const activeIndex = Math.round(scrollLeft / cardWidth);
    const safeIndex = Math.max(0, Math.min(GRAPH_TABS.length - 1, activeIndex));
    if (GRAPH_TABS[safeIndex] && GRAPH_TABS[safeIndex].id !== activeTab) {
      setActiveTab(GRAPH_TABS[safeIndex].id);
    }
  };

  const currentTabIndex = GRAPH_TABS.findIndex((t) => t.id === activeTab);

  const handlePrevTab = () => {
    const nextIdx = (currentTabIndex - 1 + GRAPH_TABS.length) % GRAPH_TABS.length;
    scrollToGraph(GRAPH_TABS[nextIdx].id);
  };

  const handleNextTab = () => {
    const nextIdx = (currentTabIndex + 1) % GRAPH_TABS.length;
    scrollToGraph(GRAPH_TABS[nextIdx].id);
  };

  return (
    <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 sm:p-5 shadow-xl">
      {/* Top Header: Navigation Bar & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-3 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <h3 className="text-sm font-semibold tracking-wider uppercase text-neutral-200 font-sans">
              24-Hour Local Telemetry Trends
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Swipe or select graphs: Temperature, Humidity, Wind Speed, UV Index, & Rain
          </p>
        </div>

        {/* Previous / Next Arrow Controls */}
        <div className="flex items-center gap-1.5 self-end md:self-auto">
          <button
            type="button"
            onClick={handlePrevTab}
            className="w-8 h-8 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 active:scale-95 text-neutral-300 hover:text-white flex items-center justify-center transition-all"
            aria-label="Previous hourly graph"
            title="Previous hourly graph"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-xs font-mono text-neutral-400 px-1">
            {currentTabIndex + 1} / {GRAPH_TABS.length}
          </span>
          <button
            type="button"
            onClick={handleNextTab}
            className="w-8 h-8 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 active:scale-95 text-neutral-300 hover:text-white flex items-center justify-center transition-all"
            aria-label="Next hourly graph"
            title="Next hourly graph"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs Selector Bar: Ordered 1. Temperature, 2. Humidity, 3. Wind Speed, 4. UV Index, 5. Rain Accumulation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-4">
        {GRAPH_TABS.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;
          const quickValue = getTabQuickGlance(tab.id);

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollToGraph(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap border shrink-0 touch-manipulation ${
                isActive
                  ? 'bg-neutral-800 text-white border-neutral-600 shadow-md ring-1 ring-neutral-500/40'
                  : 'bg-neutral-900/50 hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200 border-neutral-800/80'
              }`}
            >
              <span className={`flex items-center justify-center ${isActive ? tab.colorClass : 'text-neutral-500'}`}>
                <IconComponent size={15} />
              </span>
              <span className="font-sans font-medium">{tab.title}</span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/5 text-neutral-300 ml-0.5">
                {quickValue}
              </span>
            </button>
          );
        })}
      </div>

      {/* Horizontal Carousel Container: Snap scrolling across the 5 graphs */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-xl gap-4 scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {/* GRAPH 1: Temperature */}
        <div className="w-full shrink-0 snap-center">
          <TemperatureGraphCard
            hourlyData={safeHourly}
            activeHourlyIndex={activeHourlyIndex}
            onSelectHour={onActiveHourlyIndexChange}
            config={config}
            minTemp={minTemp}
            maxTemp={maxTemp}
            tempYMin={tempYMin}
            tempYMax={tempYMax}
            onUserActivity={onUserActivity}
          />
        </div>

        {/* GRAPH 2: Humidity */}
        <div className="w-full shrink-0 snap-center">
          <HumidityGraphCard
            hourlyData={safeHourly}
            activeHourlyIndex={activeHourlyIndex}
            onSelectHour={onActiveHourlyIndexChange}
            config={config}
            minHumidity={minHumidity}
            maxHumidity={maxHumidity}
            avgHumidity={avgHumidity}
            onUserActivity={onUserActivity}
          />
        </div>

        {/* GRAPH 3: Wind Speed */}
        <div className="w-full shrink-0 snap-center">
          <WindSpeedGraphCard
            hourlyData={safeHourly}
            activeHourlyIndex={activeHourlyIndex}
            onSelectHour={onActiveHourlyIndexChange}
            config={config}
            maxWindInHourly={maxWindInHourly}
            avgWindInHourly={avgWindInHourly}
            peakGustInHourly={peakGustInHourly}
            onUserActivity={onUserActivity}
          />
        </div>

        {/* GRAPH 4: UV Index */}
        <div className="w-full shrink-0 snap-center">
          <UvIndexGraphCard
            hourlyData={safeHourly}
            activeHourlyIndex={activeHourlyIndex}
            onSelectHour={onActiveHourlyIndexChange}
            config={config}
            peakUvInHourly={peakUvInHourly}
            daylightHoursCount={daylightHoursCount}
            onUserActivity={onUserActivity}
          />
        </div>

        {/* GRAPH 5: Rain Accumulation */}
        <div className="w-full shrink-0 snap-center">
          <RainAccumulationGraphCard
            hourlyData={safeHourly}
            activeHourlyIndex={activeHourlyIndex}
            onSelectHour={onActiveHourlyIndexChange}
            config={config}
            totalRain24h={totalRain24h}
            peakHourlyRain={peakHourlyRain}
            maxPrecipProb={maxPrecipProb}
            cumulativeRainArray={cumulativeRainArray}
            onUserActivity={onUserActivity}
          />
        </div>
      </div>

      {/* Bottom Carousel Pagination Dots */}
      <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-neutral-800/60">
        {GRAPH_TABS.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollToGraph(tab.id)}
              className={`transition-all rounded-full ${
                isActive ? 'w-6 h-2 bg-neutral-200' : 'w-2 h-2 bg-neutral-700 hover:bg-neutral-500'
              }`}
              aria-label={`Go to ${tab.title} graph`}
              title={tab.title}
            />
          );
        })}
      </div>
    </div>
  );
};

/* =========================================================================
   GRAPH 1: TEMPERATURE GRAPH CARD
   ========================================================================= */
interface TemperatureGraphCardProps {
  hourlyData: HourlyForecast[];
  activeHourlyIndex: number;
  onSelectHour: (i: number) => void;
  config: ModuleConfig;
  minTemp: number;
  maxTemp: number;
  tempYMin: number;
  tempYMax: number;
  onUserActivity: () => void;
}

const TemperatureGraphCard: React.FC<TemperatureGraphCardProps> = ({
  hourlyData,
  activeHourlyIndex,
  onSelectHour,
  config,
  minTemp,
  maxTemp,
  tempYMin,
  tempYMax,
  onUserActivity,
}) => {
  const activeHour = hourlyData[activeHourlyIndex] || hourlyData[0];
  const activeTempFormatted = formatTemp(activeHour.air_temp, config.units);
  const feelsLikeFormatted = formatTemp(activeHour.feels_like ?? activeHour.air_temp, config.units);
  const rangeSpan = Math.max(1, tempYMax - tempYMin);

  return (
    <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4">
      {/* Subheader & Active Scrubber */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-neutral-800/60">
        <div>
          <div className="flex items-center gap-2 text-amber-400">
            <ModernThermometerIcon size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Hourly Air Temperature & Thermal Trends
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            24-hour diurnal thermal curve, ambient temp, and real-feel index
          </p>
        </div>

        {/* Scrubber Readout Badge */}
        <div className="flex items-center gap-2.5 bg-neutral-900/90 px-3 py-1.5 rounded-lg border border-neutral-800 font-mono text-xs">
          <span className="text-neutral-400">{activeHour.hour_label}</span>
          <span className="text-neutral-600">|</span>
          <span className="text-amber-300 font-semibold text-sm">{activeTempFormatted}</span>
          <span className="text-neutral-400 text-[11px]">Feels {feelsLikeFormatted}</span>
          <span className="text-neutral-400 flex items-center gap-1 text-[11px] font-sans">
            <WeatherConditionIcon icon={activeHour.icon} size={14} />
            {activeHour.conditions}
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full h-44 sm:h-52 select-none touch-none">
        {/* Horizontal reference grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-25 text-[10px] font-mono text-neutral-400">
          <div className="border-b border-neutral-700 w-full pb-0.5">
            Max: {formatTemp(maxTemp, config.units)}
          </div>
          <div className="border-b border-neutral-700 w-full pb-0.5">
            Mid: {formatTemp((maxTemp + minTemp) / 2, config.units)}
          </div>
          <div className="border-b border-neutral-700 w-full pb-0.5">
            Min: {formatTemp(minTemp, config.units)}
          </div>
        </div>

        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#f97316" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Temperature Area & Line */}
          {(() => {
            const pts = hourlyData.map((h, i) => {
              const x = (i / Math.max(1, hourlyData.length - 1)) * 800;
              const y = 185 - ((h.air_temp - tempYMin) / rangeSpan) * 165;
              return `${x},${y}`;
            });
            const areaD = `M 0,190 L ${pts.join(' L ')} L 800,190 Z`;
            const lineD = `M ${pts.join(' L ')}`;
            return (
              <>
                <path d={areaD} fill="url(#tempGradient)" />
                <path d={lineD} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
              </>
            );
          })()}

          {/* Active Hover Cursor */}
          {(() => {
            const x = (activeHourlyIndex / Math.max(1, hourlyData.length - 1)) * 800;
            const y = 185 - ((activeHour.air_temp - tempYMin) / rangeSpan) * 165;
            return (
              <g>
                <line x1={x} y1={10} x2={x} y2={190} stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <circle cx={x} cy={y} r="5" fill="#f59e0b" stroke="#000000" strokeWidth="2" />
              </g>
            );
          })()}
        </svg>

        {/* Touch zones */}
        <div className="absolute inset-0 flex">
          {hourlyData.map((_, i) => (
            <div
              key={i}
              onMouseEnter={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              onTouchMove={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              onClick={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              className="flex-1 h-full cursor-crosshair"
            />
          ))}
        </div>
      </div>

      {/* Hour ticks with Condition Icons */}
      <div className="mt-3 pt-2 border-t border-neutral-800/80 grid grid-cols-8 sm:grid-cols-12 gap-1 text-center select-none">
        {hourlyData
          .filter((_, i) => i % (hourlyData.length > 12 ? 2 : 1) === 0)
          .map((h, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="text-[10px] text-neutral-400 font-mono mb-1">{h.hour_label}</span>
              <div className="w-5 h-5 flex items-center justify-center text-neutral-300">
                <WeatherConditionIcon icon={h.icon} size={13} />
              </div>
              <span className="text-[9px] font-mono text-neutral-300 font-medium">
                {formatTemp(h.air_temp, config.units)}
              </span>
            </div>
          ))}
      </div>

      {/* Stats footer bar */}
      <div className="mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400 font-mono">
        <div>
          24h Low: <span className="text-white">{formatTemp(minTemp, config.units)}</span>
        </div>
        <div>
          24h High: <span className="text-white">{formatTemp(maxTemp, config.units)}</span>
        </div>
        <div>
          Diurnal Swing: <span className="text-white">{(maxTemp - minTemp).toFixed(1)}°</span>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   GRAPH 2: HUMIDITY GRAPH CARD
   ========================================================================= */
interface HumidityGraphCardProps {
  hourlyData: HourlyForecast[];
  activeHourlyIndex: number;
  onSelectHour: (i: number) => void;
  config: ModuleConfig;
  minHumidity: number;
  maxHumidity: number;
  avgHumidity: number;
  onUserActivity: () => void;
}

const HumidityGraphCard: React.FC<HumidityGraphCardProps> = ({
  hourlyData,
  activeHourlyIndex,
  onSelectHour,
  config,
  minHumidity,
  maxHumidity,
  avgHumidity,
  onUserActivity,
}) => {
  const activeHour = hourlyData[activeHourlyIndex] || hourlyData[0];
  const humVal = activeHour.relative_humidity ?? 50;
  const comfort = getHumidityComfort(humVal);
  const dewPointC = activeHour.air_temp - (100 - humVal) / 5;

  return (
    <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4">
      {/* Subheader & Active Scrubber */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-neutral-800/60">
        <div>
          <div className="flex items-center gap-2 text-cyan-400">
            <ModernHumidityIcon size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Hourly Relative Humidity & Saturation
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            24-hour atmospheric water vapor concentration, dew point, and human comfort zone
          </p>
        </div>

        {/* Scrubber Readout Badge */}
        <div className="flex items-center gap-2.5 bg-neutral-900/90 px-3 py-1.5 rounded-lg border border-neutral-800 font-mono text-xs">
          <span className="text-neutral-400">{activeHour.hour_label}</span>
          <span className="text-neutral-600">|</span>
          <span className="text-cyan-300 font-semibold text-sm">{humVal}%</span>
          <span className={`text-[11px] font-sans font-medium ${comfort.color}`}>{comfort.label}</span>
          <span className="text-neutral-400 text-[11px]">Dew {formatTemp(dewPointC, config.units)}</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full h-44 sm:h-52 select-none touch-none">
        {/* Horizontal reference lines: 100%, 60% comfort top, 35% comfort bottom, 0% */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-25 text-[10px] font-mono text-neutral-400">
          <div className="border-b border-neutral-700 w-full pb-0.5">100% Saturation</div>
          <div className="border-b border-cyan-500/50 w-full pb-0.5 text-cyan-400">
            60% (Comfort Cap)
          </div>
          <div className="border-b border-cyan-500/50 w-full pb-0.5 text-cyan-400">
            35% (Comfort Floor)
          </div>
          <div className="border-b border-neutral-700 w-full pb-0.5">0%</div>
        </div>

        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="humidityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Optimal comfort band box (35% to 60%) */}
          <rect x="0" y="80" width="800" height="50" fill="#06b6d4" opacity="0.04" />

          {/* Humidity Line and Area */}
          {(() => {
            const pts = hourlyData.map((h, i) => {
              const x = (i / Math.max(1, hourlyData.length - 1)) * 800;
              const rh = h.relative_humidity ?? 50;
              const y = 190 - (rh / 100) * 175;
              return `${x},${y}`;
            });
            const areaD = `M 0,190 L ${pts.join(' L ')} L 800,190 Z`;
            const lineD = `M ${pts.join(' L ')}`;
            return (
              <>
                <path d={areaD} fill="url(#humidityGradient)" />
                <path d={lineD} fill="none" stroke="#06b6d4" strokeWidth="2.5" />
              </>
            );
          })()}

          {/* Active Hover Cursor */}
          {(() => {
            const x = (activeHourlyIndex / Math.max(1, hourlyData.length - 1)) * 800;
            const y = 190 - (humVal / 100) * 175;
            return (
              <g>
                <line x1={x} y1={10} x2={x} y2={190} stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <circle cx={x} cy={y} r="5" fill="#06b6d4" stroke="#000000" strokeWidth="2" />
              </g>
            );
          })()}
        </svg>

        {/* Touch zones */}
        <div className="absolute inset-0 flex">
          {hourlyData.map((_, i) => (
            <div
              key={i}
              onMouseEnter={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              onTouchMove={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              onClick={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              className="flex-1 h-full cursor-crosshair"
            />
          ))}
        </div>
      </div>

      {/* Hour ticks with Humidity levels */}
      <div className="mt-3 pt-2 border-t border-neutral-800/80 grid grid-cols-8 sm:grid-cols-12 gap-1 text-center select-none">
        {hourlyData
          .filter((_, i) => i % (hourlyData.length > 12 ? 2 : 1) === 0)
          .map((h, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="text-[10px] text-neutral-400 font-mono mb-1">{h.hour_label}</span>
              <div className="w-5 h-5 flex items-center justify-center text-cyan-400">
                <ModernHumidityIcon size={12} />
              </div>
              <span className="text-[9px] font-mono text-cyan-300 font-medium">
                {h.relative_humidity ?? 50}%
              </span>
            </div>
          ))}
      </div>

      {/* Stats footer bar */}
      <div className="mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400 font-mono">
        <div>
          Min Humidity: <span className="text-white">{minHumidity}%</span>
        </div>
        <div>
          Max Humidity: <span className="text-white">{maxHumidity}%</span>
        </div>
        <div>
          24h Average: <span className="text-white">{avgHumidity}%</span>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   GRAPH 3: WIND SPEED GRAPH CARD
   ========================================================================= */
interface WindSpeedGraphCardProps {
  hourlyData: HourlyForecast[];
  activeHourlyIndex: number;
  onSelectHour: (i: number) => void;
  config: ModuleConfig;
  maxWindInHourly: number;
  avgWindInHourly: number;
  peakGustInHourly: number;
  onUserActivity: () => void;
}

const WindSpeedGraphCard: React.FC<WindSpeedGraphCardProps> = ({
  hourlyData,
  activeHourlyIndex,
  onSelectHour,
  config,
  maxWindInHourly,
  avgWindInHourly,
  peakGustInHourly,
  onUserActivity,
}) => {
  const currentHoveredHour = hourlyData[activeHourlyIndex] || hourlyData[0];
  const activeWindFormatted = formatWindSpeed(currentHoveredHour.wind_avg, config.units);
  const activeGustFormatted = formatWindSpeed(currentHoveredHour.wind_gust, config.units);
  const avgWindFormatted = formatWindSpeed(avgWindInHourly, config.units);
  const peakGustFormatted = formatWindSpeed(peakGustInHourly, config.units);

  return (
    <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4">
      {/* Subheader & Active Scrubber */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-neutral-800/60">
        <div>
          <div className="flex items-center gap-2 text-sky-400">
            <ModernWindIcon size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Hourly Wind Speed Trends & Directional Vectors
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Next 24 hours: Ultrasonic sustained velocity, peak gusts, and compass vectors
          </p>
        </div>

        {/* Scrubber Readout Badge */}
        <div className="flex items-center gap-3 bg-neutral-900/90 px-3 py-1.5 rounded-lg border border-neutral-800 font-mono text-xs">
          <span className="text-neutral-400">{currentHoveredHour.hour_label}</span>
          <span className="text-neutral-600">|</span>
          <span className="text-white font-semibold">
            Avg: {activeWindFormatted.value} {activeWindFormatted.unit}
          </span>
          <span className="text-orange-400 font-medium">Gust: {activeGustFormatted.value}</span>
          <span className="text-neutral-400 flex items-center gap-1">
            <ModernWindVectorIcon degrees={currentHoveredHour.wind_direction} size={12} />
            {currentHoveredHour.wind_direction_cardinal} ({currentHoveredHour.wind_direction}°)
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full h-44 sm:h-52 select-none touch-none">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-25 text-[10px] font-mono text-neutral-400">
          <div className="border-b border-neutral-700 w-full pb-0.5">
            {Math.round(maxWindInHourly)} {config.units === 'imperial' ? 'mph' : 'km/h'}
          </div>
          <div className="border-b border-neutral-700 w-full pb-0.5">
            {Math.round((maxWindInHourly * 2) / 3)} {config.units === 'imperial' ? 'mph' : 'km/h'}
          </div>
          <div className="border-b border-neutral-700 w-full pb-0.5">
            {Math.round(maxWindInHourly / 3)} {config.units === 'imperial' ? 'mph' : 'km/h'}
          </div>
          <div className="border-b border-neutral-700 w-full pb-0.5">0</div>
        </div>

        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="windGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gusts Path (Upper Envelope) */}
          {(() => {
            const pts = hourlyData.map((h, i) => {
              const x = (i / Math.max(1, hourlyData.length - 1)) * 800;
              const y = 190 - (h.wind_gust / maxWindInHourly) * 170;
              return `${x},${y}`;
            });
            return (
              <path
                d={`M ${pts.join(' L ')}`}
                fill="none"
                stroke="#fb923c"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.8"
              />
            );
          })()}

          {/* Wind Average Area Fill */}
          {(() => {
            const pts = hourlyData.map((h, i) => {
              const x = (i / Math.max(1, hourlyData.length - 1)) * 800;
              const y = 190 - (h.wind_avg / maxWindInHourly) * 170;
              return `${x},${y}`;
            });
            const areaD = `M 0,190 L ${pts.join(' L ')} L 800,190 Z`;
            const lineD = `M ${pts.join(' L ')}`;
            return (
              <>
                <path d={areaD} fill="url(#windGradient)" />
                <path d={lineD} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
              </>
            );
          })()}

          {/* Active hover vertical cursor */}
          {(() => {
            const x = (activeHourlyIndex / Math.max(1, hourlyData.length - 1)) * 800;
            const activeHour = hourlyData[activeHourlyIndex];
            const yAvg = 190 - (activeHour.wind_avg / maxWindInHourly) * 170;
            const yGust = 190 - (activeHour.wind_gust / maxWindInHourly) * 170;
            return (
              <g>
                <line x1={x} y1={10} x2={x} y2={190} stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <circle cx={x} cy={yAvg} r="4.5" fill="#38bdf8" stroke="#000000" strokeWidth="2" />
                <circle cx={x} cy={yGust} r="3.5" fill="#fb923c" stroke="#000000" strokeWidth="1.5" />
              </g>
            );
          })()}
        </svg>

        {/* Touch interaction zones */}
        <div className="absolute inset-0 flex">
          {hourlyData.map((_, i) => (
            <div
              key={i}
              onMouseEnter={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              onTouchMove={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              onClick={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              className="flex-1 h-full cursor-crosshair"
            />
          ))}
        </div>
      </div>

      {/* Directional Wind Vector Arrows & Hour Ticks Row */}
      <div className="mt-3 pt-2 border-t border-neutral-800/80 grid grid-cols-8 sm:grid-cols-12 gap-1 text-center select-none">
        {hourlyData
          .filter((_, i) => i % (hourlyData.length > 12 ? 2 : 1) === 0)
          .map((h, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="text-[10px] text-neutral-400 font-mono mb-1">{h.hour_label}</span>
              <div className="w-5 h-5 flex items-center justify-center text-neutral-300">
                <ModernWindVectorIcon degrees={h.wind_direction} size={13} />
              </div>
              <span className="text-[9px] font-mono text-neutral-400">{h.wind_direction_cardinal}</span>
            </div>
          ))}
      </div>

      {/* Stats footer bar */}
      <div className="mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400 font-mono">
        <div>
          Avg Wind: <span className="text-white">{avgWindFormatted.value} {avgWindFormatted.unit}</span>
        </div>
        <div>
          Peak Gust: <span className="text-orange-400 font-medium">{peakGustFormatted.value} {peakGustFormatted.unit}</span>
        </div>
        <div>
          Legend: <span className="text-sky-400">― Avg</span> <span className="text-orange-400 ml-2">-- Gust</span>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   GRAPH 4: UV INDEX GRAPH CARD
   ========================================================================= */
interface UvIndexGraphCardProps {
  hourlyData: HourlyForecast[];
  activeHourlyIndex: number;
  onSelectHour: (i: number) => void;
  config: ModuleConfig;
  peakUvInHourly: number;
  daylightHoursCount: number;
  onUserActivity: () => void;
}

const UvIndexGraphCard: React.FC<UvIndexGraphCardProps> = ({
  hourlyData,
  activeHourlyIndex,
  onSelectHour,
  config,
  peakUvInHourly,
  daylightHoursCount,
  onUserActivity,
}) => {
  const activeHour = hourlyData[activeHourlyIndex] || hourlyData[0];
  const uvVal = activeHour.uv ?? 0;
  const uvCat = getUvCategory(uvVal);
  const peakCat = getUvCategory(peakUvInHourly);
  const maxScale = Math.max(11, Math.ceil(peakUvInHourly + 1));

  return (
    <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4">
      {/* Subheader & Active Scrubber */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-neutral-800/60">
        <div>
          <div className="flex items-center gap-2 text-orange-400">
            <ModernSunUvIcon size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Hourly Solar UV Index & Exposure Radiation
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            24-hour ultraviolet radiation profile, danger tiering, and daylight protection
          </p>
        </div>

        {/* Scrubber Readout Badge */}
        <div className="flex items-center gap-2.5 bg-neutral-900/90 px-3 py-1.5 rounded-lg border border-neutral-800 font-mono text-xs">
          <span className="text-neutral-400">{activeHour.hour_label}</span>
          <span className="text-neutral-600">|</span>
          <span className={`font-semibold text-sm ${uvCat.color}`}>UV {uvVal.toFixed(1)}</span>
          <span className={`text-[11px] font-sans font-medium uppercase ${uvCat.color}`}>
            {uvCat.label}
          </span>
          <span className="text-neutral-400 text-[11px] max-w-[160px] truncate">
            {uvCat.advice}
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full h-44 sm:h-52 select-none touch-none">
        {/* Horizontal reference lines for WHO UV tiers: 11 (Extreme), 8 (Very High), 6 (High), 3 (Moderate), 0 */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-25 text-[10px] font-mono text-neutral-400">
          <div className="border-b border-purple-500/60 w-full pb-0.5 text-purple-300">
            11+ Extreme Risk
          </div>
          <div className="border-b border-rose-500/60 w-full pb-0.5 text-rose-300">
            8 Very High Risk
          </div>
          <div className="border-b border-orange-500/60 w-full pb-0.5 text-orange-300">
            6 High Risk
          </div>
          <div className="border-b border-amber-500/60 w-full pb-0.5 text-amber-300">
            3 Moderate Risk
          </div>
          <div className="border-b border-neutral-700 w-full pb-0.5">0 Low / Night</div>
        </div>

        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="uvGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* UV Area & Line */}
          {(() => {
            const pts = hourlyData.map((h, i) => {
              const x = (i / Math.max(1, hourlyData.length - 1)) * 800;
              const uv = h.uv ?? 0;
              const y = 190 - (uv / maxScale) * 175;
              return `${x},${y}`;
            });
            const areaD = `M 0,190 L ${pts.join(' L ')} L 800,190 Z`;
            const lineD = `M ${pts.join(' L ')}`;
            return (
              <>
                <path d={areaD} fill="url(#uvGradient)" />
                <path d={lineD} fill="none" stroke="#f97316" strokeWidth="2.5" />
              </>
            );
          })()}

          {/* Active Hover Cursor */}
          {(() => {
            const x = (activeHourlyIndex / Math.max(1, hourlyData.length - 1)) * 800;
            const y = 190 - (uvVal / maxScale) * 175;
            return (
              <g>
                <line x1={x} y1={10} x2={x} y2={190} stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <circle cx={x} cy={y} r="5" fill="#f97316" stroke="#000000" strokeWidth="2" />
              </g>
            );
          })()}
        </svg>

        {/* Touch zones */}
        <div className="absolute inset-0 flex">
          {hourlyData.map((_, i) => (
            <div
              key={i}
              onMouseEnter={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              onTouchMove={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              onClick={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              className="flex-1 h-full cursor-crosshair"
            />
          ))}
        </div>
      </div>

      {/* Hour ticks with UV values */}
      <div className="mt-3 pt-2 border-t border-neutral-800/80 grid grid-cols-8 sm:grid-cols-12 gap-1 text-center select-none">
        {hourlyData
          .filter((_, i) => i % (hourlyData.length > 12 ? 2 : 1) === 0)
          .map((h, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="text-[10px] text-neutral-400 font-mono mb-1">{h.hour_label}</span>
              <div className="w-5 h-5 flex items-center justify-center text-orange-400">
                <ModernSunUvIcon size={12} />
              </div>
              <span className="text-[9px] font-mono text-orange-300 font-medium">
                {(h.uv ?? 0).toFixed(1)}
              </span>
            </div>
          ))}
      </div>

      {/* Stats footer bar */}
      <div className="mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400 font-mono">
        <div>
          Peak UV: <span className={`font-semibold ${peakCat.color}`}>UV {peakUvInHourly.toFixed(1)} ({peakCat.label})</span>
        </div>
        <div>
          Daylight Window: <span className="text-white">{daylightHoursCount} hours</span>
        </div>
        <div>
          Protection: <span className="text-white">{peakCat.advice}</span>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   GRAPH 5: RAIN ACCUMULATION GRAPH CARD
   ========================================================================= */
interface RainAccumulationGraphCardProps {
  hourlyData: HourlyForecast[];
  activeHourlyIndex: number;
  onSelectHour: (i: number) => void;
  config: ModuleConfig;
  totalRain24h: number;
  peakHourlyRain: number;
  maxPrecipProb: number;
  cumulativeRainArray: number[];
  onUserActivity: () => void;
}

const RainAccumulationGraphCard: React.FC<RainAccumulationGraphCardProps> = ({
  hourlyData,
  activeHourlyIndex,
  onSelectHour,
  config,
  totalRain24h,
  peakHourlyRain,
  maxPrecipProb,
  cumulativeRainArray,
  onUserActivity,
}) => {
  const activeHour = hourlyData[activeHourlyIndex] || hourlyData[0];
  const hourlyRain = activeHour.precip_accum ?? 0;
  const hourlyRainFormatted = formatPrecipitation(hourlyRain, config.units);
  const totalRainFormatted = formatPrecipitation(totalRain24h, config.units);
  const cumRainSoFar = cumulativeRainArray[activeHourlyIndex] ?? hourlyRain;
  const cumFormatted = formatPrecipitation(cumRainSoFar, config.units);

  const maxAccumScale = Math.max(config.units === 'imperial' ? 0.3 : 8, peakHourlyRain * 1.5, totalRain24h * 0.8);

  return (
    <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-4">
      {/* Subheader & Active Scrubber */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-neutral-800/60">
        <div>
          <div className="flex items-center gap-2 text-indigo-400">
            <ModernRainCloudIcon size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider font-sans">
              Hourly Rain Accumulation & Probability
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            24-hour liquid precipitation volume, cumulative buildup, and chance of rain
          </p>
        </div>

        {/* Scrubber Readout Badge */}
        <div className="flex items-center gap-2.5 bg-neutral-900/90 px-3 py-1.5 rounded-lg border border-neutral-800 font-mono text-xs">
          <span className="text-neutral-400">{activeHour.hour_label}</span>
          <span className="text-neutral-600">|</span>
          <span className="text-indigo-300 font-semibold text-sm">
            {hourlyRainFormatted.value} {hourlyRainFormatted.unit}
          </span>
          <span className="text-sky-400 font-medium">
            {activeHour.precip_probability ?? 0}% rain
          </span>
          <span className="text-neutral-400 text-[11px]">
            Cumul: {cumFormatted.value} {cumFormatted.unit}
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full h-44 sm:h-52 select-none touch-none">
        {/* Reference Grid */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-25 text-[10px] font-mono text-neutral-400">
          <div className="border-b border-neutral-700 w-full pb-0.5">
            {formatPrecipitation(maxAccumScale, config.units).value} {config.units === 'imperial' ? 'in' : 'mm'}
          </div>
          <div className="border-b border-neutral-700 w-full pb-0.5">
            {formatPrecipitation(maxAccumScale / 2, config.units).value} {config.units === 'imperial' ? 'in' : 'mm'}
          </div>
          <div className="border-b border-neutral-700 w-full pb-0.5">0</div>
        </div>

        <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rainBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="cumRainGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Cumulative Rain Area Curve */}
          {(() => {
            const pts = cumulativeRainArray.map((cum, i) => {
              const x = (i / Math.max(1, hourlyData.length - 1)) * 800;
              const y = 190 - (cum / maxAccumScale) * 170;
              return `${x},${Math.max(10, y)}`;
            });
            const areaD = `M 0,190 L ${pts.join(' L ')} L 800,190 Z`;
            const lineD = `M ${pts.join(' L ')}`;
            return (
              <>
                <path d={areaD} fill="url(#cumRainGradient)" />
                <path d={lineD} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="3 3" />
              </>
            );
          })()}

          {/* Hourly Rainfall Vertical Columns */}
          {hourlyData.map((h, i) => {
            const rain = h.precip_accum || 0;
            if (rain <= 0.01) return null;
            const barWidth = 800 / (hourlyData.length * 1.6);
            const x = (i / Math.max(1, hourlyData.length - 1)) * 800 - barWidth / 2;
            const barHeight = Math.min(175, (rain / maxAccumScale) * 175);
            const y = 190 - barHeight;

            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill="url(#rainBarGradient)"
              />
            );
          })}

          {/* Active Hover Cursor */}
          {(() => {
            const x = (activeHourlyIndex / Math.max(1, hourlyData.length - 1)) * 800;
            const yCum = 190 - (cumRainSoFar / maxAccumScale) * 170;
            return (
              <g>
                <line x1={x} y1={10} x2={x} y2={190} stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <circle cx={x} cy={Math.max(15, yCum)} r="5" fill="#818cf8" stroke="#000000" strokeWidth="2" />
              </g>
            );
          })()}
        </svg>

        {/* Touch zones */}
        <div className="absolute inset-0 flex">
          {hourlyData.map((_, i) => (
            <div
              key={i}
              onMouseEnter={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              onTouchMove={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              onClick={() => {
                onSelectHour(i);
                onUserActivity();
              }}
              className="flex-1 h-full cursor-crosshair"
            />
          ))}
        </div>
      </div>

      {/* Hour ticks with Rain Probability */}
      <div className="mt-3 pt-2 border-t border-neutral-800/80 grid grid-cols-8 sm:grid-cols-12 gap-1 text-center select-none">
        {hourlyData
          .filter((_, i) => i % (hourlyData.length > 12 ? 2 : 1) === 0)
          .map((h, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="text-[10px] text-neutral-400 font-mono mb-1">{h.hour_label}</span>
              <div className="w-5 h-5 flex items-center justify-center text-indigo-400">
                <ModernRainCloudIcon size={12} />
              </div>
              <span className="text-[9px] font-mono text-sky-400 font-medium">
                {h.precip_probability ?? 0}%
              </span>
            </div>
          ))}
      </div>

      {/* Stats footer bar */}
      <div className="mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400 font-mono">
        <div>
          24h Total: <span className="text-white font-semibold">{totalRainFormatted.value} {totalRainFormatted.unit}</span>
        </div>
        <div>
          Max Rain Chance: <span className="text-sky-400 font-medium">{maxPrecipProb}%</span>
        </div>
        <div>
          Legend: <span className="text-indigo-400">■ Hourly</span> <span className="text-indigo-300 ml-2">-- Cumulative</span>
        </div>
      </div>
    </div>
  );
};
