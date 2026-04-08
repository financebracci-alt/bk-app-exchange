import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

// Converts YYYY-MM-DD to DD/MM/YYYY for display
const toDisplay = (iso) => {
  if (!iso) return '';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// Converts DD/MM/YYYY to YYYY-MM-DD for storage
const toISO = (display) => {
  if (!display) return '';
  const parts = display.replace(/[^0-9]/g, '/').split('/');
  if (parts.length !== 3 || parts[2].length !== 4) return '';
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
};

export const DateInput = ({ value, onChange, ...props }) => {
  const [display, setDisplay] = useState(toDisplay(value));

  useEffect(() => {
    setDisplay(toDisplay(value));
  }, [value]);

  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^0-9/]/g, '');
    // Auto-insert slashes
    const digits = raw.replace(/\//g, '');
    if (digits.length <= 2) raw = digits;
    else if (digits.length <= 4) raw = digits.slice(0, 2) + '/' + digits.slice(2);
    else raw = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);

    setDisplay(raw);

    // Only call onChange when we have a full valid date
    if (raw.length === 10) {
      const iso = toISO(raw);
      if (iso && iso.length === 10) {
        onChange(iso);
      }
    } else if (raw === '') {
      onChange('');
    }
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      placeholder="dd/mm/yyyy"
      maxLength={10}
      value={display}
      onChange={handleChange}
    />
  );
};

export default DateInput;
