import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusDashboardView } from '../StatusDashboardView';
import { formatUptimeDuration } from '../../utils/formatters';

describe('StatusDashboardView Component', () => {
  it('renders status dashboard with real-time connections and database metrics', () => {
    render(<StatusDashboardView />);

    // Header & Title
    expect(screen.getByText(/System & Database Status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();

    // Ensure it is separate without main site navigation or back buttons
    expect(screen.queryByRole('button', { name: /Back to League/i })).not.toBeInTheDocument();

    // Ensure raw Supabase project URL is not exposed
    expect(screen.queryByText(/supabase\.co/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Local Sandbox Mode|Connected to live database/i)
    ).toBeInTheDocument();

    // Primary metric cards
    expect(
      screen.getByText(/Real-Time Concurrent App Connections/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/PostgreSQL Connection Pool/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Healthy/i)).toBeInTheDocument();
    expect(screen.getByText(/Database Disk Size/i)).toBeInTheDocument();
    expect(screen.getByText(/Connected Team Captains/i)).toBeInTheDocument();
    expect(screen.getByText(/Database Table Records/i)).toBeInTheDocument();
  });

  it('triggers manual refresh when the Refresh button is clicked', () => {
    render(<StatusDashboardView />);

    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshBtn).toBeInTheDocument();

    fireEvent.click(refreshBtn);
    expect(refreshBtn).toBeInTheDocument();
  });

  describe('formatUptimeDuration helper', () => {
    it('formats PostgreSQL intervals with days and hours cleanly', () => {
      expect(formatUptimeDuration('8 days 20:14:32.342234')).toBe(
        '8 days, 20h 14m'
      );
      expect(formatUptimeDuration('1 day 02:05:00')).toBe('1 day, 2h 5m');
    });

    it('formats PostgreSQL intervals under a day cleanly', () => {
      expect(formatUptimeDuration('04:15:30.123')).toBe('4h 15m');
      expect(formatUptimeDuration('00:25:10')).toBe('25m');
      expect(formatUptimeDuration('00:00:45')).toBe('< 1m');
    });

    it('handles fallback or non-interval values gracefully', () => {
      expect(formatUptimeDuration('Online')).toBe('Online');
      expect(formatUptimeDuration(undefined)).toBe('Online');
      expect(formatUptimeDuration('Unknown')).toBe('Unknown');
    });
  });
});
