// Split-flap timer (user, 2026-11-03: "FlipClock" look in our colours). Every digit is its own dark card with a
// split line; when a digit changes, the top half falls down and the new bottom half lands, like an old station board.
import { useEffect, useRef, useState } from 'react';

function Flap({ d }: { d: string }) {
  const [shown, setShown] = useState({ now: d, was: d, n: 0 });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setShown((s) => (s.now === d ? s : { now: d, was: s.now, n: s.n + 1 }));
  }, [d]);
  const { now, was, n } = shown;
  return (
    <span className="flap" aria-hidden="true">
      <span className="fl-top"><b>{now}</b></span>
      <span className="fl-bot"><b>{n ? was : now}</b></span>
      {n > 0 && <>
        <span key={`t${n}`} className="fl-top fl-fall"><b>{was}</b></span>
        <span key={`b${n}`} className="fl-bot fl-land" onAnimationEnd={() => setShown((s) => ({ ...s, was: s.now }))}><b>{now}</b></span>
      </>}
    </span>
  );
}

/** text like "45:00"; size comes from the --fs CSS variable of the parent class */
export function FlipClock({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`flip ${className}`} role="timer" aria-label={text}>
      {[...text].map((ch, i) => ch === ':' ? <span key={i} className="flip-sep" aria-hidden="true"><i /><i /></span> : <Flap key={i} d={ch} />)}
    </div>
  );
}
