'use client';

// Six single-digit boxes for the login code. Typing moves forward, Backspace
// on an empty box moves back, arrow keys move between boxes, and pasting
// (or SMS autofill into the first box) spreads the digits across all six.
// The value lives in the parent as one string, so submit logic stays simple.

import { useEffect, useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({ value, onChange, length = 6, disabled, invalid, autoFocus }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function focusBox(index: number) {
    const box = refs.current[Math.max(0, Math.min(length - 1, index))];
    box?.focus();
    box?.select();
  }

  // Writes digits starting at `index`, then focuses the box after the last one written.
  function fill(index: number, digits: string) {
    const chars = value.padEnd(length, ' ').split('');
    let cursor = index;
    for (const digit of digits) {
      if (cursor >= length) break;
      chars[cursor] = digit;
      cursor += 1;
    }
    onChange(chars.join('').replace(/\s+$/, '').replace(/ /g, ''));
    focusBox(cursor);
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return;
    // A full code typed or autofilled into any box replaces the whole code.
    if (digits.length >= length) {
      onChange(digits.slice(0, length));
      focusBox(length - 1);
      return;
    }
    fill(index, digits);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
        focusBox(index);
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        focusBox(index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusBox(index + 1);
    }
  }

  function handlePaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;
    if (digits.length >= length) {
      onChange(digits.slice(0, length));
      focusBox(length - 1);
    } else {
      fill(index, digits);
    }
  }

  return (
    <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-label={`${length}-digit code`}>
      {Array.from({ length }, (_, index) => {
        const digit = value[index] ?? '';
        return (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={index === 0 ? length : 1}
            aria-label={`Digit ${index + 1}`}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(index, e)}
            onFocus={(e) => e.target.select()}
            className={`h-14 w-full min-w-0 rounded-2xl border bg-white text-center text-xl font-semibold text-[#1d2b22] outline-none transition-colors disabled:opacity-50 ${
              invalid
                ? 'border-red-400 focus:border-red-500'
                : digit
                  ? 'border-[#8cc152] focus:border-[#6fa83a]'
                  : 'border-black/10 focus:border-[#8cc152]'
            } focus:ring-4 focus:ring-[#a8d93a]/25`}
          />
        );
      })}
    </div>
  );
}
