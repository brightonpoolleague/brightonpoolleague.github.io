import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocsAndRulesView } from '../DocsAndRulesView';

vi.mock('../../context/LeagueContext', () => ({
  useLeague: () => ({
    seasonName: 'Winter 2026/27',
  }),
}));

describe('DocsAndRulesView', () => {
  it('renders the Contact tab with email, Facebook link and committee members', () => {
    render(<DocsAndRulesView />);

    const contactTab = screen.getByRole('button', { name: /Contact/i });
    fireEvent.click(contactTab);

    const emailLink = screen.getByRole('link', { name: /brightonpoolleague@gmail\.com/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:brightonpoolleague@gmail.com');

    const fbLink = screen.getByRole('link', { name: /Brighton Pool League Facebook Group/i });
    expect(fbLink).toHaveAttribute('href', 'https://www.facebook.com/groups/191430377584870/');

    expect(screen.getByText('Phil Rogers')).toBeInTheDocument();
    expect(screen.getByText('Chairman')).toBeInTheDocument();
    expect(screen.getByText('Cliona Saunders-Cooney')).toBeInTheDocument();
    expect(screen.getByText('Vice Chair')).toBeInTheDocument();
    expect(screen.getByText('Amanda Minty')).toBeInTheDocument();
    expect(screen.getByText('Ladies Representative')).toBeInTheDocument();
    expect(screen.getByText('Jacob King')).toBeInTheDocument();
    expect(screen.getByText('Student Representative')).toBeInTheDocument();
    expect(screen.getByText('Pete Hazell')).toBeInTheDocument();
    expect(screen.getByText('IT Support')).toBeInTheDocument();
  });

  it('displays Open & Ladies’ and Open Singles in the Champion of Champions section', () => {
    render(<DocsAndRulesView />);

    const cofcTab = screen.getByRole('button', { name: /Champion of Champions/i });
    fireEvent.click(cofcTab);

    expect(screen.getByText('Open & Ladies’')).toBeInTheDocument();
    expect(screen.getByText('Open Singles')).toBeInTheDocument();
    expect(screen.queryByText(/Men’s & Ladies’/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Men’s Singles/i)).not.toBeInTheDocument();
  });
});
