export interface DateTimeConstraints {
  minDateTime?: string;
  maxDateTime?: string;
  defaultDateTime?: string;
}

export interface DateTimeConstraintOptions {
  allowBeforeStart?: boolean;
  allowAfterEnd?: boolean;
  defaultTo?: 'start' | 'end' | 'today';
  defaultTime?: string;
}

const DEFAULT_TIME = '09:00';

function isValidDateString(value?: string): value is string {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateTimeConstraints(
  startDate?: string,
  endDate?: string,
  options: DateTimeConstraintOptions = {}
): DateTimeConstraints {
  const {
    allowBeforeStart = false,
    allowAfterEnd = false,
    defaultTo = 'start',
    defaultTime = DEFAULT_TIME,
  } = options;

  const hasStart = isValidDateString(startDate);
  const hasEnd = isValidDateString(endDate);

  const minDateTime = hasStart && !allowBeforeStart
    ? `${startDate}T00:00`
    : undefined;
  const maxDateTime = hasEnd && !allowAfterEnd
    ? `${endDate}T23:59`
    : undefined;

  let defaultDate: string | undefined;
  if (defaultTo === 'start' && hasStart) {
    defaultDate = startDate;
  } else if (defaultTo === 'end' && hasEnd) {
    defaultDate = endDate;
  } else if (defaultTo === 'today') {
    defaultDate = getTodayIsoDate();
  } else if (hasStart) {
    defaultDate = startDate;
  } else if (hasEnd) {
    defaultDate = endDate;
  }

  const defaultDateTime = defaultDate
    ? `${defaultDate}T${defaultTime}`
    : undefined;

  return {
    minDateTime,
    maxDateTime,
    defaultDateTime,
  };
}
