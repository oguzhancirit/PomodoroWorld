// "Yılan" on the console in the Oyun Salonu (user 2026-11-04: replaces Pomo Canavarları). The snake goes square by
// square, eats the tomato and grows; a wall or its own tail ends the game. Rules: @pw/shared snake.
// Keys: arrows / WASD, space = pause. Phones: swipe on the screen or use the pad.
import { useCallback, useEffect, useRef, useState } from 'react';
import { newSnake, turnSnake, stepSnake, snakeDelay, type SnakeGame as Game, type SnakeDir } from '@pw/shared';
import { sfx } from '../sound';

const W = 18, H = 14;
const BEST = 'pw2.snake.best';
const readBest = () => { try { return Number(localStorage.getItem(BEST)) || 0; } catch { return 0; } };
const KEYS: Record<string, SnakeDir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };

type Phase = 'ready' | 'play' | 'pause' | 'over';

export function SnakeGame({ onClose }: { onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const game = useRef<Game>(newSnake(W, H, Math.random));
  const [phase, setPhase] = useState<Phase>('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(readBest);
  const closeRef = useRef<HTMLButtonElement>(null);

  const draw = useCallback(() => {
    const c = canvas.current; if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), cw = c.clientWidth, ch = Math.round(cw * H / W);
    if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); c.style.height = `${ch}px`; }
    const x = c.getContext('2d')!; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = cw / W, g = game.current;
    // board: a soft checker so the squares can be counted
    x.fillStyle = '#16231b'; x.fillRect(0, 0, cw, ch);
    x.fillStyle = '#1a2a20'; for (let j = 0; j < H; j++) for (let i = (j % 2); i < W; i += 2) x.fillRect(i * s, j * s, s, s);
    // food: a little tomato (a pomodoro!)
    const fx = (g.food.x + 0.5) * s, fy = (g.food.y + 0.55) * s;
    x.fillStyle = '#ef4e3a'; x.beginPath(); x.arc(fx, fy, s * 0.38, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffffff55'; x.beginPath(); x.arc(fx - s * 0.12, fy - s * 0.1, s * 0.09, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#3fbf6a'; x.beginPath(); x.ellipse(fx, fy - s * 0.36, s * 0.16, s * 0.07, 0, 0, Math.PI * 2); x.fill();
    // snake: rounded squares, darker towards the tail, a head with eyes looking where it goes
    const n = g.body.length;
    g.body.forEach((p, i) => {
      const k = 1 - (i / Math.max(1, n - 1)) * 0.45, pad = i === 0 ? s * 0.06 : s * 0.11;
      x.fillStyle = i === 0 ? '#8ee07c' : `rgb(${Math.round(70 * k)}, ${Math.round(190 * k)}, ${Math.round(100 * k)})`;
      const r = s * 0.28; x.beginPath(); x.roundRect(p.x * s + pad, p.y * s + pad, s - pad * 2, s - pad * 2, r); x.fill();
    });
    const h = g.body[0], d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[g.dir];
    const hx = (h.x + 0.5) * s, hy = (h.y + 0.5) * s, ox = -d[1] * s * 0.18, oy = d[0] * s * 0.18;
    for (const sg of [1, -1]) {
      const ex = hx + ox * sg + d[0] * s * 0.12, ey = hy + oy * sg + d[1] * s * 0.12;
      x.fillStyle = '#fff'; x.beginPath(); x.arc(ex, ey, s * 0.11, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#1d1a2b'; x.beginPath(); x.arc(ex + d[0] * s * 0.04, ey + d[1] * s * 0.04, s * 0.055, 0, Math.PI * 2); x.fill();
    }
  }, []);

  const restart = () => { game.current = newSnake(W, H, Math.random); setScore(0); setPhase('play'); draw(); };
  const turn = useCallback((d: SnakeDir) => {
    game.current = turnSnake(game.current, d);
    setPhase((p) => (p === 'ready' ? 'play' : p));
  }, []);

  // the game clock: one step per tick, a little faster with every bite
  useEffect(() => {
    if (phase !== 'play') return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const before = game.current.score;
      game.current = stepSnake(game.current, Math.random);
      const g = game.current; draw();
      if (g.score !== before) { setScore(g.score); sfx('pop'); }
      if (g.over) {
        setPhase('over'); sfx('done');
        if (g.score > readBest()) { try { localStorage.setItem(BEST, String(g.score)); } catch { /* ignore */ } setBest(g.score); }
        return;
      }
      t = setTimeout(tick, snakeDelay(g.score));
    };
    t = setTimeout(tick, snakeDelay(game.current.score));
    return () => clearTimeout(t);
  }, [phase, draw]);

  useEffect(() => {
    draw(); closeRef.current?.focus();
    const onResize = () => { const c = canvas.current; if (c) c.width = 0; draw(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // keys are read on the whole window: the Start button disappears when the game begins and takes the focus with it
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return onClose();
    const d = KEYS[e.key];
    if (d) { e.preventDefault(); if (phase === 'over') return; turn(d); return; }
    if (e.key === ' ') { e.preventDefault(); if (phase === 'over' || phase === 'ready') restart(); else setPhase((p) => (p === 'play' ? 'pause' : 'play')); }
  };
  const keyRef = useRef(onKey); keyRef.current = onKey;
  useEffect(() => { const h = (e: KeyboardEvent) => keyRef.current(e); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

  // swipe on the screen (phones)
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = touch.current, t = e.changedTouches[0]; touch.current = null; if (!s) return;
    const dx = t.clientX - s.x, dy = t.clientY - s.y; if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    if (phase === 'over') return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  return (
    <div className="modal mg-modal" role="dialog" aria-modal="true" aria-label="Yılan oyunu">
      <div className="mg-console">
        <div className="mg-top"><span className="mg-led" /><b>YILAN</b><span className="sn-score" aria-live="polite">🍅 {score}</span><button ref={closeRef} className="mg-x" onClick={onClose} aria-label="Oyunu kapat">×</button></div>
        <div className="mg-screen sn-screen" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <canvas ref={canvas} className="sn-canvas" aria-label={`Yılan oyunu, skor ${score}`} />
          {phase !== 'play' && (
            <div className="sn-over">
              {phase === 'ready' && <><b>Domatesleri topla!</b><span>Ok tuşları ya da kaydırarak yön ver.<br />Duvara ve kuyruğuna çarpma.</span><button className="mg-go" onClick={restart}>Başla</button></>}
              {phase === 'pause' && <><b>Durdu</b><button className="mg-go" onClick={() => setPhase('play')}>Devam</button></>}
              {phase === 'over' && <><b>Oyun bitti</b><span>Skor <strong>{score}</strong> · En iyi <strong>{Math.max(best, score)}</strong>{score > 0 && score >= best ? ' · Yeni rekor! 🎉' : ''}</span><div className="row"><button className="mg-go" autoFocus onClick={restart}>Tekrar oyna</button><button className="mg-ghost" onClick={onClose}>Odaya dön</button></div></>}
            </div>
          )}
        </div>
        <div className="mg-pad sn-pad" aria-label="Yön tuşları">
          <button aria-label="Yukarı" onClick={() => turn('up')}>▲</button>
          <button aria-label="Sola" onClick={() => turn('left')}>◀</button>
          <button aria-label="Durdur" className="sn-mid" onClick={() => (phase === 'play' ? setPhase('pause') : phase === 'pause' ? setPhase('play') : restart())}>{phase === 'play' ? 'II' : '▶'}</button>
          <button aria-label="Sağa" onClick={() => turn('right')}>▶</button>
          <button aria-label="Aşağı" onClick={() => turn('down')}>▼</button>
        </div>
        <p className="mg-foot">En iyi skorun: {best} · Boşluk tuşu: durdur</p>
      </div>
    </div>
  );
}
