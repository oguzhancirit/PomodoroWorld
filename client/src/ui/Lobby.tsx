import { useMemo, useState } from 'react';
import { PARTS, SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, PRESETS, CATEGORIES, encodeAvatar, defaultAvatar, cleanName, type Slot, type Avatar } from '@pw/shared';
import { useStore } from '../store';
import { joinStudyRoom, DEMO_ONLY } from '../net';
import { AvatarPreview } from './AvatarPreview';
import { SafeCanvas } from './SafeCanvas';

const SLOT_LABEL: Record<Slot, string> = { head: 'Saç ve yüz', body: 'Üst', legs: 'Alt', feet: 'Ayakkabı' };
const PART_LABEL: Record<string, string> = {
  Casual: 'Günlük', Casual_Hoodie: 'Kapüşonlu', Casual_2: 'Rahat', Formal: 'Şık', Suit: 'Takım', Punk: 'Punk', SciFi: 'Bilimkurgu',
  Adventurer: 'Gezgin', Soldier: 'Kısa saç', Medieval: 'Ortaçağ', Witch: 'Cadı şapkası', Worker: 'İşçi', Beach: 'Plaj', Farmer: 'Çiftçi', King: 'Taç',
};
const label = (part: string) => PART_LABEL[part.replace(/_(Head|Body|Legs|Feet)$/, '')] ?? part;

export function Lobby() {
  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);
  const net = useStore((s) => s.net), error = useStore((s) => s.error);
  const [slot, setSlot] = useState<Slot>('head');
  const [wave, setWave] = useState(false);
  const a = profile.avatar;
  const code = useMemo(() => encodeAvatar(a), [a]);
  const set = (p: Partial<Avatar>) => setProfile({ avatar: { ...a, ...p } });
  const name = cleanName(profile.name);
  const busy = net === 'connecting';

  return (
    <main className="lobby">
      <section className="lobby-preview">
        <div className="brand"><span className="dot" />Pomodoro World</div>
        <div className="preview-3d" onClick={() => { setWave(true); setTimeout(() => setWave(false), 1800); }}>
          <SafeCanvas label="Karakter önizlemesi açılamadı."><AvatarPreview code={code} motion={wave ? 'wave' : 'idle'} /></SafeCanvas>
        </div>
        <p className="hint">Karaktere dokun, el sallasın.</p>
      </section>

      <section className="lobby-panel">
        <h1>Birlikte çalış, odaklan, sohbet et.</h1>
        <p className="sub">Odadaki herkes aynı sayacı görür. Odakta sohbet kapanır, molada açılır.</p>

        <label className="field">Adın
          <input value={profile.name} maxLength={20} placeholder="ör. Oğuzhan" onChange={(e) => setProfile({ name: e.target.value })} />
        </label>

        <div className="field">Karakterin
          <div className="seg">
            {(['f', 'm'] as const).map((g) => (
              <button key={g} className={a.g === g ? 'on' : ''} onClick={() => setProfile({ avatar: { ...defaultAvatar(g), skin: a.skin, hair: a.hair } })}>{g === 'f' ? 'Kadın' : 'Erkek'}</button>
            ))}
          </div>
          <div className="tabs">{(Object.keys(SLOT_LABEL) as Slot[]).map((s) => <button key={s} className={slot === s ? 'on' : ''} onClick={() => setSlot(s)}>{SLOT_LABEL[s]}</button>)}</div>
          <div className="chips">{PARTS[a.g][slot].map((p) => <button key={p} className={a[slot] === p ? 'on' : ''} onClick={() => set({ [slot]: p } as Partial<Avatar>)}>{label(p)}</button>)}</div>
          <Swatches title="Ten" list={SKIN_TONES} value={a.skin} onPick={(skin) => set({ skin })} />
          <Swatches title="Saç" list={HAIR_COLORS} value={a.hair} onPick={(hair) => set({ hair })} />
          <Swatches title="Üst rengi" list={CLOTH_COLORS} value={a.top} onPick={(top) => set({ top })} />
          <Swatches title="Alt rengi" list={CLOTH_COLORS} value={a.bottom} onPick={(bottom) => set({ bottom })} />
        </div>

        <div className="field">Ne çalışacaksın?
          <div className="chips">{CATEGORIES.map(([id, n]) => <button key={id} className={profile.category === id ? 'on' : ''} onClick={() => setProfile({ category: id })}>{n}</button>)}</div>
        </div>
        <div className="field">Süre · odak / mola <small>Aynı süreyi seçenler aynı odada buluşur.</small>
          <div className="durs">{PRESETS.map((p) => (
            <button key={p.id} className={profile.preset === p.id ? 'on' : ''} onClick={() => setProfile({ preset: p.id })}>
              <b>{p.focusMin}<small> / {p.shortMin}</small></b><span>{p.hint}</span>
            </button>
          ))}</div>
        </div>

        {DEMO_ONLY && (
          <div className="demo-note">
            <p><b>Deneme modu.</b> Oyun sunucusu henüz internette değil, bu yüzden odada seninle 5 bot arkadaş çalışacak. Sayaç, sohbet kuralları ve hareketler gerçek sürümle aynı.</p>
            <label className="ck"><input id="fast" type="checkbox" checked={profile.fast} onChange={(e) => setProfile({ fast: e.target.checked })} /> Hızlı deneme: 1 dakika = 1 saniye (25 dk odak 25 saniye sürer)</label>
          </div>
        )}
        {error && <p className="err">{error}</p>}
        <button className="go" disabled={!name || busy} onClick={() => joinStudyRoom()}>
          {busy ? 'Bağlanıyor…' : name ? 'Çalışma odasına gir' : 'Önce adını yaz'}
        </button>
      </section>
    </main>
  );
}

function Swatches({ title, list, value, onPick }: { title: string; list: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="sw-row"><span>{title}</span>
      {list.map((c, i) => (
        <button key={c + i} className={`sw ${value === i ? 'on' : ''} ${i === 0 ? 'orig' : ''}`} style={{ background: i === 0 ? undefined : c }}
          title={i === 0 ? 'Modelin kendi rengi' : c} aria-label={i === 0 ? `${title}: orijinal` : `${title}: ${c}`} onClick={() => onPick(i)} />
      ))}
    </div>
  );
}
