import { useState } from 'react';
import { formatNumber, parseNumberInput } from '../format';

/**
 * A text field for a non-negative number. Every valid keystroke commits, so a
 * value survives the app being closed mid-edit. Invalid text stays local and
 * snaps back on blur.
 */
export function NumberField({
  value,
  onCommit,
  integer = false,
  label,
  placeholder = '0',
}: {
  value: number;
  onCommit: (n: number) => void;
  integer?: boolean;
  label: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === 0 ? '' : formatNumber(value));
  return (
    <input
      className="number-field"
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      pattern={integer ? '[0-9]*' : undefined}
      autoComplete="off"
      enterKeyHint="done"
      aria-label={label}
      placeholder={placeholder}
      value={shown}
      onFocus={(e) => {
        setDraft(shown);
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const text = e.currentTarget.value;
        setDraft(text);
        const n = parseNumberInput(text);
        if (n !== null && (!integer || Number.isInteger(n))) onCommit(n);
        else if (text.trim() === '') onCommit(0);
      }}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}
