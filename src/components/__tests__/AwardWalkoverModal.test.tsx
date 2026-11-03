import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AwardWalkoverModal } from '../AwardWalkoverModal';
import { Fixture, Player, Team } from '../../types/league';
import { createEmptyFrames, createEmptyLineups } from '../../utils/leagueEngine';

describe('AwardWalkoverModal Component', () => {
  const homeTeam: Team = {
    id: 'team-h',
    seasonId: 's1',
    division: 'Premier League',
    name: 'Home Hawks',
    venue: 'Hawks Pub',
    address: '123 High St',
    captainName: 'Harry Home',
    captainPin: '111111',
  };

  const awayTeam: Team = {
    id: 'team-a',
    seasonId: 's1',
    division: 'Premier League',
    name: 'Away Aces',
    venue: 'Aces Club',
    address: '456 Low St',
    captainName: 'Andy Away',
    captainPin: '222222',
  };

  const teamsById: Record<string, Team> = {
    'team-h': homeTeam,
    'team-a': awayTeam,
  };

  const players: Player[] = [
    { id: 'h1', teamId: 'team-h', name: 'Harry One', active: true },
    { id: 'h2', teamId: 'team-h', name: 'Harry Two', active: true },
    { id: 'h3', teamId: 'team-h', name: 'Harry Three', active: true },
    { id: 'h4', teamId: 'team-h', name: 'Harry Four', active: true },
    { id: 'h5', teamId: 'team-h', name: 'Harry Five', active: true },
    { id: 'h6', teamId: 'team-h', name: 'Harry Sub', active: true },
    { id: 'a1', teamId: 'team-a', name: 'Andy One', active: true },
  ];

  const baseFixture: Fixture = {
    id: 'fix-1',
    seasonId: 's1',
    division: 'Premier League',
    matchDate: '2026-11-02',
    weekNumber: 1,
    homeTeamId: 'team-h',
    awayTeamId: 'team-a',
    status: 'scheduled',
    lagWinner: null,
    homeSet1Locked: false,
    awaySet1Locked: false,
    lineups: createEmptyLineups(),
    frames: createEmptyFrames(),
    homeCaptainSigned: false,
    awayCaptainSigned: false,
    updatedAt: new Date().toISOString(),
  };

  it('renders modal when open and allows selecting winning team', () => {
    render(
      <AwardWalkoverModal
        fixture={baseFixture}
        isOpen={true}
        onClose={vi.fn()}
        onConfirmWalkover={vi.fn()}
        teamsById={teamsById}
        players={players}
      />
    );

    expect(screen.getByText(/Award Walkover \(Rule 8\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('Home Hawks').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Away Aces').length).toBeGreaterThanOrEqual(1);
  });

  it('auto-fills Sets 2 and 3 when the starting 5 players are selected in Set 1', async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <AwardWalkoverModal
        fixture={baseFixture}
        isOpen={true}
        onClose={handleClose}
        onConfirmWalkover={handleConfirm}
        teamsById={teamsById}
        players={players}
      />
    );

    // Pick 5 players in Set 1
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(5); // 5 initial slots for Set 1

    fireEvent.change(selects[0], { target: { value: 'h1' } });
    fireEvent.change(selects[1], { target: { value: 'h2' } });
    fireEvent.change(selects[2], { target: { value: 'h3' } });
    fireEvent.change(selects[3], { target: { value: 'h4' } });
    fireEvent.change(selects[4], { target: { value: 'h5' } });

    // Verify 15/15 frames allocated badge
    expect(screen.getByText(/15 \/ 15 frames allocated/i)).toBeInTheDocument();

    // Confirm button should be enabled
    const confirmBtn = screen.getByRole('button', { name: /Confirm Walkover/i });
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    const updatedFixture: Fixture = handleConfirm.mock.calls[0][0];
    expect(updatedFixture.status).toBe('approved');
    expect(updatedFixture.walkover?.awardedTo).toBe('home');
    expect(updatedFixture.walkover?.defaultingTeamId).toBe('team-a');

    // Verify all 15 frames won by home
    expect(updatedFixture.frames.every((f) => f.winner === 'home')).toBe(true);

    // Verify each of the 5 players is assigned in Set 1, Set 2 and Set 3 (3 frames each)
    expect(updatedFixture.lineups.set1.home).toEqual(['h1', 'h2', 'h3', 'h4', 'h5']);
    expect(updatedFixture.lineups.set2.home).toEqual(['h1', 'h2', 'h3', 'h4', 'h5']);
    expect(updatedFixture.lineups.set3.home).toEqual(['h1', 'h2', 'h3', 'h4', 'h5']);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows expanding Sets 2 & 3 to substitute players into specific frames', async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <AwardWalkoverModal
        fixture={baseFixture}
        isOpen={true}
        onClose={vi.fn()}
        onConfirmWalkover={handleConfirm}
        teamsById={teamsById}
        players={players}
      />
    );

    // Pick 5 players in Set 1
    const set1Selects = screen.getAllByRole('combobox');
    fireEvent.change(set1Selects[0], { target: { value: 'h1' } });
    fireEvent.change(set1Selects[1], { target: { value: 'h2' } });
    fireEvent.change(set1Selects[2], { target: { value: 'h3' } });
    fireEvent.change(set1Selects[3], { target: { value: 'h4' } });
    fireEvent.change(set1Selects[4], { target: { value: 'h5' } });

    // Expand custom sets
    const expandBtn = screen.getByRole('button', { name: /Customise Sets 2 & 3/i });
    fireEvent.click(expandBtn);

    // Now there are 15 comboboxes (5 for Set 1, 5 for Set 2, 5 for Set 3)
    const allSelects = screen.getAllByRole('combobox');
    expect(allSelects).toHaveLength(15);

    // Substitute Frame 10 (index 9, slot 5 of Set 2) with 'h6' (Harry Sub)
    fireEvent.change(allSelects[9], { target: { value: 'h6' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirm Walkover/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    const updatedFixture: Fixture = handleConfirm.mock.calls[0][0];
    expect(updatedFixture.lineups.set2.home[4]).toBe('h6');
  });

  it('disables Confirm Walkover button when fewer than 5 starting players are selected in Set 1', () => {
    render(
      <AwardWalkoverModal
        fixture={baseFixture}
        isOpen={true}
        onClose={vi.fn()}
        onConfirmWalkover={vi.fn()}
        teamsById={teamsById}
        players={players}
      />
    );

    const selects = screen.getAllByRole('combobox');
    // Only select 1 player
    fireEvent.change(selects[0], { target: { value: 'h1' } });

    expect(screen.getByText(/Please select all 5 starting players in Set 1/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /Confirm Walkover/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('disables a player in other dropdown slots once already selected in that set', () => {
    render(
      <AwardWalkoverModal
        fixture={baseFixture}
        isOpen={true}
        onClose={vi.fn()}
        onConfirmWalkover={vi.fn()}
        teamsById={teamsById}
        players={players}
      />
    );

    const selects = screen.getAllByRole('combobox');
    // Select Harry One (h1) in Slot 1
    fireEvent.change(selects[0], { target: { value: 'h1' } });

    // Check Slot 2 dropdown options: Harry One should be disabled with Slot 1 label
    const slot2Options = selects[1].querySelectorAll('option');
    const h1Option = Array.from(slot2Options).find((opt) => opt.value === 'h1');
    expect(h1Option).toBeDefined();
    expect(h1Option).toBeDisabled();
    expect(h1Option?.textContent).toContain('(Slot 1)');

    // Attempting to select h1 in Slot 2 clears Slot 1 to avoid duplicate assignment
    fireEvent.change(selects[1], { target: { value: 'h1' } });
    expect(selects[0]).toHaveValue('');
    expect(selects[1]).toHaveValue('h1');
  });

  it('disables Confirm Walkover button when fixture is already live or completed', () => {
    const liveFixture: Fixture = {
      ...baseFixture,
      status: 'live',
    };

    render(
      <AwardWalkoverModal
        fixture={liveFixture}
        isOpen={true}
        onClose={vi.fn()}
        onConfirmWalkover={vi.fn()}
        teamsById={teamsById}
        players={players}
      />
    );

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'h1' } });
    fireEvent.change(selects[1], { target: { value: 'h2' } });
    fireEvent.change(selects[2], { target: { value: 'h3' } });
    fireEvent.change(selects[3], { target: { value: 'h4' } });
    fireEvent.change(selects[4], { target: { value: 'h5' } });

    expect(screen.getByText(/Walkovers can only be awarded to scheduled fixtures that have not yet been played/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /Confirm Walkover/i });
    expect(confirmBtn).toBeDisabled();
  });
});
