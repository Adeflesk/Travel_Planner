import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { DayForm } from './DayForm';

describe('DayForm', () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const mockOnCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── rendering ─────────────────────────────────────────────────────────

    it('renders all four fields', () => {
        render(
            <DayForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
        );
        expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/e.g. Arrival in Tokyo/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/e.g. Tokyo, Japan/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Add any general notes/i)).toBeInTheDocument();
    });

    it('renders with initialData pre-filled', () => {
        render(
            <DayForm
                initialData={{ date: '2030-06-15', title: 'Beach Day', location: 'Maldives', notes: 'Snorkelling!' }}
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
            />
        );
        expect((screen.getByLabelText(/date/i) as HTMLInputElement).value).toBe('2030-06-15');
        expect((screen.getByPlaceholderText(/e.g. Arrival in Tokyo/i) as HTMLInputElement).value).toBe('Beach Day');
        expect((screen.getByPlaceholderText(/e.g. Tokyo, Japan/i) as HTMLInputElement).value).toBe('Maldives');
        expect((screen.getByPlaceholderText(/Add any general notes/i) as HTMLTextAreaElement).value).toBe('Snorkelling!');
    });

    it('uses the custom submitLabel', () => {
        render(
            <DayForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} submitLabel="Add Day" />
        );
        expect(screen.getByRole('button', { name: 'Add Day' })).toBeInTheDocument();
    });

    it('defaults submitLabel to "Save"', () => {
        render(<DayForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    // ── isSubmitting ──────────────────────────────────────────────────────

    it('disables the submit button and shows "Saving..." while isSubmitting=true', () => {
        render(
            <DayForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isSubmitting={true} />
        );
        const submitBtn = screen.getByRole('button', { name: /saving/i });
        expect(submitBtn).toBeDisabled();
    });

    // ── submit ────────────────────────────────────────────────────────────

    it('calls onSubmit with the correct field values', async () => {
        render(
            <DayForm
                initialData={{ date: '2030-07-01' }}
                onSubmit={mockOnSubmit}
                onCancel={mockOnCancel}
                submitLabel="Save"
            />
        );

        fireEvent.change(screen.getByPlaceholderText(/e.g. Arrival in Tokyo/i), {
            target: { value: 'Museum Day' },
        });
        fireEvent.change(screen.getByPlaceholderText(/e.g. Tokyo, Japan/i), {
            target: { value: 'Florence' },
        });
        fireEvent.change(screen.getByPlaceholderText(/Add any general notes/i), {
            target: { value: 'Book tickets early' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith({
                date: '2030-07-01',
                title: 'Museum Day',
                location: 'Florence',
                notes: 'Book tickets early',
            });
        });
    });

    // ── cancel ────────────────────────────────────────────────────────────

    it('calls onCancel when the Cancel button is clicked', () => {
        render(<DayForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
        expect(mockOnSubmit).not.toHaveBeenCalled();
    });
});
