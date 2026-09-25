import { TempestStationData, TempestObservation, DailyForecast, HourlyForecast, WeatherProvider, NoaaWeatherAlert, NoaaAlertLevel } from '../types/tempest.ts';
import { degreesToCardinal } from './tempestFormat.ts';
import { generateForecastDaily, generateForecastHourly, generateNoaaForecastDaily } from './mockStations.ts';

export async function fetchLiveTempestData(
  stationId: string,
  token: string,
  weatherProvider: WeatherProvider = 'tempest',
  customLat?: number,
  customLon?: number,
  checkNoaaAlerts: boolean = true
): Promise<TempestStationData> {
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
  let forecastSource: WeatherProvider = 'tempest';

  // Determine geographic coordinates (for NOAA forecast and NOAA active statements/alerts)
  let lat: number | null = typeof customLat === 'number' && !isNaN(customLat) ? customLat : null;
  let lon: number | null = typeof customLon === 'number' && !isNaN(customLon) ? customLon : null;

  if (lat === null || lon === null) {
    if (typeof forecastData?.latitude === 'number' && typeof forecastData?.longitude === 'number') {
      lat = forecastData.latitude;
      lon = forecastData.longitude;
    } else {
      try {
        const stRes = await fetch(`https://swd.weatherflow.com/swd/rest/stations/${cleanStationId}?token=${cleanToken}`);
        if (stRes.ok) {
          const stData = await stRes.json();
          const stationObj = stData?.stations?.[0];
          if (stationObj && typeof stationObj.latitude === 'number' && typeof stationObj.longitude === 'number') {
            lat = stationObj.latitude;
            lon = stationObj.longitude;
          }
        }
      } catch {
        // ignore metadata error
      }
    }
  }

  // 1. NOAA 7-Day Forecast if requested
  const isNoaa = String(weatherProvider).toUpperCase() === 'NOAA';

  if (isNoaa && lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
    try {
      const noaaRes = await fetch(`/api/noaa/forecast?lat=${lat}&lon=${lon}`);
      if (noaaRes.ok) {
        const noaaData = await noaaRes.json();
        const parsedDaily = parseNoaaForecastPeriods(noaaData);
        if (parsedDaily.length > 0) {
          daily = parsedDaily;
          forecastSource = 'NOAA';
        }
      }
    } catch (noaaErr) {
      console.warn('Could not fetch NOAA forecast, falling back to Tempest forecast', noaaErr);
    }
  }

  // 2. NOAA Active Weather Statements, Watches, Advisories, Warnings
  let noaaAlerts: NoaaWeatherAlert[] = [];
  if (checkNoaaAlerts && lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
    try {
      const alertsRes = await fetch(`/api/noaa/alerts?lat=${lat}&lon=${lon}`);
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        noaaAlerts = parseNoaaAlerts(alertsData);
      }
    } catch (alertsErr) {
      console.warn('Could not fetch NOAA active alerts:', alertsErr);
    }
  }

  // Fallback to Tempest forecast if daily is still empty
  if (daily.length === 0) {
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
      forecastSource = 'tempest';
    } else {
      daily = isNoaa ? generateNoaaForecastDaily(airTemp, stationId) : generateForecastDaily(airTemp, stationId);
      forecastSource = isNoaa ? 'NOAA' : 'tempest';
    }
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
    forecast_source: forecastSource,
    noaa_alerts: noaaAlerts,
    active_alert: noaaAlerts.length > 0 ? noaaAlerts[0] : null,
    is_live: true,
    error: null,
  };
}

export function parseNoaaAlerts(alertsData: any): NoaaWeatherAlert[] {
  const features = alertsData?.features || [];
  if (!Array.isArray(features) || features.length === 0) return [];

  const parsed: NoaaWeatherAlert[] = features.map((f: any) => {
    const p = f.properties || {};
    const event = (p.event || 'Special Weather Statement').trim();
    const lower = event.toLowerCase();

    let level: NoaaAlertLevel = 'statement';
    let color: 'red' | 'orange' | 'yellow' = 'yellow';
    let priority = 0;

    if (lower.includes('warning')) {
      level = 'warning';
      color = 'red';
      priority = 3;
    } else if (lower.includes('advisory')) {
      level = 'advisory';
      color = 'orange';
      priority = 2;
    } else if (lower.includes('watch')) {
      level = 'watch';
      color = 'yellow';
      priority = 1;
    } else {
      level = 'statement';
      color = 'yellow';
      priority = 0;
    }

    return {
      event,
      headline: p.headline || event,
      description: p.description || '',
      instruction: p.instruction || '',
      severity: p.severity || 'Unknown',
      urgency: p.urgency || 'Unknown',
      certainty: p.certainty || 'Unknown',
      effective: p.effective || '',
      expires: p.expires || '',
      level,
      color,
      priority,
    };
  });

  parsed.sort((a, b) => b.priority - a.priority);
  return parsed;
}

