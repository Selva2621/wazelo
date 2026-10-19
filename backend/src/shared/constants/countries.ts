/**
 * Countries an org can operate from. Picking one sets the defaults for phone
 * numbers without a country code, money (deals, products) and the timezone.
 * Keep in sync with frontend/src/lib/constants/countries.ts.
 */
export interface CountryInfo {
  /** ISO 3166-1 alpha-2 */
  code: string;
  name: string;
  /** Calling code without "+" */
  dialCode: string;
  /** ISO 4217 */
  currency: string;
  /** Main IANA timezone */
  timezone: string;
}

export const COUNTRIES: readonly CountryInfo[] = [
  { code: 'IN', name: 'India', dialCode: '91', currency: 'INR', timezone: 'Asia/Kolkata' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '971', currency: 'AED', timezone: 'Asia/Dubai' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '966', currency: 'SAR', timezone: 'Asia/Riyadh' },
  { code: 'QA', name: 'Qatar', dialCode: '974', currency: 'QAR', timezone: 'Asia/Qatar' },
  { code: 'KW', name: 'Kuwait', dialCode: '965', currency: 'KWD', timezone: 'Asia/Kuwait' },
  { code: 'OM', name: 'Oman', dialCode: '968', currency: 'OMR', timezone: 'Asia/Muscat' },
  { code: 'BH', name: 'Bahrain', dialCode: '973', currency: 'BHD', timezone: 'Asia/Bahrain' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '94', currency: 'LKR', timezone: 'Asia/Colombo' },
  { code: 'BD', name: 'Bangladesh', dialCode: '880', currency: 'BDT', timezone: 'Asia/Dhaka' },
  { code: 'NP', name: 'Nepal', dialCode: '977', currency: 'NPR', timezone: 'Asia/Kathmandu' },
  { code: 'PK', name: 'Pakistan', dialCode: '92', currency: 'PKR', timezone: 'Asia/Karachi' },
  { code: 'SG', name: 'Singapore', dialCode: '65', currency: 'SGD', timezone: 'Asia/Singapore' },
  { code: 'MY', name: 'Malaysia', dialCode: '60', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' },
  { code: 'ID', name: 'Indonesia', dialCode: '62', currency: 'IDR', timezone: 'Asia/Jakarta' },
  { code: 'PH', name: 'Philippines', dialCode: '63', currency: 'PHP', timezone: 'Asia/Manila' },
  { code: 'TH', name: 'Thailand', dialCode: '66', currency: 'THB', timezone: 'Asia/Bangkok' },
  { code: 'VN', name: 'Vietnam', dialCode: '84', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh' },
  { code: 'HK', name: 'Hong Kong', dialCode: '852', currency: 'HKD', timezone: 'Asia/Hong_Kong' },
  { code: 'JP', name: 'Japan', dialCode: '81', currency: 'JPY', timezone: 'Asia/Tokyo' },
  { code: 'AU', name: 'Australia', dialCode: '61', currency: 'AUD', timezone: 'Australia/Sydney' },
  { code: 'NZ', name: 'New Zealand', dialCode: '64', currency: 'NZD', timezone: 'Pacific/Auckland' },
  { code: 'GB', name: 'United Kingdom', dialCode: '44', currency: 'GBP', timezone: 'Europe/London' },
  { code: 'IE', name: 'Ireland', dialCode: '353', currency: 'EUR', timezone: 'Europe/Dublin' },
  { code: 'DE', name: 'Germany', dialCode: '49', currency: 'EUR', timezone: 'Europe/Berlin' },
  { code: 'FR', name: 'France', dialCode: '33', currency: 'EUR', timezone: 'Europe/Paris' },
  { code: 'NL', name: 'Netherlands', dialCode: '31', currency: 'EUR', timezone: 'Europe/Amsterdam' },
  { code: 'ES', name: 'Spain', dialCode: '34', currency: 'EUR', timezone: 'Europe/Madrid' },
  { code: 'IT', name: 'Italy', dialCode: '39', currency: 'EUR', timezone: 'Europe/Rome' },
  { code: 'CH', name: 'Switzerland', dialCode: '41', currency: 'CHF', timezone: 'Europe/Zurich' },
  { code: 'US', name: 'United States', dialCode: '1', currency: 'USD', timezone: 'America/New_York' },
  { code: 'CA', name: 'Canada', dialCode: '1', currency: 'CAD', timezone: 'America/Toronto' },
  { code: 'MX', name: 'Mexico', dialCode: '52', currency: 'MXN', timezone: 'America/Mexico_City' },
  { code: 'BR', name: 'Brazil', dialCode: '55', currency: 'BRL', timezone: 'America/Sao_Paulo' },
  { code: 'ZA', name: 'South Africa', dialCode: '27', currency: 'ZAR', timezone: 'Africa/Johannesburg' },
  { code: 'NG', name: 'Nigeria', dialCode: '234', currency: 'NGN', timezone: 'Africa/Lagos' },
  { code: 'KE', name: 'Kenya', dialCode: '254', currency: 'KES', timezone: 'Africa/Nairobi' },
  { code: 'EG', name: 'Egypt', dialCode: '20', currency: 'EGP', timezone: 'Africa/Cairo' },
];

export const DEFAULT_COUNTRY_CODE = 'IN';

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export const CURRENCY_CODES = [...new Set([...COUNTRIES.map((c) => c.currency), 'USD', 'EUR'])];

export function getCountry(code: string | null | undefined): CountryInfo {
  return (
    COUNTRIES.find((c) => c.code === code?.toUpperCase()) ??
    COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE)!
  );
}
