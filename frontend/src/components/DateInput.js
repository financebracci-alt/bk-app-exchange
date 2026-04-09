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
    if (digits.length <= 2) {
      // Clamp day to 31
      let d = parseInt(digits, 10);
      if (digits.length === 2 && d > 31) raw = '31';
      else if (digits.length === 1 && d > 3) raw = '0' + d;
      else raw = digits;
    } else if (digits.length <= 4) {
      let d = digits.slice(0, 2);
      let m = digits.slice(2);
      if (parseInt(d, 10) > 31) d = '31';
      if (m.length === 2 && parseInt(m, 10) > 12) m = '12';
      else if (m.length === 1 && parseInt(m, 10) > 1) m = '0' + m;
      raw = d + '/' + m;
    } else {
      let d = digits.slice(0, 2);
      let m = digits.slice(2, 4);
      let y = digits.slice(4, 8);
      if (parseInt(d, 10) > 31) d = '31';
      if (parseInt(m, 10) > 12) m = '12';
      raw = d + '/' + m + '/' + y;
    }

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