export function parseNoaaForecastPeriods(noaaData: any): DailyForecast[] {
  const periods = noaaData?.properties?.periods || [];
  if (!periods.length) return [];

  const daysMap = new Map<string, { dateKey: string; daytime: any; nighttime: any; periods: any[] }>();
  const daysOrder: string[] = [];

  for (const p of periods) {
    const dateKey = (p.startTime || '').split('T')[0];
    if (!dateKey) continue;

    if (!daysMap.has(dateKey)) {
      if (daysOrder.length >= 7) continue;
      daysOrder.push(dateKey);
      daysMap.set(dateKey, { dateKey, daytime: null, nighttime: null, periods: [] });
    }
    const entry = daysMap.get(dateKey)!;
    entry.periods.push(p);
    if (p.isDaytime) {
      entry.daytime = p;
    } else {
      entry.nighttime = p;
    }
  }

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return daysOrder.map((dateKey, index) => {
    const entry = daysMap.get(dateKey)!;
    const dayPeriod = entry.daytime;
    const nightPeriod = entry.nighttime;
    const primaryPeriod = dayPeriod || nightPeriod || entry.periods[0];

    const d = new Date(primaryPeriod.startTime);
    const dayName = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : weekdayNames[d.getDay()];
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;

    const toCelsius = (temp: any, unit: string) => {
      const num = typeof temp === 'number' ? temp : parseFloat(temp);
      if (isNaN(num)) return 20;
      return unit === 'C' ? num : (num - 32) * (5 / 9);
    };

    let highC = dayPeriod ? toCelsius(dayPeriod.temperature, dayPeriod.temperatureUnit) : null;
    let lowC = nightPeriod ? toCelsius(nightPeriod.temperature, nightPeriod.temperatureUnit) : null;

    if (highC === null && lowC !== null) {
      highC = lowC + 4;
    } else if (lowC === null && highC !== null) {
      lowC = highC - 5;
    } else if (highC === null && lowC === null) {
      highC = 20;
      lowC = 12;
    }

    if (lowC > highC) {
      const tmp = highC;
      highC = lowC;
      lowC = tmp;
    }

    const conditions = (dayPeriod?.shortForecast || nightPeriod?.shortForecast || 'Clear').trim();
    const icon = mapNoaaIcon(dayPeriod?.icon || nightPeriod?.icon, conditions, !dayPeriod);

    const precipProb = Math.max(
      dayPeriod?.probabilityOfPrecipitation?.value || 0,
      nightPeriod?.probabilityOfPrecipitation?.value || 0
    );

    const windSpeedStr = dayPeriod?.windSpeed || nightPeriod?.windSpeed || '5 mph';
    const windMatches = windSpeedStr.match(/\d+/g);
    let windMph = 5;
    if (windMatches && windMatches.length > 0) {
      const nums = windMatches.map(Number);
      windMph = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
    }
    const windAvgMs = windMph * 0.44704;

    const windDir = dayPeriod?.windDirection || nightPeriod?.windDirection || 'W';

    return {
      day_start_local: Math.floor(d.getTime() / 1000),
      day_name: dayName,
      date_label: dateLabel,
      conditions,
      icon,
      air_temp_high: Number(highC.toFixed(1)),
      air_temp_low: Number(lowC.toFixed(1)),
      precip_probability: precipProb,
      wind_avg: Number(windAvgMs.toFixed(1)),
      wind_direction_cardinal: windDir,
      uv: 5,
    };
  });
}

export function mapNoaaIcon(iconUrl: string, conditions: string, isNight = false): string {
  const text = ((iconUrl || '') + ' ' + (conditions || '')).toLowerCase();
  const night = isNight || text.includes('/night/') || text.includes('night') || text.includes('moon');

  if (text.includes('tsra') || text.includes('thunder') || text.includes('lightning') || text.includes('tstorm')) {
    return 'thunderstorm';
  }
  if (text.includes('snow') || text.includes('flurries') || text.includes('blizzard') || text.includes('sleet')) {
    return 'snow';
  }
  if (text.includes('rain') || text.includes('shower') || text.includes('drizzle')) {
    return night ? 'rain-night' : 'rain';
  }
  if (text.includes('fog') || text.includes('mist') || text.includes('haze') || text.includes('smoke')) {
    return 'fog';
  }
  if (text.includes('wind') || text.includes('breezy')) {
    return 'windy';
  }
  if (text.includes('bkn') || text.includes('ovc') || text.includes('cloud') || text.includes('overcast')) {
    return night ? 'cloudy-night' : 'cloudy';
  }
  if (text.includes('sct') || text.includes('few') || text.includes('partly')) {
    return night ? 'partly-cloudy-night' : 'partly-cloudy';
  }
  if (text.includes('skc') || text.includes('clear') || text.includes('sunny')) {
    return night ? 'clear-night' : 'clear';
  }
  return night ? 'clear-night' : 'partly-cloudy';
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
