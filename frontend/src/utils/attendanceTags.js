const weekDayByIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const parseDateValue = value => {
  if (!value) return null;
  const parsedValue = typeof value === "string" ? value.replace(" ", "T") : value;
  const date = new Date(parsedValue);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const toMinutes = (time, period) => {
  const [hourPart, minutePart] = String(time ?? "").split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 1 ||
    hour > 12 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  const normalizedHour = hour % 12;
  const periodOffset = period === "PM" ? 12 * 60 : 0;
  return normalizedHour * 60 + minute + periodOffset;
};

export const normalizeSchedule = schedule => {
  if (!schedule) return null;
  if (typeof schedule === "string") {
    try {
      return JSON.parse(schedule);
    } catch {
      return null;
    }
  }
  return schedule;
};

const getScheduleForDate = (schedule, date) => {
  const normalizedSchedule = normalizeSchedule(schedule);
  if (
    !normalizedSchedule ||
    typeof normalizedSchedule !== "object" ||
    Array.isArray(normalizedSchedule)
  ) {
    return null;
  }

  const dayLabel = weekDayByIndex[date.getDay()];
  if (!dayLabel || !Array.isArray(normalizedSchedule.days)) return null;
  if (!normalizedSchedule.days.includes(dayLabel)) return null;

  return normalizedSchedule.daySchedules?.[dayLabel] ?? normalizedSchedule;
};

export const isOffScheduledTimeIn = ({ schedule, timeInAt }) => {
  const timeInDate = parseDateValue(timeInAt);
  if (!timeInDate) return false;

  const daySchedule = getScheduleForDate(schedule, timeInDate);
  if (!daySchedule) return false;

  const shiftStartMinutes = toMinutes(daySchedule.startTime, daySchedule.startPeriod);
  const shiftEndMinutes = toMinutes(daySchedule.endTime, daySchedule.endPeriod);
  if (shiftStartMinutes === null || shiftEndMinutes === null) return false;

  const timeInMinutes = timeInDate.getHours() * 60 + timeInDate.getMinutes();
  return timeInMinutes < shiftStartMinutes || timeInMinutes > shiftEndMinutes;
};

export const resolveAttendanceMainTag = ({ attendanceTag, schedule, timeInAt, fallbackTag = "Scheduled" }) => {
  if (isOffScheduledTimeIn({ schedule, timeInAt })) return "Off Scheduled";
  return attendanceTag ?? fallbackTag;
};