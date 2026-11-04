import { useMemo, useState } from 'react';
import { CATALOG, ACCESSORIES, PARTS, SKIN_TONES, HAIR_COLORS, CLOTH_COLORS, encodeAvatar, defaultAvatar, cleanName, itemById, owns, avatarAllowed, partName, type Slot, type Avatar } from '@pw/shared';
import { WalletChip, ShopModal, PartPic } from './Wallet';
import { ToolButtons, Panels } from './Panels';
import { useStore } from '../store';
import { DEMO_ONLY } from '../net';
import { BackupBox, IntroButton, NotifyToggle, AccountBox } from './Backup';
import { Notice } from './RoomUI';
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
  const missing = wallet ? (['head', 'body', 'legs', 'feet'] as Slot[]).map((sl) => itemById(`av.${a.g}.${a[sl]}`)!).filter((it) => it && !owns(wallet, it.id)) : [];
  const allowed = !wallet || avatarAllowed(wallet, a);
  // came back from the room ("Karakterim") rather than a first visit
  const [back] = useState(() => useStore.getState().profile.made);

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
        <div className="lobby-top"><h1>{back ? 'Karakterin ve ayarların' : 'Birlikte çalış, odaklan, sohbet et.'}</h1><div className="row"><ToolButtons /><WalletChip /></div></div>
        <p className="sub">{back ? <>Merhaba <b>{name}</b>! Gardırobundan istediğin parçayı seç, hemen üstüne giyilsin.</> : 'Adını yaz, karakterini seç. Gerisini odanda ayarlarsın.'}</p>

        {back ? <Wardrobe /> : <>
        <label className="field">Adın
          <input value={profile.name} maxLength={20} placeholder="ör. Oğuzhan" onChange={(e) => setProfile({ name: e.target.value })} />
        </label>

        <div className="field">Karakterin
          <div className="seg">
            {(['f', 'm'] as const).map((g) => (
              <button key={g} className={a.g === g ? 'on' : ''} onClick={() => setProfile({ avatar: { ...defaultAvatar(g), skin: a.skin, hair: a.hair } })}>{g === 'f' ? 'Kadın' : 'Erkek'}</button>
            ))}
          </div>
          <button type="button" className="ghost dice" onClick={() => setProfile({ avatar: randomLook(a.g, wallet) })} title="Rastgele bir görünüm dene">🎲 Şansıma</button>
          <div className="tabs">{(Object.keys(SLOT_LABEL) as Slot[]).map((s) => <button key={s} className={slot === s ? 'on' : ''} onClick={() => setSlot(s)}>{SLOT_LABEL[s]}</button>)}</div>
          {/* first visit: only the parts you already have; paid ones are for later, in the shop (user, 2026-11-04) */}
          <div className="chips">{PARTS[a.g][slot].filter((p) => mineNow(a.g, p, wallet)).map((p) => (
            <button key={p} className={a[slot] === p ? 'on' : ''} onClick={() => set({ [slot]: p } as Partial<Avatar>)}>{label(p)}</button>
          ))}</div>
          {!allowed && (
            <div className="buy-bar">
              <span>Bu görünümde sende olmayan parçalar var: {missing.map((m) => m.name).join(', ')}. Onları sonra mağazadan alabilirsin.</span>
              <button className="ghost" onClick={() => set({ head: defaultAvatar(a.g).head, body: defaultAvatar(a.g).body, legs: defaultAvatar(a.g).legs, feet: defaultAvatar(a.g).feet })}>Ücretsiz parçalara dön</button>
            </div>
          )}
          <Swatches title="Ten" list={SKIN_TONES} value={a.skin} onPick={(skin) => set({ skin })} />
          <Swatches title="Saç" list={HAIR_COLORS} value={a.hair} onPick={(hair) => set({ hair })} />
          <Swatches title="Üst rengi" list={CLOTH_COLORS} value={a.top} onPick={(top) => set({ top })} />
          <Swatches title="Alt rengi" list={CLOTH_COLORS} value={a.bottom} onPick={(bottom) => set({ bottom })} />
        </div>

        {/* what you study and how long: chosen on the focus screen in your room, not here (user, 2026-11-04) */}
        </>}

        {DEMO_ONLY && (
          <div className="demo-note">
            <p><b>Deneme modu.</b> Oyun sunucusu henüz internette değil: odana bir bot arkadaş uğrar, kütüphanede ve kafede botlar var. Sayaç, sohbet kuralları ve hareketler gerçek sürümle aynı.</p>
            <label className="ck"><input id="fast" type="checkbox" checked={profile.fast} onChange={(e) => setProfile({ fast: e.target.checked })} /> Hızlı deneme: 1 dakika = 1 saniye (25 dk odak 25 saniye sürer)</label>
          </div>
        )}
        {back && <AccountBox />}
        {back && <IntroButton />}
        {back && <NotifyToggle />}
        {back && <BackupBox />}
        {error && <p className="err">{error}</p>}
        {/* step 4: the game lives in your room; the bigger places are in "Dünya" */}
        <button className="go" disabled={!name || busy || !allowed} onClick={() => { setProfile({ made: true }); useStore.getState().set({ screen: 'home' }); }}>
          {busy ? 'Bağlanıyor…' : !name ? 'Önce adını yaz' : !allowed ? 'Önce parçaları al ya da ücretsizlere dön' : back ? 'Kaydet ve odama dön' : 'Odama gir'}
        </button>
        <ShopModal />
        <Notice />
        <Panels />
      </section>
    </main>
  );
}

