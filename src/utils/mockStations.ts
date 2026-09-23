import { TempestStationData, DailyForecast, HourlyForecast, TempestObservation } from '../types/tempest.ts';
import { degreesToCardinal } from './tempestFormat.ts';

export interface StationPreset {
  id: string;
  name: string;
  location: string;
  tempC: number;
  humidity: number;
  pressureMb: number;
  windMs: number;
  gustMs: number;
  windDeg: number;
  condition: string;
  conditionIcon: string;
  rainMm: number;
  uv: number;
  solar: number;
  lightningCount?: number;
  lightningDistanceKm?: number;
}

export const STATION_PRESETS: StationPreset[] = [
  {
    id: 'tempest-summit-01',
    name: 'Summit Ridge Weather Station',
    location: 'Mount Washington Foothills, NH',
    tempC: 13.8, // ~57°F
    humidity: 58,
    pressureMb: 1012.4, // ~29.89 inHg
    windMs: 6.8, // ~15.2 mph
    gustMs: 10.5, // ~23.5 mph
    windDeg: 310,
    condition: 'Partly Cloudy',
    conditionIcon: 'partly-cloudy',
    rainMm: 0.0,
    uv: 4.2, // Moderate UV
    solar: 540,
    lightningCount: 0,
    lightningDistanceKm: 0,
  },
  {
    id: 'tempest-coastal-02',
    name: 'Cape Hatteras Maritime Station',
    location: 'Outer Banks, NC',
    tempC: 24.5, // ~76°F
    humidity: 84,
    pressureMb: 1018.6, // ~30.08 inHg
    windMs: 8.2, // ~18.3 mph
    gustMs: 13.1, // ~29.3 mph
    windDeg: 145,
    condition: 'Breezy & Humid',
    conditionIcon: 'windy',
    rainMm: 1.8,
    uv: 6.8, // High UV
    solar: 780,
    lightningCount: 2,
    lightningDistanceKm: 18.5, // Vicinity caution
  },
  {
    id: 'tempest-valley-03',
    name: 'Highland Valley Orchard',
    location: 'Sonoma County, CA',
    tempC: 21.0, // ~70°F
    humidity: 42,
    pressureMb: 1016.2, // ~30.01 inHg
    windMs: 3.1, // ~6.9 mph
    gustMs: 5.4, // ~12.1 mph
    windDeg: 260,
    condition: 'Clear Sky',
    conditionIcon: 'clear',
    rainMm: 0.0,
    uv: 5.5,
    solar: 890,
    lightningCount: 0,
    lightningDistanceKm: 0,
  },
  {
    id: 'tempest-desert-05',
    name: 'Sonoran Desert Solar Research',
    location: 'Tucson Basin, AZ',
    tempC: 34.2, // ~94°F
    humidity: 18,
    pressureMb: 1010.5,
    windMs: 4.2,
    gustMs: 7.0,
    windDeg: 230,
    condition: 'Intense Sunlight',
    conditionIcon: 'clear',
    rainMm: 0.0,
    uv: 9.8, // Very High / Extreme UV
    solar: 1040,
    lightningCount: 0,
    lightningDistanceKm: 0,
  },
  {
    id: 'tempest-storm-04',
    name: 'Midwest Plains Tempest Node',
    location: 'Cedar Rapids, IA',
    tempC: 18.2, // ~65°F
    humidity: 91,
    pressureMb: 998.4, // Low pressure thunderstorm system
    windMs: 9.8, // ~22 mph
    gustMs: 16.5, // ~37 mph
    windDeg: 215,
    condition: 'Passing Thunderstorm',
    conditionIcon: 'thunderstorm',
    rainMm: 14.2,
    uv: 1.4,
    solar: 120,
    lightningCount: 14,
    lightningDistanceKm: 3.4, // Severe nearby lightning
  },
];

export function generateForecastDaily(baseTempC: number, presetId: string): DailyForecast[] {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const result: DailyForecast[] = [];

  const iconsByDay = ['partly-cloudy', 'clear', 'rain', 'partly-cloudy', 'cloudy', 'clear', 'windy'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : days[d.getDay()].slice(0, 3);
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;

    // slight temperature variation pattern
    const tempDelta = Math.sin(i * 0.9) * 4;
    const high = baseTempC + tempDelta + (i === 0 ? 2 : 3);
    const low = baseTempC + tempDelta - 4.5;
    const isStorm = presetId === 'tempest-storm-04';
    const rainProb = isStorm && i === 0 ? 85 : Math.max(5, Math.round(Math.abs(Math.sin((i + 2) * 1.3)) * 60));

    result.push({
      day_start_local: Math.floor(d.getTime() / 1000),
      day_name: dayName,
      date_label: dateLabel,
      conditions: rainProb > 50 ? 'Showers' : rainProb > 30 ? 'Scattered Clouds' : 'Mostly Sunny',
      icon: rainProb > 50 ? 'rain' : iconsByDay[i % iconsByDay.length],
      air_temp_high: Number(high.toFixed(1)),
      air_temp_low: Number(low.toFixed(1)),
      precip_probability: rainProb,
      wind_avg: Number((3.5 + Math.abs(Math.cos(i)) * 4).toFixed(1)),
      wind_direction_cardinal: degreesToCardinal((240 + i * 25) % 360),
      uv: Math.min(10, Math.max(1, Math.round(5 + Math.sin(i) * 3))),
    });
  }

  return result;
}

