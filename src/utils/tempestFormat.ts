import { Units, PressureUnit, PressureTrend } from '../types/tempest.ts';

export function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fToC(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function msToMph(ms: number): number {
  return ms * 2.23694;
}

export function msToKmh(ms: number): number {
  return ms * 3.6;
}

export function mbToInHg(mb: number): number {
  return mb * 0.0295299830714;
}

export function mmToInches(mm: number): number {
  return mm * 0.0393701;
}

export function kmToMiles(km: number): number {
  return km * 0.621371;
}

export function degreesToCardinal(deg: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

export function formatTemp(c: number, units: Units, showUnit = true): string {
  if (isNaN(c) || c === null || c === undefined) return '--';
  const val = units === 'imperial' ? cToF(c) : c;
  const rounded = Math.round(val);
  return showUnit ? `${rounded}°` : `${rounded}`;
}

export function formatTempPrecise(c: number, units: Units): string {
  if (isNaN(c) || c === null || c === undefined) return '--';
  const val = units === 'imperial' ? cToF(c) : c;
  return `${val.toFixed(1)}°${units === 'imperial' ? 'F' : 'C'}`;
}

export function formatHumidity(rh: number): string {
  if (isNaN(rh) || rh === null || rh === undefined) return '--%';
  return `${Math.round(rh)}%`;
}

export function getHumidityComfort(humidity: number): { label: string; color: string; desc: string } {
  if (humidity < 30) return { label: 'Dry', color: 'text-amber-300', desc: 'Low moisture · Static risk' };
  if (humidity <= 60) return { label: 'Comfortable', color: 'text-emerald-400', desc: 'Ideal human comfort range' };
  if (humidity <= 75) return { label: 'Humid', color: 'text-sky-300', desc: 'Elevated atmospheric moisture' };
  return { label: 'Very Humid', color: 'text-indigo-300', desc: 'Muggy & tropical conditions' };
}

export function formatPressure(mb: number, pUnit: PressureUnit): { value: string; unit: string } {
  if (isNaN(mb) || mb === null || mb === undefined) return { value: '--', unit: pUnit };
  if (pUnit === 'inHg') {
    return {
      value: mbToInHg(mb).toFixed(2),
      unit: 'inHg',
    };
  } else if (pUnit === 'hPa') {
    return {
      value: mb.toFixed(1),
      unit: 'hPa',
    };
  } else {
    return {
      value: Math.round(mb).toString(),
      unit: 'mb',
    };
  }
}

export function formatWindSpeed(ms: number, units: Units): { value: string; unit: string } {
  if (isNaN(ms) || ms === null || ms === undefined) return { value: '--', unit: units === 'imperial' ? 'mph' : 'km/h' };
  if (units === 'imperial') {
    return {
      value: Math.round(msToMph(ms)).toString(),
      unit: 'mph',
    };
  }
  return {
    value: Math.round(msToKmh(ms)).toString(),
    unit: 'km/h',
  };
}

export function formatPrecipitation(mm: number, units: Units): { value: string; unit: string } {
  if (units === 'imperial') {
    return {
      value: mmToInches(mm).toFixed(2),
      unit: 'in',
    };
  }
  return {
    value: mm.toFixed(1),
    unit: 'mm',
  };
}

export function getTrendSymbol(trend: PressureTrend): string {
  switch (trend) {
    case 'rising':
      return '↗';
    case 'falling':
      return '↘';
    case 'steady':
    default:
      return '→';
  }
}

export function getTrendDescription(trend: PressureTrend): string {
  switch (trend) {
    case 'rising':
      return 'Rising';
    case 'falling':
      return 'Falling';
    case 'steady':
    default:
      return 'Steady';
  }
}

export function getUvCategory(uv: number): { label: string; color: string; advice: string } {
  if (uv <= 2) return { label: 'Low', color: 'text-emerald-400', advice: 'Minimal sun protection required' };
  if (uv <= 5) return { label: 'Moderate', color: 'text-amber-300', advice: 'Wear sunglasses & SPF on sunny days' };
  if (uv <= 7) return { label: 'High', color: 'text-orange-400', advice: 'Cover up, wear hat, sunglasses & SPF 30+' };
  if (uv <= 10) return { label: 'Very High', color: 'text-rose-400', advice: 'Extra protection: seek shade midday' };
  return { label: 'Extreme', color: 'text-purple-400', advice: 'Avoid sun exposure during peak hours' };
}

export function formatLightningDistance(km: number, units: Units): { value: string; unit: string } {
  if (isNaN(km) || km === null || km === undefined || km <= 0) {
    return { value: '0', unit: units === 'imperial' ? 'mi' : 'km' };
  }
  if (units === 'imperial') {
    const miles = kmToMiles(km);
    return {
      value: miles < 10 ? miles.toFixed(1) : Math.round(miles).toString(),
      unit: 'mi',
    };
  }
  return {
    value: km < 10 ? km.toFixed(1) : Math.round(km).toString(),
    unit: 'km',
  };
}

export interface LightningThreat {
  isNearby: boolean;
  level: 'none' | 'distant' | 'caution' | 'danger';
  label: string;
  sublabel: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}

export function getLightningThreat(
  count: number,
  distanceKm: number,
  units: Units = 'imperial'
): LightningThreat {
  if (!count || count <= 0 || !distanceKm || distanceKm <= 0) {
    return {
      isNearby: false,
      level: 'none',
      label: 'No Lightning Detected',
      sublabel: 'Station sensor clear',
      badgeBg: 'bg-neutral-800/40',
      badgeText: 'text-neutral-400',
      borderColor: 'border-neutral-800',
    };
  }

  const distFormatted = formatLightningDistance(distanceKm, units);

  // Severe / Danger: within 10 km (~6.2 miles)
  if (distanceKm <= 10) {
    return {
      isNearby: true,
      level: 'danger',
      label: 'Severe Lightning Alert',
      sublabel: `Strike ${distFormatted.value} ${distFormatted.unit} away (${count} ${count === 1 ? 'strike' : 'strikes'}) · Seek shelter indoors`,
      badgeBg: 'bg-rose-500/15',
      badgeText: 'text-rose-300',
      borderColor: 'border-rose-500/40',
    };
  }

  // Caution: within 25 km (~15.5 miles)
  if (distanceKm <= 25) {
    return {
      isNearby: true,
      level: 'caution',
      label: 'Lightning in Vicinity',
      sublabel: `Storm cell ${distFormatted.value} ${distFormatted.unit} away (${count} ${count === 1 ? 'strike' : 'strikes'})`,
      badgeBg: 'bg-amber-500/15',
      badgeText: 'text-amber-300',
      borderColor: 'border-amber-500/40',
    };
  }

  // Distant: within 45 km (~28 miles)
  if (distanceKm <= 45) {
    return {
      isNearby: true,
      level: 'distant',
      label: 'Distant Lightning Detected',
      sublabel: `Strikes ${distFormatted.value} ${distFormatted.unit} away (${count} recorded)`,
      badgeBg: 'bg-yellow-500/10',
      badgeText: 'text-yellow-400/90',
      borderColor: 'border-yellow-500/30',
    };
  }

  return {
    isNearby: false,
    level: 'none',
    label: 'Distant Activity Beyond Range',
    sublabel: 'Station sensor clear',
    badgeBg: 'bg-neutral-800/40',
    badgeText: 'text-neutral-400',
    borderColor: 'border-neutral-800',
  };
}
