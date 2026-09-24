import { TempestStationData, TempestObservation, DailyForecast, HourlyForecast } from '../types/tempest.ts';
import { degreesToCardinal } from './tempestFormat.ts';
import { generateForecastDaily, generateForecastHourly } from './mockStations.ts';

export async function fetchLiveTempestData(stationId: string, token: string): Promise<TempestStationData> {
  if (!stationId || !token) {
    throw new Error('Station ID and Tempest Personal Access Token are required.');
  }

  // First try server proxy route (Node.js built-in API call), fall back to direct swd.weatherflow.com
  const cleanStationId = String(stationId || '').trim();
  const cleanToken = String(token || '').trim();

  let obsData: any = null;
  let forecastData: any = null;

  try {
    const obsRes = await fetch(`/api/tempest/observations/${cleanStationId}?token=${cleanToken}`);
    if (obsRes.ok) {
      obsData = await obsRes.json();
    } else {
      // direct browser fallback
      const directObs = await fetch(`https://swd.weatherflow.com/swd/rest/observations/station/${cleanStationId}?token=${cleanToken}`);
      if (!directObs.ok) throw new Error(`WeatherFlow API error: ${directObs.statusText}`);
      obsData = await directObs.json();
    }
  } catch (err: any) {
    // direct fetch attempt
    const directObs = await fetch(`https://swd.weatherflow.com/swd/rest/observations/station/${cleanStationId}?token=${cleanToken}`);
    if (!directObs.ok) throw new Error(`Could not reach Tempest Station ${cleanStationId}: ${err.message || directObs.statusText}`);
    obsData = await directObs.json();
  }

  try {
    const fcRes = await fetch(`/api/tempest/forecast/${cleanStationId}?token=${cleanToken}`);
    if (fcRes.ok) {
      forecastData = await fcRes.json();
    } else {
      const directFc = await fetch(`https://swd.weatherflow.com/swd/rest/better_forecast?station_id=${cleanStationId}&token=${cleanToken}`);
      if (directFc.ok) {
        forecastData = await directFc.json();
      }
    }
  } catch (err) {
    console.warn('Forecast endpoint unreachable, synthesizing forecast from current observation', err);
  }

  // Parse raw Tempest observation (array of objects for station, or array of arrays for device)
  const rawObs = obsData?.obs?.[0] || obsData?.obs || obsData;
  if (!rawObs && !obsData?.station_id) {
    throw new Error('No observations available from station. Please check your Station ID and Token.');
  }

  const isArr = Array.isArray(rawObs);
  const airTemp = isArr
    ? (rawObs[7] ?? obsData.air_temperature ?? 20)
    : (rawObs?.air_temperature ?? rawObs?.air_temp ?? forecastData?.current_conditions?.air_temperature ?? obsData.air_temperature ?? 20);
  const relHum = isArr
    ? (rawObs[8] ?? obsData.relative_humidity ?? 50)
    : (rawObs?.relative_humidity ?? rawObs?.rh ?? forecastData?.current_conditions?.relative_humidity ?? obsData.relative_humidity ?? 50);
  const pressure = isArr
    ? (rawObs[6] ?? obsData.barometric_pressure ?? 1013.25)
    : (rawObs?.barometric_pressure ?? rawObs?.station_pressure ?? rawObs?.sea_level_pressure ?? forecastData?.current_conditions?.station_pressure ?? obsData.barometric_pressure ?? 1013.25);
  const windAvg = isArr
    ? (rawObs[2] ?? obsData.wind_avg ?? 2.5)
    : (rawObs?.wind_avg ?? rawObs?.wind_speed ?? forecastData?.current_conditions?.wind_avg ?? obsData.wind_avg ?? 2.5);
  const windGust = isArr
    ? (rawObs[3] ?? obsData.wind_gust ?? 4.0)
    : (rawObs?.wind_gust ?? forecastData?.current_conditions?.wind_gust ?? obsData.wind_gust ?? windAvg);
  const windDeg = isArr
    ? (rawObs[4] ?? obsData.wind_direction ?? 180)
    : (rawObs?.wind_direction ?? rawObs?.wind_dir ?? forecastData?.current_conditions?.wind_direction ?? obsData.wind_direction ?? 180);

  // UV Index from observation
  let uv = 0;
  if (isArr && rawObs[10] !== undefined && rawObs[10] !== null) {
    uv = Number(rawObs[10]);
  } else if (!isArr && rawObs?.uv !== undefined && rawObs?.uv !== null) {
    uv = Number(rawObs.uv);
  } else if (obsData?.uv !== undefined && obsData?.uv !== null) {
    uv = Number(obsData.uv);
  } else if (forecastData?.current_conditions?.uv !== undefined && forecastData?.current_conditions?.uv !== null) {
    uv = Number(forecastData.current_conditions.uv);
  }
  uv = isNaN(uv) || uv < 0 ? 0 : Number(uv.toFixed(1));

  const solar = isArr
    ? (rawObs[11] ?? 0)
    : (rawObs?.solar_radiation ?? obsData.solar_radiation ?? forecastData?.current_conditions?.solar_radiation ?? 0);
  const rainAccum = isArr
    ? (rawObs[12] ?? 0)
    : (rawObs?.precip_accum_local_day ?? rawObs?.precip ?? obsData.precip_accum_local_day ?? 0);

  // Lightning strikes count and distance in km
  let lightningCount = 0;
  if (isArr && rawObs[15] !== undefined && rawObs[15] !== null) {
    lightningCount = Number(rawObs[15]);
  } else if (!isArr && rawObs?.lightning_strike_count !== undefined && rawObs?.lightning_strike_count !== null) {
    lightningCount = Number(rawObs.lightning_strike_count);
  } else if (obsData?.lightning_strike_count !== undefined && obsData?.lightning_strike_count !== null) {
    lightningCount = Number(obsData.lightning_strike_count);
  } else if (forecastData?.current_conditions?.lightning_strike_count !== undefined) {
    lightningCount = Number(forecastData.current_conditions.lightning_strike_count);
  }
  lightningCount = isNaN(lightningCount) || lightningCount < 0 ? 0 : Math.round(lightningCount);

  let lightningDist = 0;
  if (rawObs && rawObs[14] !== undefined && rawObs[14] !== null) {
    lightningDist = Number(rawObs[14]);
  } else if (obsData?.lightning_strike_last_distance !== undefined && obsData?.lightning_strike_last_distance !== null) {
    lightningDist = Number(obsData.lightning_strike_last_distance);
  } else if (obsData?.lightning_strike_avg_distance !== undefined && obsData?.lightning_strike_avg_distance !== null) {
    lightningDist = Number(obsData.lightning_strike_avg_distance);
  } else if (forecastData?.current_conditions?.lightning_strike_last_distance !== undefined) {
    lightningDist = Number(forecastData.current_conditions.lightning_strike_last_distance);
  }
  lightningDist = isNaN(lightningDist) || lightningDist < 0 ? 0 : Number(lightningDist.toFixed(1));

  // If no strikes have occurred, reset distance to 0 to prevent stale warning labels
  if (lightningCount === 0) {
    lightningDist = 0;
  }

  const battery = rawObs ? (rawObs[16] ?? 2.78) : (obsData.battery ?? 2.78);

  // Dew point calculation: Td = T - ((100 - RH)/5)
  const dewPoint = airTemp - ((100 - relHum) / 5);
  const feelsLike = forecastData?.current_conditions?.feels_like ?? airTemp;

  const observation: TempestObservation = {
    timestamp: Date.now(),
    station_id: stationId,
    station_name: obsData.station_name || `Tempest Station #${stationId}`,
    air_temperature: airTemp,
    relative_humidity: relHum,
    barometric_pressure: pressure,
    sea_level_pressure: forecastData?.current_conditions?.sea_level_pressure ?? pressure + 1.2,
    pressure_trend: 'steady',
    pressure_trend_delta: 0.02,
    wind_avg: windAvg,
    wind_gust: windGust,
    wind_direction: windDeg,
    wind_direction_cardinal: degreesToCardinal(windDeg),
    solar_radiation: solar,
    uv,
    precip_rate: 0,
    precip_accum_local_day: rainAccum,
    lightning_strike_count: lightningCount,
    lightning_strike_last_distance: lightningDist,
    battery,
    feels_like: feelsLike,
    dew_point: Number(dewPoint.toFixed(1)),
    conditions: forecastData?.current_conditions?.conditions || forecastData?.forecast?.daily?.[0]?.conditions || 'Clear',
    icon: mapWeatherFlowIcon(
      forecastData?.current_conditions?.icon || forecastData?.forecast?.daily?.[0]?.icon || 'clear',
      (solar === 0 && uv === 0 && (new Date().getHours() >= 18 || new Date().getHours() < 7)) || (new Date().getHours() < 6 || new Date().getHours() >= 20)
    ),
  };

  let daily: DailyForecast[] = [];
  if (forecastData?.forecast?.daily?.length) {
    daily = forecastData.forecast.daily.slice(0, 7).map((d: any, idx: number) => {
      const date = new Date(d.day_start_local * 1000);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const highTemp = d.air_temp_high ?? d.air_temperature_high ?? d.high_temp ?? d.temp_high ?? 20;
      const lowTemp = d.air_temp_low ?? d.air_temperature_low ?? d.low_temp ?? d.temp_low ?? 10;
      return {
        day_start_local: d.day_start_local,
        day_name: idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : days[date.getDay()],
        date_label: `${date.getMonth() + 1}/${date.getDate()}`,
        conditions: d.conditions || 'Partly Cloudy',
        icon: mapWeatherFlowIcon(d.icon),
        air_temp_high: Number(highTemp),
        air_temp_low: Number(lowTemp),
        precip_probability: d.precip_probability ?? 0,
        wind_avg: d.wind_avg ?? 3,
        wind_direction_cardinal: d.wind_direction_cardinal || 'W',
        uv: d.uv ?? 5,
      };
    });
  } else {
    daily = generateForecastDaily(airTemp, stationId);
  }

  let hourly: HourlyForecast[] = [];
  if (forecastData?.forecast?.hourly?.length) {
    hourly = forecastData.forecast.hourly.slice(0, 24).map((h: any) => {
      const d = new Date(h.time * 1000);
      const hours = d.getHours();
      const isNightHour = hours < 6 || hours >= 20;
      const hourLabel = hours === 0 ? '12 AM' : hours === 12 ? '12 PM' : hours > 12 ? `${hours - 12} PM` : `${hours} AM`;
      // WeatherFlow better_forecast API uses 'air_temperature' for hourly objects
      const rawHourTemp = h.air_temperature ?? h.air_temp ?? h.temp ?? 20;
      const rawFeelsLike = h.feels_like ?? rawHourTemp;
      return {
        time: h.time,
        hour_label: hourLabel,
        conditions: h.conditions || (isNightHour ? 'Clear Night' : 'Clear'),
        icon: mapWeatherFlowIcon(h.icon, isNightHour),
        air_temp: Number(rawHourTemp),
        feels_like: Number(rawFeelsLike),
        relative_humidity: Number(h.relative_humidity ?? 50),
        wind_avg: Number(h.wind_avg ?? 0),
        wind_gust: Number(h.wind_gust ?? h.wind_avg ?? 0),
        wind_direction: Number(h.wind_direction ?? 0),
        wind_direction_cardinal: h.wind_direction_cardinal || degreesToCardinal(h.wind_direction ?? 0),
        uv: Number(h.uv ?? 0),
        precip_accum: Number(h.precip ?? h.precip_accum ?? 0),
        precip_probability: Number(h.precip_probability ?? 0),
      };
    });
  } else {
    hourly = generateForecastHourly(windAvg, airTemp);
  }

  return {
    station_id: stationId,
    station_name: obsData.station_name || `Tempest Station #${stationId}`,
    last_updated: Date.now(),
    observation,
    forecast_daily: daily,
    forecast_hourly: hourly,
    is_live: true,
    error: null,
  };
}

function mapWeatherFlowIcon(iconStr: string, isNight = false): string {
  if (!iconStr) return isNight ? 'clear-night' : 'partly-cloudy';
  const s = iconStr.toLowerCase();
  const night = isNight || s.includes('night') || s.includes('moon');
  if (s.includes('thunder') || s.includes('lightning')) return 'thunderstorm';
  if (s.includes('rain') || s.includes('shower') || s.includes('drizzle')) return night ? 'rain-night' : 'rain';
  if (s.includes('snow') || s.includes('flurries') || s.includes('blizzard')) return 'snow';
  if (s.includes('wind')) return 'windy';
  if (s.includes('fog') || s.includes('haze') || s.includes('mist')) return 'fog';
  if (s.includes('cloudy') || s.includes('overcast')) return night ? 'cloudy-night' : 'cloudy';
  if (s.includes('partly') || s.includes('scattered')) return night ? 'partly-cloudy-night' : 'partly-cloudy';
  if (s.includes('clear') || s.includes('sunny')) return night ? 'clear-night' : 'clear';
  return night ? 'clear-night' : 'partly-cloudy';
}
