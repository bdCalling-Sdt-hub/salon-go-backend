import {
  addHours,
  addMinutes,
  format,
  formatISO,
  parse,
  setHours,
  setMinutes,
} from 'date-fns';

function convertToISODate(time: string, isoDate: Date): string {
  // Parse the time string into hours and minutes
  const parsedTime = parse(time, 'h:mm a', new Date());
  const hours = parsedTime.getHours();
  const minutes = parsedTime.getMinutes();

  // Convert the provided ISO date into a Date object
  const baseDate = new Date(isoDate); // Use UTC date
  baseDate.setUTCHours(hours, minutes, 0, 0); // Set hours and minutes in UTC

  // Return the ISO string in UTC
  return baseDate.toISOString();
}
// Function to calculate end time
function calculateEndTime(startTime: string, duration: number): string {
  const parsedTime = parse(startTime, 'h:mm a', new Date());
  const endTime = addMinutes(parsedTime, duration);

  // Format back to a 12-hour format for readability
  return format(endTime, 'h:mm a');
}

function convertTo24HourFormat(time: string): string {
  const [hours, minutes] = time.split(':');
  const [minute, period] = minutes.split(' ');

  let hour24 = parseInt(hours);
  if (period === 'pm' && hour24 !== 12) {
    hour24 += 12;
  } else if (period === 'am' && hour24 === 12) {
    hour24 = 0; // Midnight case
  }

  // Format to 'HH:mm' string
  return `${hour24.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

const parseTimeToISO = (time: string): string => {
  const [hour, minute, meridian] = time
    .match(/(\d+):(\d+)\s*(am|pm)/i)!
    .slice(1);

  let hours = parseInt(hour);
  if (meridian.toLowerCase() === 'pm' && hours !== 12) {
    hours += 12;
  } else if (meridian.toLowerCase() === 'am' && hours === 12) {
    hours = 0;
  }

  return new Date(
    `1970-01-01T${String(hours).padStart(2, '0')}:${minute}:00Z`,
  ).toISOString();
};

const parseTimeTo24Hour = (time: string): number => {
  const [hour, minute, meridian] = time
    .match(/(\d+):(\d+)\s*(am|pm)/i)!
    .slice(1);

  let hours = parseInt(hour);
  if (meridian.toLowerCase() === 'pm' && hours !== 12) {
    hours += 12;
  } else if (meridian.toLowerCase() === 'am' && hours === 12) {
    hours = 0;
  }

  return hours * 100 + parseInt(minute); // Combine hours and minutes into a numeric format
};

const convertISOTo24HourNumeric = (isoDate: string): number => {
  // Parse the ISO date string
  const date = new Date(isoDate);

  // Extract hours and minutes
  const hours = date.getHours(); // 0-23
  const minutes = date.getMinutes(); // 0-59

  // Return the numeric value in HHMM format (24-hour format)
  return hours * 100 + minutes;
};

const convertISOTo12HourFormat = (isoDate: string): string => {
  const date = new Date(isoDate);

  let hours = date.getUTCHours(); // Get the hours in 24-hour format (0-23)
  const minutes = date.getUTCMinutes(); // Get the minutes (0-59)
  const ampm = hours >= 12 ? 'pm' : 'am'; // Determine AM or PM

  // Convert 24-hour format to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // 12:00 pm should be 12, not 0

  // Format minutes with leading zero if necessary
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

  // Return the formatted time in 12-hour format with AM/PM
  return `${hours}:${formattedMinutes} ${ampm}`;
};

export const DateHelper = {
  convertToISODate,
  calculateEndTime,
  convertTo24HourFormat,
  parseTimeToISO,
  parseTimeTo24Hour,
  convertISOTo24HourNumeric,
  convertISOTo12HourFormat,
};
