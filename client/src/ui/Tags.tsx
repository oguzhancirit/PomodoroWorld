import { memo } from 'react';
import { useStore, type PlayerView } from '../store';
import { tagEls } from '../scene/tags';

const EMOJI: Record<string, string> = { wave: '👋', clap: '👏', cheer: '🎉', heart: '❤️', coffee: '☕' };

/** DOM layer with every player's name tag, chat bubble and emote; positioned by TagProjector. */
export function TagLayer() {
  const ids = useStore((s) => Object.keys(s.players).join(','));
  return <div className="tags">{ids ? ids.split(',').map((id) => <Tag key={id} id={id} />) : null}</div>;
}

const Tag = memo(function Tag({ id }: { id: string }) {
  const p = useStore((s) => s.players[id]) as PlayerView | undefined;
  const me = useStore((s) => s.me === id);
  const emote = useStore((s) => s.emotes[id]);
  if (!p) return null;
  return (
    <div className={`tag3d ${me ? 'me' : ''} ${p.connected ? '' : 'away'}`} style={{ display: 'none' }}
      ref={(el) => { if (el) tagEls.set(id, el); else tagEls.delete(id); }}>
      {emote && <span className="emo3d" key={emote.until}>{EMOJI[emote.e] ?? '✨'}</span>}
      {p.bubble && <span className="bubble3d" key={p.bubble}>{p.bubble}</span>}
      <b>{p.name}{p.connected ? '' : ' · bağlantı bekleniyor'}</b>
    </div>
  );
});
