// frontend/lib/currency-utils.ts

/**
 * Convert `amount` from one currency to another using USD as the intermediary.
 * `rates` is a map of { [targetCurrency]: rateFromUSD } (e.g. { AUD: 1.55 }).
 * Returns null if either rate is missing.
 */
export const convertCurrency = (
    amount: number,
    from: string,
    to: string,
    rates: Record<string, number>
): number | null => {
    if (from === to) return amount;
    const fromRate = from === 'USD' ? 1 : rates[from];
    const toRate = to === 'USD' ? 1 : rates[to];
    if (!fromRate || !toRate) return null;
    return (amount / fromRate) * toRate;
};

/** Format a number as a currency string, e.g. formatCurrency(1234.5, 'AUD') → "A$1,234.50" */
export const formatCurrency = (amount: number, currency: string): string =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
