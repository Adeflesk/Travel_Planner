export const getLocalTimezone = (): string => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz || 'UTC';
};

export const getSupportedTimezones = (): string[] => {
  const intlWithSupported = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };

  if (typeof intlWithSupported.supportedValuesOf === 'function') {
    return intlWithSupported.supportedValuesOf('timeZone');
  }

  return [getLocalTimezone()];
};
