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
  try {
    // More robust time parsing using regex
    const timeRegex = /(\d+):(\d+)\s*(am|pm)/i;
    const match = time.match(timeRegex);

    if (!match) {
      throw new Error(`Invalid time format: ${time}`);
    }

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridian = match[3].toLowerCase();

    // Convert to 24-hour format
    if (meridian === 'pm' && hours !== 12) {
      hours += 12;
    } else if (meridian === 'am' && hours === 12) {
      hours = 0;
    }

    // Validate hours and minutes
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(
        `Invalid time values: hours=${hours}, minutes=${minutes}`,
      );
    }

    // Create a new Date object based on the input date
    const baseDate = new Date(isoDate);

    // Set hours and minutes
    baseDate.setUTCHours(hours, minutes, 0, 0);

    // Return the ISO string
    return baseDate.toISOString();
  } catch (error) {
    console.error(`Error converting time "${time}" to ISO date:`, error);
    // Fallback to current time if there's an error
    const fallbackDate = new Date(isoDate);
    return fallbackDate.toISOString();
  }
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