export function generateForecastHourly(baseWindMs: number, baseTempC: number): HourlyForecast[] {
  const result: HourlyForecast[] = [];
  const now = new Date();

  for (let h = 0; h < 24; h++) {
    const d = new Date(now.getTime() + h * 3600 * 1000);
    const hour24 = d.getHours();
    const hourLabel = hour24 === 0 ? '12 AM' : hour24 === 12 ? '12 PM' : hour24 > 12 ? `${hour24 - 12} PM` : `${hour24} AM`;

    // Diurnal wind and temp curves
    const diurnalFactor = Math.sin(((hour24 - 8) / 24) * Math.PI * 2);
    const temp = baseTempC + diurnalFactor * 3.5;
    const feelsLike = temp + (baseWindMs > 5 ? -1.0 : 0.8) + (diurnalFactor > 0.5 ? 1.2 : 0);
    const windAvg = Math.max(1.0, baseWindMs + diurnalFactor * 2.2 + Math.sin(h * 0.7) * 1.5);
    const windGust = windAvg + 2.5 + Math.abs(Math.cos(h * 0.5)) * 3.2;
    const windDeg = (270 + Math.sin(h * 0.4) * 50 + 360) % 360;

    // Relative humidity: drops as temperature peaks, rises in cooler hours
    const humidity = Math.min(96, Math.max(28, Math.round(62 - diurnalFactor * 24 + Math.sin(h * 0.4) * 6)));

    // UV Index: 0 during night, bell curve between 6:00 and 19:00 peaking ~7-9
    let uv = 0;
    if (hour24 >= 6 && hour24 <= 19) {
      const sunRatio = Math.sin(((hour24 - 6) / 13) * Math.PI);
      uv = Number(Math.max(0, sunRatio * 7.8).toFixed(1));
    }

    // Rain probability and hourly precipitation accumulation (mm)
    const precipProb = Math.round(Math.max(0, Math.min(85, (diurnalFactor < -0.3 ? 40 : 12) + Math.sin(h) * 15)));
    let precipAccum = 0;
    if (precipProb > 30) {
      precipAccum = Number((Math.max(0, (precipProb - 30) / 25) * 1.4).toFixed(2));
    }

    result.push({
      time: Math.floor(d.getTime() / 1000),
      hour_label: hourLabel,
      conditions: precipAccum > 1.0 ? 'Rain' : diurnalFactor > 0 ? 'Clear' : 'Overcast',
      icon: precipAccum > 1.0 ? 'rain' : diurnalFactor > 0 ? 'clear' : 'partly-cloudy',
      air_temp: Number(temp.toFixed(1)),
      feels_like: Number(feelsLike.toFixed(1)),
      relative_humidity: humidity,
      wind_avg: Number(windAvg.toFixed(1)),
      wind_gust: Number(windGust.toFixed(1)),
      wind_direction: Math.round(windDeg),
      wind_direction_cardinal: degreesToCardinal(windDeg),
      uv,
      precip_accum: precipAccum,
      precip_probability: precipProb,
    });
  }

  return result;
}

export function getPresetStationData(preset: StationPreset): TempestStationData {
  const dewPoint = preset.tempC - ((100 - preset.humidity) / 5);
  // Pressure trend: positive or negative
  const trend = preset.pressureMb < 1005 ? 'falling' : preset.pressureMb > 1020 ? 'rising' : 'steady';
  const delta = trend === 'falling' ? -0.06 : trend === 'rising' ? 0.04 : 0.01;

  const observation: TempestObservation = {
    timestamp: Date.now(),
    station_id: preset.id,
    station_name: preset.name,
    air_temperature: preset.tempC,
    relative_humidity: preset.humidity,
    barometric_pressure: preset.pressureMb,
    sea_level_pressure: preset.pressureMb + 1.2,
    pressure_trend: trend,
    pressure_trend_delta: delta,
    wind_avg: preset.windMs,
    wind_gust: preset.gustMs,
    wind_direction: preset.windDeg,
    wind_direction_cardinal: degreesToCardinal(preset.windDeg),
    solar_radiation: preset.solar,
    uv: preset.uv,
    precip_rate: preset.rainMm > 0 ? 1.2 : 0.0,
    precip_accum_local_day: preset.rainMm,
    lightning_strike_count: preset.lightningCount ?? (preset.id === 'tempest-storm-04' ? 14 : 0),
    lightning_strike_last_distance: preset.lightningDistanceKm ?? (preset.id === 'tempest-storm-04' ? 3.4 : 0),
    battery: 2.81, // Healthy Tempest supercapacitor voltage (2.4-2.8V)
    feels_like: preset.tempC + (preset.windMs > 5 ? -1.2 : 0.8),
    dew_point: Number(dewPoint.toFixed(1)),
  };

  return {
    station_id: preset.id,
    station_name: preset.name,
    last_updated: Date.now(),
    observation,
    forecast_daily: generateForecastDaily(preset.tempC, preset.id),
    forecast_hourly: generateForecastHourly(preset.windMs, preset.tempC),
    is_live: false,
    error: null,
  };
}
