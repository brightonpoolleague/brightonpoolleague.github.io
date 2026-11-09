import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../App';

const mockUseLeague = vi.fn();
vi.mock('../../context/LeagueContext', () => ({
  useLeague: () => mockUseLeague(),
  LeagueProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Navigation Labels', () => {
  it('renders "Teams & Venues" in desktop navigation and "Teams" in mobile bottom navigation', () => {
    mockUseLeague.mockReturnValue({
      seasonName: 'Winter 2026/27',
      fixtures: [],
      teams: [],
      players: [],
      divisions: ['Premier League'],
      session: { role: 'viewer', name: 'Spectator' },
      setRoleSession: vi.fn(),
      isOnline: true,
      isRealtimeConnected: true,
      pendingMutationsCount: 0,
      syncError: null,
      refreshData: vi.fn(),
    });

    const { container } = render(<App />);

    // Desktop nav: contains "Teams & Venues"
    const desktopNav = container.querySelector('nav.hidden.md\\:flex');
    expect(desktopNav).toBeInTheDocument();
    expect(desktopNav?.textContent).toContain('Teams & Venues');

    // Mobile nav: contains "Teams" and does not contain "Venues" as a standalone label
    const mobileNav = container.querySelector('nav.md\\:hidden');
    expect(mobileNav).toBeInTheDocument();
    expect(mobileNav?.textContent).toContain('Teams');
    expect(mobileNav?.textContent).not.toContain('Venues');
  });
});
