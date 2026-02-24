import { describe, it, expect } from 'vitest';
import { convertCurrency, formatCurrency } from './currency-utils';

// Sample exchange rates (all relative to USD)
const rates: Record<string, number> = {
    AUD: 1.55,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.5,
};

// ─── convertCurrency ─────────────────────────────────────────────────────────

describe('convertCurrency', () => {
    it('returns the same amount when from === to (USD)', () => {
        expect(convertCurrency(100, 'USD', 'USD', rates)).toBe(100);
    });

    it('returns the same amount when from === to (non-USD)', () => {
        expect(convertCurrency(50, 'AUD', 'AUD', rates)).toBe(50);
    });

    it('converts USD → AUD correctly', () => {
        // 100 USD * 1.55 AUD/USD = 155 AUD
        expect(convertCurrency(100, 'USD', 'AUD', rates)).toBeCloseTo(155, 5);
    });

    it('converts AUD → USD correctly', () => {
        // 155 AUD / 1.55 = 100 USD
        expect(convertCurrency(155, 'AUD', 'USD', rates)).toBeCloseTo(100, 5);
    });

    it('converts AUD → EUR via USD pivot', () => {
        // 155 AUD / 1.55 = 100 USD; 100 USD * 0.92 = 92 EUR
        expect(convertCurrency(155, 'AUD', 'EUR', rates)).toBeCloseTo(92, 5);
    });

    it('converts EUR → GBP via USD pivot', () => {
        // 92 EUR / 0.92 = 100 USD; 100 USD * 0.79 = 79 GBP
        expect(convertCurrency(92, 'EUR', 'GBP', rates)).toBeCloseTo(79, 5);
    });

    it('returns null when source rate is missing', () => {
        expect(convertCurrency(100, 'CAD', 'USD', rates)).toBeNull();
    });

    it('returns null when target rate is missing', () => {
        expect(convertCurrency(100, 'USD', 'CAD', rates)).toBeNull();
    });

    it('handles zero amount', () => {
        expect(convertCurrency(0, 'USD', 'AUD', rates)).toBeCloseTo(0, 5);
    });

    it('handles large amounts without floating-point catastrophe', () => {
        const result = convertCurrency(1_000_000, 'USD', 'JPY', rates);
        expect(result).toBeCloseTo(149_500_000, 0);
    });
});

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
    it('formats USD with $ symbol and 2 decimal places', () => {
        expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50');
    });

    it('formats AUD with A$ symbol', () => {
        const result = formatCurrency(1234.5, 'AUD');
        expect(result).toContain('1,234.50');
        expect(result).toContain('A$');
    });

    it('formats EUR with € symbol', () => {
        const result = formatCurrency(0, 'EUR');
        expect(result).toContain('€');
        expect(result).toContain('0.00');
    });

    it('formats GBP with £ symbol', () => {
        const result = formatCurrency(99.99, 'GBP');
        expect(result).toContain('£');
        expect(result).toContain('99.99');
    });

    it('formats JPY without decimal places (zero-decimal currency)', () => {
        // Intl formats JPY as a whole number
        const result = formatCurrency(1000, 'JPY');
        expect(result).toContain('1,000');
        expect(result).not.toContain('.00');
    });
});
