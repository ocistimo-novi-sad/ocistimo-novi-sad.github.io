import { useEffect, useState } from 'react';
import { plural } from '../../lib/format';

const chars = (count: number) => plural(count, 'znak', 'znaka', 'znakova');

/**
 * GOV.UK character count: the counter shows how much is used, and screen readers
 * hear how much is left once typing pauses. Text over the limit is kept and
 * shown in red, and sending then asks to shorten it, instead of the field
 * silently cutting pasted text off.
 */
export function CharCount({ value, max }: { value: string; max: number }) {
  const left = max - value.length;
  const status = left >= 0 ? `Još ${left} ${chars(left)}.` : `${-left} ${chars(-left)} previše.`;
  const [spoken, setSpoken] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setSpoken(status), 1000);
    return () => window.clearTimeout(timer);
  }, [status]);

  return (
    <>
      <span className={`field__counter${left < 0 ? ' is-over' : ''}`} aria-hidden="true">
        {value.length}/{max}
      </span>
      <span className="visually-hidden" aria-live="polite">
        {spoken}
      </span>
    </>
  );
}
