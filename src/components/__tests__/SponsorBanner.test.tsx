import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SponsorBadge, SponsorBanner } from '../SponsorBanner';
import { PRIMARY_SPONSOR, Sponsor } from '../../data/sponsors';

describe('Sponsor Components', () => {
  const customSponsor: Sponsor = {
    id: 'test-sponsor',
    name: 'Custom Cue Sports',
    logo: 'sponsors/custom.png',
    role: 'Headline Sponsor',
    tagline: 'Leading Sussex Pool Supplies',
    url: 'https://example.com',
  };

  describe('SponsorBadge', () => {
    it('renders default primary sponsor KS Print when no sponsor prop is provided', () => {
      render(<SponsorBadge />);

      expect(screen.getByText('Sponsored by')).toBeInTheDocument();
      expect(screen.getByText(PRIMARY_SPONSOR.name)).toBeInTheDocument();
      const img = screen.getByAltText(PRIMARY_SPONSOR.name);
      expect(img).toBeInTheDocument();
      expect(img.getAttribute('src')).toContain(PRIMARY_SPONSOR.logo);
    });

    it('renders custom sponsor details and links to url when url is provided', () => {
      render(<SponsorBadge sponsor={customSponsor} />);

      expect(screen.getByText(customSponsor.name)).toBeInTheDocument();
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('SponsorBanner', () => {
    it('renders official sponsor banner with role, name, tagline and logo', () => {
      render(<SponsorBanner sponsor={customSponsor} />);

      expect(screen.getByText('Headline Sponsor')).toBeInTheDocument();
      expect(screen.getByText('Custom Cue Sports')).toBeInTheDocument();
      expect(screen.getByText('Leading Sussex Pool Supplies')).toBeInTheDocument();
      const img = screen.getByAltText('Custom Cue Sports');
      expect(img).toBeInTheDocument();
      expect(img.getAttribute('src')).toContain('sponsors/custom.png');
      expect(screen.getByRole('link', { name: /Visit Sponsor/i })).toHaveAttribute(
        'href',
        'https://example.com'
      );
    });

    it('renders default primary sponsor banner without broken links when url is omitted', () => {
      render(<SponsorBanner />);

      expect(screen.getByText(PRIMARY_SPONSOR.name)).toBeInTheDocument();
      expect(screen.getByText(PRIMARY_SPONSOR.role!)).toBeInTheDocument();
      expect(screen.getByText(PRIMARY_SPONSOR.tagline!)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Visit Sponsor/i })).not.toBeInTheDocument();
    });
  });
});
