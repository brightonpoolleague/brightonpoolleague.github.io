import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PinInput } from '../PinInput';

describe('PinInput Component', () => {
  it('renders masked password input by default and toggles visibility on button click', () => {
    render(<PinInput placeholder="Enter 6-digit PIN" defaultValue="123456" />);

    const input = screen.getByPlaceholderText('Enter 6-digit PIN') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('password');
    expect(input.value).toBe('123456');

    const toggleBtn = screen.getByRole('button', { name: /show pin/i });
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

    // Click to reveal PIN
    fireEvent.click(toggleBtn);
    expect(input.type).toBe('text');
    expect(screen.getByRole('button', { name: /hide pin/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Click again to mask PIN
    fireEvent.click(screen.getByRole('button', { name: /hide pin/i }));
    expect(input.type).toBe('password');
  });

  it('calls onChange and updates controlled value when user types', () => {
    const onChangeSpy = vi.fn();

    const Wrapper = () => {
      const [val, setVal] = useState('');
      return (
        <PinInput
          placeholder="Team PIN"
          value={val}
          maxLength={6}
          onChange={(e) => {
            setVal(e.target.value);
            onChangeSpy(e.target.value);
          }}
        />
      );
    };

    render(<Wrapper />);
    const input = screen.getByPlaceholderText('Team PIN') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '654321' } });
    expect(onChangeSpy).toHaveBeenCalledWith('654321');
    expect(input.value).toBe('654321');
  });

  it('renders optional leftIcon when supplied', () => {
    render(
      <PinInput
        placeholder="Admin PIN"
        leftIcon={<span data-testid="custom-lock-icon">Lock</span>}
      />
    );
    expect(screen.getByTestId('custom-lock-icon')).toBeInTheDocument();
  });
});
