export const calculateWorkingHours = (checkInTime: Date, checkOutTime: Date): {
  hours: number;
  minutes: number;
  formatted: string;
} => {
  const diffMs = new Date(checkOutTime).getTime() - new Date(checkInTime).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const hours = Math.floor(diffHours);
  const minutes = Math.round((diffHours - hours) * 60);

  return {
    hours,
    minutes,
    formatted: `${hours}h ${minutes}m`,
  };
};

export const calculateAttendancePercentage = (
  presentDays: number,
  totalDays: number
): number => {
  if (totalDays === 0) return 0;
  return Math.round((presentDays / totalDays) * 100);
};

export const getDateRange = (
  startDate: Date,
  endDate: Date
): {
  days: number;
  weeks: number;
  months: number;
} => {
  const diffMs = endDate.getTime() - startDate.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(days / 7);
  const months = Math.ceil(days / 30);

  return { days, weeks, months };
};
