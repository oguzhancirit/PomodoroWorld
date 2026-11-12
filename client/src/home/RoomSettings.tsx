// Room settings (v1 js/ui.js renderRoomSet + "Odandan çıkarılanlar"): name, description, category, open or
// invite-only, a fresh invite link, and taking back people you removed. Saved like the room itself (saveRoom).
import { useState } from 'react';
import { create } from 'zustand';
import { ROOM_CATS, type Room } from '@pw/shared';
import { useStore } from '../store';
import { saveRoom } from '../economy';
import { useFriends } from '../friends';

export const useRoomSettings = create<{ open: boolean }>(() => ({ open: false }));
const close = () => useRoomSettings.setState({ open: false });
const newToken = () => Math.random().toString(36).slice(2, 8).padEnd(6, '0');
const tag = (pid: string) => '#' + pid.slice(0, 4).toUpperCase();

export function RoomSettings() {
  const open = useRoomSettings((s) => s.open);
  const room = useStore((s) => s.room), flash = useStore((s) => s.flash);
  const { friends, blocked } = useFriends();
  const [name, setName] = useState(''), [desc, setDesc] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  if (!open || !room) return null;
  const save = (p: Partial<Room>, msg?: string) => { saveRoom({ ...room, ...p }); if (msg) flash(msg, 2500); };
  const nameOf = (pid: string) => friends.find((f) => f.pid === pid)?.n ?? blocked.find((b) => b.pid === pid)?.n ?? 'Oyuncu';
  // text fields save when you leave them (one save, not one per letter)
  const field = (key: 'name' | 'desc') => ({
    value: editing === key ? (key === 'name' ? name : desc) : room[key],
    onFocus: () => { setEditing(key); (key === 'name' ? setName : setDesc)(room[key]); },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => (key === 'name' ? setName : setDesc)(e.target.value),
    onBlur: () => { const v = (key === 'name' ? name : desc).trim(); setEditing(null); if (v !== room[key] && (key === 'desc' || v)) save({ [key]: v }); },
  });
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Oda ayarları" onClick={(e) => e.target === e.currentTarget && close()} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <div className="sheet roomset">
        <header><h2>Oda ayarları</h2><button className="x" aria-label="Kapat" onClick={close}>×</button></header>
        <label className="rs-field"><span>Odanın adı</span><input maxLength={32} placeholder="ör. Gece Kütüphanem" {...field('name')} /></label>
        <label className="rs-field"><span>Kısa açıklama</span><input maxLength={90} placeholder="ör. Sessizce YKS çalışıyoruz" {...field('desc')} /></label>
        <div className="rs-field"><span>Kategori</span>
          <div className="rs-cats">{ROOM_CATS.map((c) => <button key={c} type="button" className={room.cat === c ? 'on' : ''} aria-pressed={room.cat === c} onClick={() => save({ cat: c })}>{c}</button>)}</div>
        </div>
        <div className="rs-field"><span>Kim girebilir?</span>
          <div className="rs-seg" role="radiogroup">
            <button type="button" role="radio" aria-checked={room.open} className={room.open ? 'on' : ''} onClick={() => save({ open: true }, 'Odan açık: Dünya’da görünür.')}><b>Herkes</b><small>Dünya’da görünür</small></button>
            <button type="button" role="radio" aria-checked={!room.open} className={!room.open ? 'on' : ''} onClick={() => save({ open: false }, 'Odana sadece davet linkiyle girilir.')}><b>Sadece davetle</b><small>Linki olanlar</small></button>
          </div>
        </div>
        <div className="rs-field"><span>Davet linki</span>
          <button type="button" className="chip" onClick={() => save({ token: newToken() }, 'Yeni link hazır. Eski linkler artık çalışmaz.')}>↻ Yeni link oluştur</button>
        </div>
        {room.ban.length > 0 && (
          <div className="rs-field"><span>Odandan çıkardıkların</span>
            <div className="rs-bans">{room.ban.map((pid) => (
              <div key={pid}><b>{nameOf(pid)}</b> <small>{tag(pid)}</small>
                <button type="button" onClick={() => save({ ban: room.ban.filter((x) => x !== pid) }, 'Geri alındı: tekrar girebilir.')}>Geri al</button></div>
            ))}</div>
          </div>
        )}
      </div>
    </div>
  );
}
