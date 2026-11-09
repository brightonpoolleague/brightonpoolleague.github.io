import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../../App';

const mockUseLeague = vi.fn();
vi.mock('../../context/LeagueContext', () => ({
  useLeague: () => mockUseLeague(),
  LeagueProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Navigation Labels', () => {
  it('renders all standard navigation items with full labels on desktop and concise labels on mobile', () => {
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

    // Desktop nav labels
    const desktopNav = container.querySelector('nav.hidden.md\\:flex');
    expect(desktopNav).toBeInTheDocument();
    const desktopLabels = Array.from(desktopNav!.querySelectorAll('button span')).map(
      (el) => el.textContent?.trim()
    );
    expect(desktopLabels).toEqual([
      'Live & Fixtures',
      'League Table',
      'Player Stats',
      'Teams & Venues',
      'Info',
    ]);

    // Mobile bottom nav short labels
    const mobileNav = container.querySelector('nav.md\\:hidden');
    expect(mobileNav).toBeInTheDocument();
    const mobileLabels = Array.from(mobileNav!.querySelectorAll('button span')).map(
      (el) => el.textContent?.trim()
    );
    expect(mobileLabels).toEqual([
      'Live',
      'Table',
      'Stats',
      'Teams',
      'Info',
    ]);
  });

  it('includes admin navigation item on both desktop and mobile when session is admin', () => {
    mockUseLeague.mockReturnValue({
      seasonName: 'Winter 2026/27',
      fixtures: [],
      teams: [],
      players: [],
      divisions: ['Premier League'],
      session: { role: 'admin', name: 'League Admin' },
      setRoleSession: vi.fn(),
      isOnline: true,
      isRealtimeConnected: true,
      pendingMutationsCount: 0,
      syncError: null,
      refreshData: vi.fn(),
    });

    const { container } = render(<App />);

    const desktopNav = container.querySelector('nav.hidden.md\\:flex');
    const desktopLabels = Array.from(desktopNav!.querySelectorAll('button span')).map(
      (el) => el.textContent?.trim()
    );
    expect(desktopLabels).toEqual([
      'Live & Fixtures',
      'League Table',
      'Player Stats',
      'Teams & Venues',
      'Info',
      'League Admin',
    ]);

    const mobileNav = container.querySelector('nav.md\\:hidden');
    const mobileLabels = Array.from(mobileNav!.querySelectorAll('button span')).map(
      (el) => el.textContent?.trim()
    );
    expect(mobileLabels).toEqual([
      'Live',
      'Table',
      'Stats',
      'Teams',
      'Info',
      'Admin',
    ]);
  });
});
