export function getCalendarGrid(year, month) {
  // Number of days in the month (month is 0-indexed in JS)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Day of the week for the 1st of the month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  return {
    daysInMonth,
    firstDayOfMonth
  };
}
