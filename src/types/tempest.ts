export type Units = 'imperial' | 'metric';
export type PressureUnit = 'inHg' | 'hPa' | 'mb';
export type PressureTrend = 'rising' | 'falling' | 'steady';
export type MirrorPosition = 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'middle_center';
export type WeatherProvider = 'tempest' | 'NOAA';

export interface TempestObservation {
  timestamp: number;
  station_id: string;
  station_name: string;
  air_temperature: number; // Raw Celsius
  relative_humidity: number; // %
  barometric_pressure: number; // Raw MB/hPa
  sea_level_pressure?: number; // Raw MB/hPa
  pressure_trend: PressureTrend;
  pressure_trend_delta: number; // delta in 3hr in current pressure unit
  wind_avg: number; // Raw m/s
  wind_gust: number; // Raw m/s
  wind_direction: number; // degrees 0-360
  wind_direction_cardinal: string; // N, NNE, NE, etc.
  solar_radiation: number; // W/m^2
  uv: number; // index
  precip_rate: number; // Raw mm/hr
  precip_accum_local_day: number; // Raw mm
  lightning_strike_count: number;
  lightning_strike_last_distance: number; // Raw km
  battery: number; // Volts
  feels_like: number; // Raw Celsius
  dew_point: number; // Raw Celsius
  conditions?: string; // Current conditions description (e.g., 'Partly Cloudy')
  icon?: string; // Icon identifier (e.g., 'partly-cloudy')
}

export interface DailyForecast {
  day_start_local: number;
  day_name: string;
  date_label: string;
  conditions: string;
  icon: string;
  air_temp_high: number; // Raw Celsius
  air_temp_low: number; // Raw Celsius
  precip_probability: number; // 0-100 %
  wind_avg: number; // Raw m/s
  wind_direction_cardinal: string;
  uv: number;
}

export interface HourlyForecast {
  time: number;
  hour_label: string;
  conditions: string;
  icon: string;
  air_temp: number; // Raw Celsius
  feels_like?: number; // Raw Celsius
  relative_humidity: number; // %
  wind_avg: number; // Raw m/s
  wind_gust: number; // Raw m/s
  wind_direction: number; // degrees
  wind_direction_cardinal: string;
  uv: number; // UV Index
  precip_accum: number; // Raw mm
  precip_probability: number; // %
}

export interface TempestStationData {
  station_id: string;
  station_name: string;
  last_updated: number;
  observation: TempestObservation;
  forecast_daily: DailyForecast[];
  forecast_hourly: HourlyForecast[];
  forecast_source?: WeatherProvider;
  is_live: boolean;
  error?: string | null;
}

export interface ModuleConfig {
  stationId: string;
  token: string;
  weatherProvider?: WeatherProvider; // 'tempest' (default) or 'NOAA'
  latitude?: number;                 // optional coordinate override for NOAA
  longitude?: number;                // optional coordinate override for NOAA
  units: Units;
  pressureUnit: PressureUnit;
  updateIntervalSeconds: number;
  showModalOnTouch: boolean;
  autoCloseModalSeconds: number;
  showDewPoint: boolean;
  showFeelsLike: boolean;
  showTrendArrows: boolean;
  compactMode: boolean;
  mirrorPosition: MirrorPosition;
  theme: 'native-mirror' | 'ambient-glass';
}
