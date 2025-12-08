// Brasília timezone utilities (America/Sao_Paulo - UTC-3)
const BRASILIA_OFFSET_HOURS = -3;

/**
 * Converts a date selected by user (in Brasília time) to UTC for database storage.
 * User selects 14:00 Brasília → stored as 17:00 UTC
 */
export function brasiliaToUTC(date: Date): Date {
  // Get user's local timezone offset in hours
  const localOffsetHours = date.getTimezoneOffset() / 60;
  
  // Calculate difference between local offset and Brasília offset
  // localOffsetHours is positive for west of UTC, so:
  // If user is in UTC (offset 0), diff = 0 - (-3) = 3 hours to subtract
  // If user is in Brasília (offset 3), diff = 3 - (-3) = 6... wait that's wrong
  // Let me think again:
  // getTimezoneOffset() returns minutes to ADD to get UTC
  // For Brasília (UTC-3), getTimezoneOffset() returns +180 (3 hours)
  // So localOffsetHours = 3 for someone in Brasília
  
  // We want to treat the input as if it was selected in Brasília time
  // So we need to convert from "assumed Brasília" to "actual UTC"
  
  // The selected time represents Brasília time, so:
  // UTC = Brasília + 3 hours
  const utcDate = new Date(date.getTime());
  
  // First, undo the local timezone interpretation
  // Then apply Brasília offset
  const diffFromBrasilia = localOffsetHours - (-BRASILIA_OFFSET_HOURS);
  
  utcDate.setHours(utcDate.getHours() + diffFromBrasilia);
  
  return utcDate;
}

/**
 * Converts a UTC date from database to Brasília time for display.
 * Stored as 17:00 UTC → displayed as 14:00 Brasília
 */
export function utcToBrasilia(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  
  // Get user's local timezone offset in hours
  const localOffsetHours = d.getTimezoneOffset() / 60;
  
  // Calculate difference to convert from local display to Brasília
  const diffToBrasilia = (-BRASILIA_OFFSET_HOURS) - localOffsetHours;
  
  const brasiliaDate = new Date(d.getTime());
  brasiliaDate.setHours(brasiliaDate.getHours() + diffToBrasilia);
  
  return brasiliaDate;
}

/**
 * Formats a date for display with Brasília timezone indicator
 */
export function formatBrasiliaDate(date: Date | string, formatStr?: string): string {
  const brasiliaDate = utcToBrasilia(date);
  return brasiliaDate.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }) + ' (Brasília)';
}

/**
 * Gets current time in Brasília for comparison/validation
 */
export function getNowInBrasilia(): Date {
  return utcToBrasilia(new Date());
}
