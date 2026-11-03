import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FoldTeamModal } from '../FoldTeamModal';
import { Fixture, Team } from '../../types/league';
import { createEmptyFrames, createEmptyLineups } from '../../utils/leagueEngine';

describe('FoldTeamModal Component', () => {
  const teamA: Team = {
    id: 'team-a',
    seasonId: 'winter-2026-27',
    division: 'Premier League',
    name: 'Alpha Hawks',
    venue: 'Hawks Nest',
    address: '10 Marine Parade',
    captainName: 'Alice',
    captainPin: '111111',
  };

  const teamB: Team = {
    id: 'team-b',
    seasonId: 'winter-2026-27',
    division: 'Premier League',
    name: 'Beta Bears',
    venue: 'Bear Den',
    address: '20 Western Road',
    captainName: 'Bob',
    captainPin: '222222',
  };

  const fixtures: Fixture[] = [
    {
      id: 'fix-1',
      seasonId: 'winter-2026-27',
      division: 'Premier League',
      matchDate: '2026-10-15',
      weekNumber: 1,
      homeTeamId: 'team-a',
      awayTeamId: 'team-b',
      status: 'approved',
      lagWinner: 'home',
      homeSet1Locked: true,
      awaySet1Locked: true,
      lineups: createEmptyLineups(),
      frames: createEmptyFrames(),
      homeCaptainSigned: true,
      awayCaptainSigned: true,
      updatedAt: '2026-10-15T22:00:00Z',
    },
    {
      id: 'fix-2',
      seasonId: 'winter-2026-27',
      division: 'Premier League',
      matchDate: '2026-11-20',
      weekNumber: 6,
      homeTeamId: 'team-b',
      awayTeamId: 'team-a',
      status: 'scheduled',
      lagWinner: null,
      homeSet1Locked: false,
      awaySet1Locked: false,
      lineups: createEmptyLineups(),
      frames: createEmptyFrames(),
      homeCaptainSigned: false,
      awayCaptainSigned: false,
      updatedAt: '2026-11-20T20:00:00Z',
    },
  ];

  it('renders modal details and previews affected fixtures', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <FoldTeamModal
        team={teamA}
        fixtures={fixtures}
        teams={[teamA, teamB]}
        onClose={handleClose}
        onConfirmFold={handleConfirm}
      />
    );

    expect(screen.getByText('Fold Alpha Hawks')).toBeInTheDocument();
    expect(screen.getByText(/Premier League • Hawks Nest/)).toBeInTheDocument();
    expect(screen.getByText(/Fixtures Impact Preview \(2\)/)).toBeInTheDocument();
    expect(screen.getByText('Home vs Beta Bears')).toBeInTheDocument();
    expect(screen.getByText('Away vs Beta Bears')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Date Picker/i })).toBeInTheDocument();
  });

  it('dynamically switches explanation between Rule 7a (First Half) and Rule 7b (Second Half)', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn().mockResolvedValue(undefined);

    // Halfway date between 2026-10-15 and 2026-11-20 is around 2026-11-02
    render(
      <FoldTeamModal
        team={teamA}
        fixtures={fixtures}
        teams={[teamA, teamB]}
        onClose={handleClose}
        onConfirmFold={handleConfirm}
      />
    );

    const dateInput = screen.getByLabelText(/Date Team Folded \/ Withdrew/);

    // Set date to first half (2026-10-20)
    fireEvent.change(dateInput, { target: { value: '2026-10-20' } });
    expect(
      screen.getByText('Rule 7a Applies: First Half Fold')
    ).toBeInTheDocument();
    expect(screen.getByText(/all results will be expunged/i)).toBeInTheDocument();

    // Set date to second half (2026-11-15)
    fireEvent.change(dateInput, { target: { value: '2026-11-15' } });
    expect(
      screen.getByText('Rule 7b Applies: Second Half Fold')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/first-half results will stand/i)
    ).toBeInTheDocument();
  });

  it('submits fold date and closes modal', async () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <FoldTeamModal
        team={teamA}
        fixtures={fixtures}
        teams={[teamA, teamB]}
        onClose={handleClose}
        onConfirmFold={handleConfirm}
      />
    );

    const dateInput = screen.getByLabelText(/Date Team Folded \/ Withdrew/);
    fireEvent.change(dateInput, { target: { value: '2026-10-25' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm Fold & Expunge/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledWith(
        'team-a',
        '2026-10-25'
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
