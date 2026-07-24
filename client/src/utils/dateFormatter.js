/**
 * Safely parses a date string, avoiding JavaScript's default behavior 
 * where DD/MM/YYYY is mistakenly parsed as MM/DD/YYYY.
 *
 * @param {string} dateStr - The date string to parse.
 * @returns {Date} - A valid JavaScript Date object, or an Invalid Date object if parsing fails.
 */
export function parseSafeDate(dateStr) {
  if (!dateStr) return new Date('');
  
  // Clean up any extraneous whitespace
  const trimmed = typeof dateStr === 'string' ? dateStr.trim() : String(dateStr);

  // Try to match DD/MM/YYYY or DD-MM-YYYY
  const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed month
    const year = parseInt(match[3], 10);
    
    const d = new Date(year, month, day);
    // Double check that it didn't overflow (e.g. 31/02 -> 03/03)
    if (d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
      return d;
    }
  }

  // Fallback to standard parsing (handles ISO format: YYYY-MM-DDTHH:mm:ss.sssZ, etc)
  return new Date(trimmed);
}
