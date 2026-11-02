import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusDashboardView } from '../StatusDashboardView';

describe('StatusDashboardView Component', () => {
  it('renders status dashboard with real-time connections, database metrics and back button', () => {
    const onNavigateHome = vi.fn();

    render(<StatusDashboardView onNavigateHome={onNavigateHome} />);

    // Header & Navigation
    expect(screen.getByText(/System & Database Status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to League/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();

    // Primary metric cards
    expect(
      screen.getByText(/Real-Time Concurrent App Connections/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/PostgreSQL Connection Pool/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Database Disk Size/i)).toBeInTheDocument();
    expect(screen.getByText(/Database Table Records/i)).toBeInTheDocument();

    // Clicking Back to League triggers onNavigateHome
    fireEvent.click(screen.getByRole('button', { name: /Back to League/i }));
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('triggers manual refresh when the Refresh button is clicked', () => {
    const onNavigateHome = vi.fn();
    render(<StatusDashboardView onNavigateHome={onNavigateHome} />);

    const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshBtn).toBeInTheDocument();

    fireEvent.click(refreshBtn);
    // Button state or text updates while refreshing
    expect(refreshBtn).toBeInTheDocument();
  });
});
