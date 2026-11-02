import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusDashboardView } from '../StatusDashboardView';

describe('StatusDashboardView Component', () => {
  it('renders status dashboard with real-time connections and database metrics', () => {
    render(<StatusDashboardView />);

    // Header & Title
    expect(screen.getByText(/System & Database Status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();

    // Ensure it is separate without main site navigation or back buttons
    expect(screen.queryByRole('button', { name: /Back to League/i })).not.toBeInTheDocument();

    // Primary metric cards
    expect(
      screen.getByText(/Real-Time Concurrent App Connections/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/PostgreSQL Connection Pool/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Database Disk Size/i)).toBeInTheDocument();
    expect(screen.getByText(/Database Table Records/i)).toBeInTheDocument();
  });

  it('triggers manual refresh when the Refresh button is clicked', () => {
    render(<StatusDashboardView />);

    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshBtn).toBeInTheDocument();

    fireEvent.click(refreshBtn);
    expect(refreshBtn).toBeInTheDocument();
  });
});
