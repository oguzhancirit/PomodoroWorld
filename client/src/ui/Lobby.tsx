import { useMemo, useState } from 'react';
import { PARTS, SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, PRESETS, CATEGORIES, encodeAvatar, defaultAvatar, cleanName, itemById, owns, avatarAllowed, levelFromXP, partName, type Slot, type Avatar } from '@pw/shared';
import { WalletChip, ShopModal } from './Wallet';
import { buyItem } from '../economy';
import { useStore } from '../store';
import { joinStudyRoom, DEMO_ONLY } from '../net';
import { AvatarPreview } from './AvatarPreview';
import { SafeCanvas } from './SafeCanvas';

const SLOT_LABEL: Record<Slot, string> = { head: 'Saç ve yüz', body: 'Üst', legs: 'Alt', feet: 'Ayakkabı' };
const label = partName;

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
  const wallet = useStore((s) => s.wallet);
  const level = wallet ? levelFromXP(wallet.xp).level : 1;
  const missing = wallet ? (['head', 'body', 'legs', 'feet'] as Slot[]).map((sl) => itemById(`av.${a.g}.${a[sl]}`)!).filter((it) => it && !owns(wallet, it.id)) : [];
  const allowed = !wallet || avatarAllowed(wallet, a);
  const [buyMsg, setBuyMsg] = useState('');

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
        <div className="lobby-top"><h1>Birlikte çalış, odaklan, sohbet et.</h1><WalletChip /></div>
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
          <div className="chips">{PARTS[a.g][slot].map((p) => {
            const it = itemById(`av.${a.g}.${p}`); const mine = !wallet || !it || owns(wallet, it.id);
            return <button key={p} className={`${a[slot] === p ? 'on' : ''} ${mine ? '' : 'lock'}`} title={mine ? '' : it!.lvl > level ? `Seviye ${it!.lvl} gerekir` : `${it!.price} jeton`} onClick={() => set({ [slot]: p } as Partial<Avatar>)}>{label(p)}{mine ? '' : <small> · {it!.lvl > level ? `Sv ${it!.lvl}` : `${it!.price}`}</small>}</button>;
          })}</div>
          {!allowed && (
            <div className="buy-bar">
              <span>Bu görünümde sende olmayan parçalar var: {missing.map((m) => m.name).join(', ')}</span>
              {missing.map((m) => <button key={m.id} disabled={m.lvl > level || (wallet?.coins ?? 0) < m.price} onClick={async () => setBuyMsg((await buyItem(m.id)) ?? '')}>{m.lvl > level ? `${m.name}: Seviye ${m.lvl}` : `${m.name} al · ${m.price} jeton`}</button>)}
              <button className="ghost" onClick={() => set({ head: defaultAvatar(a.g).head, body: defaultAvatar(a.g).body, legs: defaultAvatar(a.g).legs, feet: defaultAvatar(a.g).feet })}>Ücretsiz parçalara dön</button>
              {buyMsg && <em>{buyMsg}</em>}
            </div>
          )}
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
        <button className="go" disabled={!name || busy || !allowed} onClick={() => joinStudyRoom()}>
          {busy ? 'Bağlanıyor…' : !name ? 'Önce adını yaz' : !allowed ? 'Önce parçaları al ya da ücretsizlere dön' : 'Çalışma odasına gir'}
        </button>
        <ShopModal />
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
