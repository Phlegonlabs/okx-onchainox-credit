const UTC_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function toDate(value: Date | number | string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }

  return date;
}

function formatUtcDateParts(date: Date): string {
  return `${UTC_MONTHS[date.getUTCMonth()]} ${padTwoDigits(date.getUTCDate())}, ${date.getUTCFullYear()}`;
}

export function formatIsoDateUtc(value: string): string {
  return formatUtcDateParts(toDate(value));
}

export function formatIsoDateTimeUtc(value: number | string): string {
  const date = toDate(value);

  return `${formatUtcDateParts(date)} ${padTwoDigits(date.getUTCHours())}:${padTwoDigits(date.getUTCMinutes())} UTC`;
}

export function formatUnixDateTimeUtc(seconds: number): string {
  return formatIsoDateTimeUtc(seconds * 1_000);
}
