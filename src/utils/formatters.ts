/**
 * Utility functions for safe number formatting
 */

/**
 * Safely formats a number to a fixed number of decimal places
 * @param value - The value to format (can be number, string, or null/undefined)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with the specified number of decimal places
 */
export const safeToFixed = (value: number | string | null | undefined, decimals: number = 2): string => {
  if (typeof value === 'number') {
    return value.toFixed(decimals);
  }
  
  const numValue = Number(value || 0);
  return numValue.toFixed(decimals);
};

/**
 * Safely formats a number as currency
 * @param value - The value to format (can be number, string, or null/undefined)
 * @param currency - Currency symbol (default: '$')
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number | string | null | undefined, currency: string = '$', decimals: number = 2): string => {
  return `${currency}${safeToFixed(value, decimals)}`;
};

/**
 * Safely formats a number as a percentage
 * @param value - The value to format (can be number, string, or null/undefined)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number | string | null | undefined, decimals: number = 1): string => {
  return `${safeToFixed(value, decimals)}%`;
};

/**
 * Safely converts a value to a number
 * @param value - The value to convert
 * @param defaultValue - Default value if conversion fails (default: 0)
 * @returns The converted number
 */
export const safeNumber = (value: number | string | null | undefined, defaultValue: number = 0): number => {
  if (typeof value === 'number') {
    return value;
  }
  
  const numValue = Number(value);
  return isNaN(numValue) ? defaultValue : numValue;
}; 