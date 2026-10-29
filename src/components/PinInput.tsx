import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PinInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Optional icon shown on the left inside the input */
  leftIcon?: React.ReactNode;
};

/**
 * PIN / password input with a show/hide toggle so users can check what they've typed.
 * Pass `className` for the input's styling; right padding for the toggle is added automatically.
 */
export const PinInput: React.FC<PinInputProps> = ({
  leftIcon,
  className = '',
  ...inputProps
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative flex-1">
      {leftIcon}
      <input
        {...inputProps}
        type={visible ? 'text' : 'password'}
        autoComplete="off"
        className={`${className} pr-9`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        // Keep focus in the input on desktop so typing isn't interrupted
        onMouseDown={(e) => e.preventDefault()}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-white transition"
        aria-label={visible ? 'Hide PIN' : 'Show PIN'}
        aria-pressed={visible}
        title={visible ? 'Hide PIN' : 'Show PIN'}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};