/** Returning player (user, 2026-11-03): name, body type and colours stay as created; only the outfit and the hair
 *  style change, and only with parts the player owns (free ones + bought ones), shown as pictures like in the shop. */
function Wardrobe() {
  const a = useStore((s) => s.profile.avatar), wallet = useStore((s) => s.wallet);
  const setProfile = useStore((s) => s.setProfile);
  const code = encodeAvatar(a);
  return (
    <div className="field wardrobe">Gardırobun
      {(Object.keys(SLOT_LABEL) as Slot[]).map((slot) => {
        const mine = PARTS[a.g][slot].map((p) => itemById(`av.${a.g}.${p}`)!).filter((it) => it && (!wallet || owns(wallet, it.id)));
        return (
          <section key={slot}><h4>{SLOT_LABEL[slot]}</h4>
            <div className="wr-grid">{mine.map((it) => (
              <button key={it.id} type="button" className={`wr-card ${a[slot] === it.part ? 'on' : ''}`} aria-pressed={a[slot] === it.part}
                onClick={() => setProfile({ avatar: { ...a, [slot]: it.part } })}>
                <PartPic it={it} base={code} /><span>{it.name}</span>
              </button>
            ))}</div>
          </section>
        );
      })}
      <section><h4>Takı ve şapka</h4>
        <div className="wr-grid">
          <button type="button" className={`wr-card ${!a.acc ? 'on' : ''}`} aria-pressed={!a.acc} onClick={() => setProfile({ avatar: { ...a, acc: undefined } })}><span className="wr-none">—</span><span>Yok</span></button>
          {CATALOG.filter((i) => i.sub === 'Aksesuar' && (!wallet || owns(wallet, i.id))).map((it) => { const idx = ACCESSORIES.indexOf(it.part as typeof ACCESSORIES[number]); return (
            <button key={it.id} type="button" className={`wr-card ${a.acc === idx ? 'on' : ''}`} aria-pressed={a.acc === idx} onClick={() => setProfile({ avatar: { ...a, acc: idx } })}>
              <PartPic it={it} base={code} /><span>{it.name}</span>
            </button>); })}
        </div>
      </section>
      <button type="button" className="ghost wr-shop" onClick={() => useStore.getState().set({ shop: true, shopTab: 'avatar' })}>Mağazada yeni parçalara bak</button>
    </div>
  );
}

/** a surprise look from the parts you may wear (free or owned) and any colours: fun, and fast for a new player */
/** a part you can wear right now: already yours, or free for everyone (before the wallet has come) */
function mineNow(g: Avatar['g'], p: string, wallet: Parameters<typeof owns>[0] | null): boolean {
  const it = itemById(`av.${g}.${p}`);
  return !it || (wallet ? owns(wallet, it.id) : it.price === 0 && it.lvl <= 1);
}

function randomLook(g: Avatar['g'], wallet: Parameters<typeof owns>[0] | null): Avatar {
  const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
  const part = (slot: Slot) => pick(PARTS[g][slot].filter((p) => mineNow(g, p, wallet)));
  return { g, head: part('head'), body: part('body'), legs: part('legs'), feet: part('feet'),
    skin: 1 + Math.floor(Math.random() * (SKIN_TONES.length - 1)), hair: Math.floor(Math.random() * HAIR_COLORS.length),
    top: Math.floor(Math.random() * CLOTH_COLORS.length), bottom: Math.floor(Math.random() * CLOTH_COLORS.length) };
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
