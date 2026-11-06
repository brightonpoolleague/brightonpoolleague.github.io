import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ExportTableModal } from '../ExportTableModal';
import { PRIMARY_SPONSOR } from '../../data/sponsors';
import * as htmlToImage from 'html-to-image';

vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mockPngData'),
  toBlob: vi.fn().mockResolvedValue(new Blob(['mockBlob'], { type: 'image/png' })),
}));

describe('ExportTableModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Player Stats',
    modalTitle: 'Export Player Stats',
    divisionName: 'Division 1',
    seasonName: 'Winter 2026',
    badgeText: 'Approved Only',
    columns: [
      { header: 'Player & Team', align: 'left' as const },
      { header: 'P', align: 'center' as const },
      { header: 'W', align: 'center' as const },
      { header: 'L', align: 'center' as const },
      { header: 'Win %', align: 'center' as const },
    ],
    rows: [
      {
        rank: 1,
        primaryText: 'John Doe',
        secondaryText: 'The Eagle (Division 1)',
        values: [10, 8, 2, '80.0%'],
      },
      {
        rank: 2,
        primaryText: 'Jane Smith',
        secondaryText: 'The Crown (Division 1)',
        values: [10, 7, 3, '70.0%'],
      },
    ],
    fileBaseName: 'test-player-stats',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with title, division, rows, and buttons when open', () => {
    render(<ExportTableModal {...defaultProps} />);

    expect(screen.getByText('Export Player Stats')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('The Eagle (Division 1)')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download PNG/i })).toBeInTheDocument();
  });

  it('renders sponsor logo and name in graphic card header and footer by default', () => {
    render(<ExportTableModal {...defaultProps} />);

    expect(screen.getByText('Sponsored by')).toBeInTheDocument();
    expect(screen.getByText('Proudly sponsored by')).toBeInTheDocument();
    const sponsorLogos = screen.getAllByAltText(PRIMARY_SPONSOR.name);
    expect(sponsorLogos.length).toBeGreaterThanOrEqual(2);
    sponsorLogos.forEach((logo) => {
      expect(logo.getAttribute('src')).toContain(PRIMARY_SPONSOR.logo);
    });
    expect(screen.getAllByText('www.ks-print.co.uk').length).toBeGreaterThanOrEqual(2);
  });

  it('omits sponsor branding when sponsor is null', () => {
    render(<ExportTableModal {...defaultProps} sponsor={null} />);

    expect(screen.queryByText('Sponsored by')).not.toBeInTheDocument();
    expect(screen.queryByText('Proudly sponsored by')).not.toBeInTheDocument();
    expect(screen.queryByAltText(PRIMARY_SPONSOR.name)).not.toBeInTheDocument();
  });

  it('does not render anything when isOpen is false', () => {
    render(<ExportTableModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Export Player Stats')).not.toBeInTheDocument();
  });

  it('renders scrollable preview area with overflow-y-auto and touch-pan-y', () => {
    const { container } = render(<ExportTableModal {...defaultProps} />);

    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveClass('touch-pan-y');
    expect(scrollContainer).toHaveClass('overflow-x-hidden');
  });

  it('triggers download with pixelRatio: 3 for high-resolution output', async () => {
    render(<ExportTableModal {...defaultProps} />);

    const downloadBtn = screen.getByRole('button', { name: /Download PNG/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(htmlToImage.toPng).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pixelRatio: 3,
          backgroundColor: '#020617',
        })
      );
    });
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<ExportTableModal {...defaultProps} onClose={onClose} />);

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
