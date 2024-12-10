/* eslint-disable @typescript-eslint/no-explicit-any */

export const buildRangeFilter = (field: string, min?: number, max?: number) => {
  const rangeFilter: any = {};
  if (min !== undefined) rangeFilter.$gte = min;
  if (max !== undefined) rangeFilter.$lte = max;
  return Object.keys(rangeFilter).length > 0 ? { [field]: rangeFilter } : null;
};

//statistics
export const getDateRangeAndIntervals = (range: string) => {
  const months = parseInt(range, 10) || 1;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - months);

  const intervalDays = (months * 30) / 10;
  const intervalMilliseconds = intervalDays * 24 * 60 * 60 * 1000;

  const totalIntervals = Math.floor(
    (endDate.getTime() - startDate.getTime()) / intervalMilliseconds,
  );

  // Generate intervals with default value of 0
  const intervals = Array.from({ length: totalIntervals }, (_, i) => ({
    key: `${i * intervalDays + 1}-${(i + 1) * intervalDays}`,
    value: 0,
  }));

  return { startDate, endDate, intervals, intervalMilliseconds };
};

export const handleObjectUpdate = (
  payload: Record<string, any>,
  updatedData: Record<string, any>,
  prefix: string,
) => {
  if (payload && Object.keys(payload).length > 0) {
    Object.keys(payload).forEach((key) => {
      const updatedKey = `${prefix}.${key}`;

      updatedData[updatedKey] = payload[key];
    });
  }

  return updatedData;
};
