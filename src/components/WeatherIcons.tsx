import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Modern minimalist thermometer icon matching native MagicMirror style
 */
export const ModernThermometerIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Outer stem and bulb */}
    <path d="M14 14.76V3.5a2 2 0 0 0-4 0v11.26a4.5 4.5 0 1 0 4 0z" />
    {/* Inner mercury level */}
    <path d="M12 9v5" strokeWidth="2" />
    <circle cx="12" cy="17" r="1.75" fill="currentColor" stroke="none" />
    {/* Subtle calibration notches */}
    <line x1="10" y1="5.5" x2="8.5" y2="5.5" strokeWidth="1.25" opacity="0.6" />
    <line x1="10" y1="8" x2="8" y2="8" strokeWidth="1.25" opacity="0.6" />
    <line x1="10" y1="10.5" x2="8.5" y2="10.5" strokeWidth="1.25" opacity="0.6" />
  </svg>
);

/**
 * Modern minimalist humidity droplet icon
 */
export const ModernHumidityIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Outer crisp teardrop */}
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    {/* Minimalist inner moisture level contour */}
    <path
      d="M7.5 13.8c1.2-1.5 2.8-1.8 4.5-1.2 1.7.6 3.2.4 4.5-.8"
      strokeWidth="1.4"
      strokeLinecap="round"
      opacity="0.75"
    />
  </svg>
);

/**
 * Modern minimalist barometric pressure gauge icon
 */
export const ModernPressureIcon: React.FC<IconProps> = ({ className = 'w-6 h-6', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Outer gauge dial */}
    <circle cx="12" cy="12" r="9" />
    {/* Dial tick marks */}
    <line x1="12" y1="4.5" x2="12" y2="6.5" opacity="0.5" strokeWidth="1.5" />
    <line x1="19.5" y1="12" x2="17.5" y2="12" opacity="0.5" strokeWidth="1.5" />
    <line x1="4.5" y1="12" x2="6.5" y2="12" opacity="0.5" strokeWidth="1.5" />
    {/* Center pivot point */}
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    {/* Precision indicator needle angled slightly upward right */}
    <path d="M12 12l4-4" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Modern wind arrow indicator (rotatable by degrees)
 */
export const ModernWindVectorIcon: React.FC<{ degrees: number; size?: number; className?: string }> = ({
  degrees,
  size = 18,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ transform: `rotate(${degrees}deg)`, transformOrigin: 'center' }}
    aria-hidden="true"
  >
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </svg>
);

/**
 * Modern minimalist condition icons
 */
export const WeatherConditionIcon: React.FC<{ icon?: string; condition?: string; size?: number; className?: string }> = ({
  icon,
  condition,
  size = 28,
  className = 'text-white',
}) => {
  const iconKey = (icon || condition || 'partly-cloudy').toLowerCase();
  switch (iconKey) {
    case 'clear':
    case 'sunny':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <circle cx="12" cy="12" r="4.5" />
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
          <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
          <line x1="2" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
          <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
          <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
        </svg>
      );

    case 'partly-cloudy':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          {/* Sun behind cloud */}
          <path d="M12 4V2" />
          <path d="M16.5 6.5l1.4-1.4" />
          <path d="M18 10h2" />
          <path d="M16.5 13.5l1.4 1.4" />
          <path d="M10 9a4 4 0 0 1 4 4" />
          {/* Minimalist cloud */}
          <path d="M17.5 19H9a5 5 0 0 1-1-9.9 6 6 0 0 1 11.5 2.9A4 4 0 0 1 17.5 19z" />
        </svg>
      );

    case 'cloudy':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M17.5 19H9a5 5 0 0 1-1-9.9 6 6 0 0 1 11.5 2.9A4 4 0 0 1 17.5 19z" />
        </svg>
      );

    case 'rain':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M17.5 14H9a5 5 0 0 1-1-9.9 6 6 0 0 1 11.5 2.9A4 4 0 0 1 17.5 14z" />
          <line x1="8" y1="18" x2="7" y2="21" strokeWidth="2" />
          <line x1="12" y1="18" x2="11" y2="21" strokeWidth="2" />
          <line x1="16" y1="18" x2="15" y2="21" strokeWidth="2" />
        </svg>
      );

    case 'thunderstorm':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M17.5 13H9a5 5 0 0 1-1-9.9 6 6 0 0 1 11.5 2.9A4 4 0 0 1 17.5 13z" />
          <polygon points="13 13 9 18 13 18 11 23 16 16 12 16 13 13" fill="currentColor" stroke="none" />
        </svg>
      );

    case 'windy':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
          <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
          <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
        </svg>
      );

    case 'snow':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M17.5 14H9a5 5 0 0 1-1-9.9 6 6 0 0 1 11.5 2.9A4 4 0 0 1 17.5 14z" />
          <circle cx="8" cy="18.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="18.5" r="1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="18.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );

    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M17.5 19H9a5 5 0 0 1-1-9.9 6 6 0 0 1 11.5 2.9A4 4 0 0 1 17.5 19z" />
        </svg>
      );
  }
};

/**
 * Modern minimalist UV Index icon matching MagicMirror style
 */
export const ModernSunUvIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4.5" />
    <line x1="12" y1="2" x2="12" y2="4.5" />
    <line x1="12" y1="19.5" x2="12" y2="22" />
    <line x1="4.5" y1="12" x2="2" y2="12" />
    <line x1="22" y1="12" x2="19.5" y2="12" />
    <line x1="4.93" y1="4.93" x2="6.7" y2="6.7" strokeWidth="1.5" />
    <line x1="19.07" y1="19.07" x2="17.3" y2="17.3" strokeWidth="1.5" />
    <line x1="4.93" y1="19.07" x2="6.7" y2="17.3" strokeWidth="1.5" />
    <line x1="19.07" y1="4.93" x2="17.3" y2="6.7" strokeWidth="1.5" />
  </svg>
);

/**
 * Modern minimalist Lightning Bolt Warning Icon
 */
export const ModernLightningBoltIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * Modern minimalist Rain / Precipitation Icon
 */
export const ModernRainCloudIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M17.5 14H9a5 5 0 0 1-1-9.9 6 6 0 0 1 11.5 2.9A4 4 0 0 1 17.5 14z" />
    <line x1="8" y1="17" x2="7" y2="21" strokeWidth="2" />
    <line x1="12" y1="17" x2="11" y2="21" strokeWidth="2" />
    <line x1="16" y1="17" x2="15" y2="21" strokeWidth="2" />
  </svg>
);

/**
 * Modern minimalist Wind Flow Icon
 */
export const ModernWindIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
  </svg>
);


